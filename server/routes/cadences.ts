import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface CadenceRow {
  id: string;
  name: string;
  description: string;
  status: string;
  created_by: string;
  total_enrolled: number;
  total_completed: number;
  total_replied: number;
  step_count?: number;
  created_at: string;
  updated_at: string;
}

interface CadenceStepRow {
  id: string;
  cadence_id: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  channel: string;
  template_subject: string;
  template_body: string;
  condition_skip: string;
  created_at: string;
}

interface CadenceEnrollmentRow {
  id: string;
  cadence_id: string;
  lead_id: string | null;
  contact_id: string | null;
  enrolled_by: string;
  current_step: number;
  status: string;
  started_at: string;
  paused_at: string | null;
  completed_at: string | null;
  last_step_at: string | null;
  next_step_due: string | null;
  metadata: string;
  lead_name?: string | null;
  lead_email?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  created_at: string;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function sanitizeCadence(row: CadenceRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    createdBy: row.created_by,
    totalEnrolled: row.total_enrolled,
    totalCompleted: row.total_completed,
    totalReplied: row.total_replied,
    stepCount: row.step_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeStep(row: CadenceStepRow) {
  return {
    id: row.id,
    cadenceId: row.cadence_id,
    stepOrder: row.step_order,
    delayDays: row.delay_days,
    delayHours: row.delay_hours,
    channel: row.channel,
    templateSubject: row.template_subject,
    templateBody: row.template_body,
    conditionSkip: JSON.parse(row.condition_skip || '{}'),
    createdAt: row.created_at,
  };
}

function sanitizeEnrollment(row: CadenceEnrollmentRow) {
  return {
    id: row.id,
    cadenceId: row.cadence_id,
    leadId: row.lead_id,
    contactId: row.contact_id,
    enrolledBy: row.enrolled_by,
    currentStep: row.current_step,
    status: row.status,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    completedAt: row.completed_at,
    lastStepAt: row.last_step_at,
    nextStepDue: row.next_step_due,
    metadata: JSON.parse(row.metadata || '{}'),
    leadName: row.lead_name || null,
    leadEmail: row.lead_email || null,
    contactName: row.contact_name || null,
    contactEmail: row.contact_email || null,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET /stats/overview — Aggregate stats
// ──────────────────────────────────────

router.get('/stats/overview', (req: AuthRequest, res) => {
  try {
    const activeCadences = db.prepare("SELECT COUNT(*) as count FROM cadences WHERE status = 'active'").get() as { count: number };

    const enrollmentStats = db.prepare(`
      SELECT
        COUNT(*) as total_enrolled,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as total_replied,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as total_completed
      FROM cadence_enrollments
    `).get() as { total_enrolled: number; total_active: number; total_replied: number; total_completed: number };

    const totalEnrolled = enrollmentStats.total_enrolled || 0;
    const totalReplied = enrollmentStats.total_replied || 0;
    const replyRate = totalEnrolled > 0 ? Math.round((totalReplied / totalEnrolled) * 10000) / 100 : 0;

    res.json({
      stats: {
        activeCadences: activeCadences.count,
        totalEnrolled,
        totalActive: enrollmentStats.total_active || 0,
        totalReplied,
        totalCompleted: enrollmentStats.total_completed || 0,
        replyRate,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar estatisticas de cadencias: ${message}` });
  }
});

// ──────────────────────────────────────
// GET / — List cadences with step_count
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const cadences = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM cadence_steps WHERE cadence_id = c.id) as step_count
      FROM cadences c
      ORDER BY c.created_at DESC
    `).all() as CadenceRow[];

    res.json({ cadences: cadences.map(sanitizeCadence) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar cadencias: ${message}` });
  }
});

// ──────────────────────────────────────
// POST / — Create cadence with steps
// ──────────────────────────────────────

router.post('/', (req: AuthRequest, res) => {
  try {
    const { name, description, status, steps } = req.body;
    const auth = req.auth!;

    if (!name) {
      res.status(400).json({ error: 'Nome e obrigatorio' });
      return;
    }

    const validStatuses = ['draft', 'active', 'paused', 'archived'];
    const cadenceStatus = status && validStatuses.includes(status) ? status : 'draft';

    const cadenceId = crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const insertCadenceAndSteps = db.transaction(() => {
      db.prepare(`
        INSERT INTO cadences (id, name, description, status, created_by, total_enrolled, total_completed, total_replied, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)
      `).run(
        cadenceId,
        name.trim(),
        (description || '').trim(),
        cadenceStatus,
        auth.userId,
        now,
        now,
      );

      if (Array.isArray(steps) && steps.length > 0) {
        const insertStep = db.prepare(`
          INSERT INTO cadence_steps (id, cadence_id, step_order, delay_days, delay_hours, channel, template_subject, template_body, condition_skip, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const step of steps) {
          insertStep.run(
            crypto.randomUUID(),
            cadenceId,
            step.stepOrder || 1,
            step.delayDays || 0,
            step.delayHours || 0,
            step.channel || 'email',
            (step.templateSubject || '').trim(),
            (step.templateBody || '').trim(),
            JSON.stringify(step.conditionSkip || {}),
            now,
          );
        }
      }
    });

    insertCadenceAndSteps();

    const cadence = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM cadence_steps WHERE cadence_id = c.id) as step_count
      FROM cadences c WHERE c.id = ?
    `).get(cadenceId) as CadenceRow;

    res.status(201).json({ cadence: sanitizeCadence(cadence) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar cadencia: ${message}` });
  }
});

// ──────────────────────────────────────
// GET /:id — Get cadence with steps + enrollment counts
// ──────────────────────────────────────

router.get('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const cadence = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM cadence_steps WHERE cadence_id = c.id) as step_count
      FROM cadences c WHERE c.id = ?
    `).get(id) as CadenceRow | undefined;

    if (!cadence) {
      res.status(404).json({ error: 'Cadencia nao encontrada' });
      return;
    }

    const steps = db.prepare('SELECT * FROM cadence_steps WHERE cadence_id = ? ORDER BY step_order ASC').all(id) as CadenceStepRow[];

    const enrollmentCounts = db.prepare('SELECT status, COUNT(*) as count FROM cadence_enrollments WHERE cadence_id = ? GROUP BY status').all(id) as { status: string; count: number }[];

    const enrollmentCountsMap: Record<string, number> = {};
    for (const row of enrollmentCounts) {
      enrollmentCountsMap[row.status] = row.count;
    }

    res.json({
      cadence: sanitizeCadence(cadence),
      steps: steps.map(sanitizeStep),
      enrollmentCounts: enrollmentCountsMap,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar cadencia: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id — Update cadence + replace steps
// ──────────────────────────────────────

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM cadences WHERE id = ?').get(id) as CadenceRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Cadencia nao encontrada' });
      return;
    }

    const { name, description, status, steps } = req.body;

    const validStatuses = ['draft', 'active', 'paused', 'archived'];

    const updates = {
      name: name?.trim() || existing.name,
      description: description !== undefined ? (description || '').trim() : existing.description,
      status: status && validStatuses.includes(status) ? status : existing.status,
    };

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const updateCadenceAndSteps = db.transaction(() => {
      db.prepare(`
        UPDATE cadences SET name = ?, description = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        updates.name,
        updates.description,
        updates.status,
        now,
        id,
      );

      if (Array.isArray(steps)) {
        // Only allow step changes if cadence is 'draft' or 'paused'
        if (existing.status !== 'draft' && existing.status !== 'paused') {
          throw new Error('Etapas so podem ser alteradas em cadencias com status draft ou paused');
        }

        db.prepare('DELETE FROM cadence_steps WHERE cadence_id = ?').run(id);

        const insertStep = db.prepare(`
          INSERT INTO cadence_steps (id, cadence_id, step_order, delay_days, delay_hours, channel, template_subject, template_body, condition_skip, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const step of steps) {
          insertStep.run(
            crypto.randomUUID(),
            id,
            step.stepOrder || 1,
            step.delayDays || 0,
            step.delayHours || 0,
            step.channel || 'email',
            (step.templateSubject || '').trim(),
            (step.templateBody || '').trim(),
            JSON.stringify(step.conditionSkip || {}),
            now,
          );
        }
      }
    });

    updateCadenceAndSteps();

    const cadence = db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM cadence_steps WHERE cadence_id = c.id) as step_count
      FROM cadences c WHERE c.id = ?
    `).get(id) as CadenceRow;

    res.json({ cadence: sanitizeCadence(cadence) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    if (message.includes('Etapas so podem ser alteradas')) {
      res.status(400).json({ error: message });
      return;
    }
    res.status(500).json({ error: `Erro ao atualizar cadencia: ${message}` });
  }
});

// ──────────────────────────────────────
// DELETE /:id — Delete cadence
// ──────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM cadences WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Cadencia nao encontrada' });
      return;
    }

    db.prepare('DELETE FROM cadences WHERE id = ?').run(id);

    res.json({ message: 'Cadencia removida com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover cadencia: ${message}` });
  }
});

// ──────────────────────────────────────
// POST /:id/enroll — Enroll lead(s)/contact(s)
// ──────────────────────────────────────

router.post('/:id/enroll', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { leadIds, contactIds } = req.body;
    const auth = req.auth!;

    const cadence = db.prepare('SELECT * FROM cadences WHERE id = ?').get(id) as CadenceRow | undefined;
    if (!cadence) {
      res.status(404).json({ error: 'Cadencia nao encontrada' });
      return;
    }

    if (cadence.status !== 'active') {
      res.status(400).json({ error: 'Cadencia precisa estar ativa para matricular' });
      return;
    }

    const firstStep = db.prepare('SELECT * FROM cadence_steps WHERE cadence_id = ? ORDER BY step_order ASC LIMIT 1').get(id) as CadenceStepRow | undefined;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const enrolled: string[] = [];
    const skipped: string[] = [];

    const enrollTransaction = db.transaction(() => {
      const insertEnrollment = db.prepare(`
        INSERT INTO cadence_enrollments (id, cadence_id, lead_id, contact_id, enrolled_by, current_step, status, started_at, paused_at, completed_at, last_step_at, next_step_due, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // Calculate next_step_due based on first step delay
      let nextStepDue = now;
      if (firstStep) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (firstStep.delay_days || 0));
        dueDate.setHours(dueDate.getHours() + (firstStep.delay_hours || 0));
        nextStepDue = dueDate.toISOString().replace('T', ' ').slice(0, 19);
      }

      // Enroll leads
      if (Array.isArray(leadIds)) {
        for (const leadId of leadIds) {
          const alreadyEnrolled = db.prepare("SELECT id FROM cadence_enrollments WHERE cadence_id = ? AND lead_id = ? AND status = 'active'").get(id, leadId);
          if (alreadyEnrolled) {
            skipped.push(leadId);
            continue;
          }

          const enrollmentId = crypto.randomUUID();
          insertEnrollment.run(
            enrollmentId, id, leadId, null, auth.userId, 1, 'active',
            now, null, null, null, nextStepDue, '{}', now,
          );
          enrolled.push(enrollmentId);
        }
      }

      // Enroll contacts
      if (Array.isArray(contactIds)) {
        for (const contactId of contactIds) {
          const alreadyEnrolled = db.prepare("SELECT id FROM cadence_enrollments WHERE cadence_id = ? AND contact_id = ? AND status = 'active'").get(id, contactId);
          if (alreadyEnrolled) {
            skipped.push(contactId);
            continue;
          }

          const enrollmentId = crypto.randomUUID();
          insertEnrollment.run(
            enrollmentId, id, null, contactId, auth.userId, 1, 'active',
            now, null, null, null, nextStepDue, '{}', now,
          );
          enrolled.push(enrollmentId);
        }
      }

      // Update cadence total_enrolled counter
      if (enrolled.length > 0) {
        db.prepare('UPDATE cadences SET total_enrolled = total_enrolled + ?, updated_at = ? WHERE id = ?').run(enrolled.length, now, id);
      }
    });

    enrollTransaction();

    res.status(201).json({
      message: `${enrolled.length} matriculado(s) com sucesso`,
      enrolledCount: enrolled.length,
      skippedCount: skipped.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao matricular na cadencia: ${message}` });
  }
});

// ──────────────────────────────────────
// POST /:id/enroll-bulk — Bulk enroll leads
// ──────────────────────────────────────

router.post('/:id/enroll-bulk', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { leadIds } = req.body;
    const auth = req.auth!;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      res.status(400).json({ error: 'leadIds e obrigatorio e deve ser um array nao vazio' });
      return;
    }

    const cadence = db.prepare('SELECT * FROM cadences WHERE id = ?').get(id) as CadenceRow | undefined;
    if (!cadence) {
      res.status(404).json({ error: 'Cadencia nao encontrada' });
      return;
    }

    if (cadence.status !== 'active') {
      res.status(400).json({ error: 'Cadencia precisa estar ativa para matricular' });
      return;
    }

    const firstStep = db.prepare('SELECT * FROM cadence_steps WHERE cadence_id = ? ORDER BY step_order ASC LIMIT 1').get(id) as CadenceStepRow | undefined;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const enrolled: string[] = [];
    const skipped: string[] = [];

    const enrollBulkTransaction = db.transaction(() => {
      const insertEnrollment = db.prepare(`
        INSERT INTO cadence_enrollments (id, cadence_id, lead_id, contact_id, enrolled_by, current_step, status, started_at, paused_at, completed_at, last_step_at, next_step_due, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      let nextStepDue = now;
      if (firstStep) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (firstStep.delay_days || 0));
        dueDate.setHours(dueDate.getHours() + (firstStep.delay_hours || 0));
        nextStepDue = dueDate.toISOString().replace('T', ' ').slice(0, 19);
      }

      for (const leadId of leadIds) {
        const alreadyEnrolled = db.prepare("SELECT id FROM cadence_enrollments WHERE cadence_id = ? AND lead_id = ? AND status = 'active'").get(id, leadId);
        if (alreadyEnrolled) {
          skipped.push(leadId);
          continue;
        }

        const enrollmentId = crypto.randomUUID();
        insertEnrollment.run(
          enrollmentId, id, leadId, null, auth.userId, 1, 'active',
          now, null, null, null, nextStepDue, '{}', now,
        );
        enrolled.push(enrollmentId);
      }

      if (enrolled.length > 0) {
        db.prepare('UPDATE cadences SET total_enrolled = total_enrolled + ?, updated_at = ? WHERE id = ?').run(enrolled.length, now, id);
      }
    });

    enrollBulkTransaction();

    res.status(201).json({
      message: `Matricula em massa: ${enrolled.length} matriculado(s), ${skipped.length} ignorado(s)`,
      enrolledCount: enrolled.length,
      skippedCount: skipped.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao matricular em massa na cadencia: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /enrollments/:enrollmentId/pause — Pause enrollment
// ──────────────────────────────────────

router.put('/enrollments/:enrollmentId/pause', (req: AuthRequest, res) => {
  try {
    const { enrollmentId } = req.params;

    const existing = db.prepare('SELECT * FROM cadence_enrollments WHERE id = ?').get(enrollmentId) as CadenceEnrollmentRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Matricula nao encontrada' });
      return;
    }

    if (existing.status !== 'active') {
      res.status(400).json({ error: 'Somente matriculas ativas podem ser pausadas' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare("UPDATE cadence_enrollments SET status = 'paused', paused_at = ?, next_step_due = NULL WHERE id = ?").run(now, enrollmentId);

    const updated = db.prepare('SELECT * FROM cadence_enrollments WHERE id = ?').get(enrollmentId) as CadenceEnrollmentRow;

    res.json({ enrollment: sanitizeEnrollment(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao pausar matricula: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /enrollments/:enrollmentId/resume — Resume enrollment
// ──────────────────────────────────────

router.put('/enrollments/:enrollmentId/resume', (req: AuthRequest, res) => {
  try {
    const { enrollmentId } = req.params;

    const existing = db.prepare('SELECT * FROM cadence_enrollments WHERE id = ?').get(enrollmentId) as CadenceEnrollmentRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Matricula nao encontrada' });
      return;
    }

    if (existing.status !== 'paused') {
      res.status(400).json({ error: 'Somente matriculas pausadas podem ser retomadas' });
      return;
    }

    // Recalculate next_step_due: get current step, add delay from NOW
    const currentStep = db.prepare('SELECT * FROM cadence_steps WHERE cadence_id = ? AND step_order = ?').get(existing.cadence_id, existing.current_step) as CadenceStepRow | undefined;

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    let nextStepDue = now;
    if (currentStep) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (currentStep.delay_days || 0));
      dueDate.setHours(dueDate.getHours() + (currentStep.delay_hours || 0));
      nextStepDue = dueDate.toISOString().replace('T', ' ').slice(0, 19);
    }

    db.prepare("UPDATE cadence_enrollments SET status = 'active', next_step_due = ? WHERE id = ?").run(nextStepDue, enrollmentId);

    const updated = db.prepare('SELECT * FROM cadence_enrollments WHERE id = ?').get(enrollmentId) as CadenceEnrollmentRow;

    res.json({ enrollment: sanitizeEnrollment(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao retomar matricula: ${message}` });
  }
});

// ──────────────────────────────────────
// GET /:id/enrollments — List enrollments with lead/contact data
// ──────────────────────────────────────

router.get('/:id/enrollments', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const cadence = db.prepare('SELECT id FROM cadences WHERE id = ?').get(id);
    if (!cadence) {
      res.status(404).json({ error: 'Cadencia nao encontrada' });
      return;
    }

    const enrollments = db.prepare(`
      SELECT e.*, l.name as lead_name, l.email as lead_email, c.name as contact_name, c.email as contact_email
      FROM cadence_enrollments e
      LEFT JOIN leads l ON e.lead_id = l.id
      LEFT JOIN contacts c ON e.contact_id = c.id
      WHERE e.cadence_id = ?
      ORDER BY e.created_at DESC
    `).all(id) as CadenceEnrollmentRow[];

    res.json({ enrollments: enrollments.map(sanitizeEnrollment) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar matriculas: ${message}` });
  }
});

export default router;
