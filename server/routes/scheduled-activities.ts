import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface SchedRow {
  id: string;
  type: string;
  title: string;
  description: string;
  deal_id: string;
  contact_id: string;
  assigned_to: string;
  due_date: string;
  due_time: string;
  completed: number;
  completed_at: string;
  created_at: string;
}

interface DealRow {
  id: string;
  contact_name: string;
  contact_id: string;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function sanitizeSched(row: SchedRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    dealId: row.deal_id,
    contactId: row.contact_id,
    assignedTo: row.assigned_to,
    dueDate: row.due_date,
    dueTime: row.due_time,
    completed: !!row.completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

function updateDealNextActivity(dealId: string) {
  const next = db.prepare(`
    SELECT MIN(due_date) as next_date FROM scheduled_activities
    WHERE deal_id = ? AND completed = 0
  `).get(dealId) as { next_date: string | null } | undefined;
  db.prepare('UPDATE deals SET next_activity_date = ? WHERE id = ?')
    .run(next?.next_date || null, dealId);
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET / — List scheduled activities
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const { dealId, contactId, completed, assignedTo } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    // Ownership: sellers only see their own
    if (req.auth!.role === 'seller') {
      conditions.push('assigned_to = ?');
      params.push(req.auth!.userId);
    }

    if (dealId && typeof dealId === 'string') {
      conditions.push('deal_id = ?');
      params.push(dealId);
    }

    if (contactId && typeof contactId === 'string') {
      conditions.push('contact_id = ?');
      params.push(contactId);
    }

    if (completed && typeof completed === 'string') {
      conditions.push('completed = ?');
      params.push(completed === '1' ? 1 : 0);
    }

    if (assignedTo && typeof assignedTo === 'string') {
      conditions.push('assigned_to = ?');
      params.push(assignedTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const activities = db.prepare(`SELECT * FROM scheduled_activities ${where} ORDER BY due_date ASC`).all(...params) as SchedRow[];

    res.json({ scheduledActivities: activities.map(sanitizeSched) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar atividades agendadas: ${message}` });
  }
});

// ──────────────────────────────────────
// POST / — Create scheduled activity
// ──────────────────────────────────────

router.post('/', (req: AuthRequest, res) => {
  try {
    const { type, title, description, dealId, contactId, assignedTo, dueDate, dueTime } = req.body;

    if (!type || !title || !dueDate || !assignedTo) {
      res.status(400).json({ error: 'Tipo, titulo, data de vencimento e responsavel sao obrigatorios' });
      return;
    }

    const validTypes = ['call', 'meeting', 'email', 'follow_up', 'task', 'demo'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: `Tipo invalido. Tipos permitidos: ${validTypes.join(', ')}` });
      return;
    }

    // Validate assignedTo exists in users table; fallback to authenticated user
    let actAssignedTo = req.auth!.userId;
    if (assignedTo) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedTo);
      if (userExists) actAssignedTo = assignedTo;
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO scheduled_activities (id, type, title, description, deal_id, contact_id, assigned_to, due_date, due_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      type,
      title.trim(),
      (description || '').trim(),
      dealId || null,
      contactId || null,
      actAssignedTo,
      dueDate,
      dueTime || null,
    );

    // Update deal next_activity_date
    if (dealId) {
      updateDealNextActivity(dealId);
    }

    const activity = db.prepare('SELECT * FROM scheduled_activities WHERE id = ?').get(id) as SchedRow;

    res.status(201).json({ scheduledActivity: sanitizeSched(activity) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar atividade agendada: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id — Update scheduled activity (partial)
// ──────────────────────────────────────

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM scheduled_activities WHERE id = ?').get(id) as SchedRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Atividade agendada nao encontrada' });
      return;
    }

    const { type, title, description, dealId, contactId, assignedTo, dueDate, dueTime } = req.body;

    const validTypes = ['call', 'meeting', 'email', 'follow_up', 'task', 'demo'];

    const updates = {
      type: type && validTypes.includes(type) ? type : existing.type,
      title: title?.trim() || existing.title,
      description: description !== undefined ? (description || '').trim() : existing.description,
      deal_id: dealId !== undefined ? (dealId || null) : existing.deal_id,
      contact_id: contactId !== undefined ? (contactId || null) : existing.contact_id,
      assigned_to: assignedTo || existing.assigned_to,
      due_date: dueDate || existing.due_date,
      due_time: dueTime !== undefined ? (dueTime || null) : existing.due_time,
    };

    db.prepare(`
      UPDATE scheduled_activities
      SET type = ?, title = ?, description = ?, deal_id = ?, contact_id = ?, assigned_to = ?, due_date = ?, due_time = ?
      WHERE id = ?
    `).run(
      updates.type,
      updates.title,
      updates.description,
      updates.deal_id,
      updates.contact_id,
      updates.assigned_to,
      updates.due_date,
      updates.due_time,
      id,
    );

    // Recalculate next_activity_date for old and new deal
    if (existing.deal_id) {
      updateDealNextActivity(existing.deal_id);
    }
    if (updates.deal_id && updates.deal_id !== existing.deal_id) {
      updateDealNextActivity(updates.deal_id);
    }

    const activity = db.prepare('SELECT * FROM scheduled_activities WHERE id = ?').get(id) as SchedRow;

    res.json({ scheduledActivity: sanitizeSched(activity) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao atualizar atividade agendada: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id/complete — Mark activity as completed
// ──────────────────────────────────────

router.put('/:id/complete', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM scheduled_activities WHERE id = ?').get(id) as SchedRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Atividade agendada nao encontrada' });
      return;
    }

    db.prepare(`
      UPDATE scheduled_activities SET completed = 1, completed_at = datetime('now') WHERE id = ?
    `).run(id);

    // Create activity log entry
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Lookup deal for contact info
    let contactName = '';
    let contactId: string | null = existing.contact_id || null;

    if (existing.deal_id) {
      const deal = db.prepare('SELECT contact_name, contact_id FROM deals WHERE id = ?').get(existing.deal_id) as DealRow | undefined;
      if (deal) {
        contactName = deal.contact_name;
        contactId = contactId || deal.contact_id;
      }
    }

    db.prepare(`
      INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      existing.type,
      `Atividade concluida: ${existing.title}`,
      contactName,
      contactId,
      existing.deal_id || null,
      now,
      null,
      now,
    );

    // Recalculate next_activity_date
    if (existing.deal_id) {
      updateDealNextActivity(existing.deal_id);
    }

    const activity = db.prepare('SELECT * FROM scheduled_activities WHERE id = ?').get(id) as SchedRow;

    res.json({ scheduledActivity: sanitizeSched(activity) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao concluir atividade agendada: ${message}` });
  }
});

// ──────────────────────────────────────
// DELETE /:id — Delete scheduled activity
// ──────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM scheduled_activities WHERE id = ?').get(id) as SchedRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Atividade agendada nao encontrada' });
      return;
    }

    const dealId = existing.deal_id;

    db.prepare('DELETE FROM scheduled_activities WHERE id = ?').run(id);

    // Recalculate next_activity_date
    if (dealId) {
      updateDealNextActivity(dealId);
    }

    res.json({ message: 'Atividade agendada removida com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover atividade agendada: ${message}` });
  }
});

export default router;
