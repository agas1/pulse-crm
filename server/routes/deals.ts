import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { evaluateAutomations } from '../automation-engine.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface DealRow {
  id: string;
  title: string;
  contact_id: string;
  contact_name: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  expected_close: string | null;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  contato_feito: 'Contato Feito',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociacao',
  fechado_ganho: 'Fechado (Ganho)',
  fechado_perdido: 'Fechado (Perdido)',
};

const validStages = Object.keys(stageLabels);

function sanitizeDeal(row: DealRow) {
  return {
    id: row.id,
    title: row.title,
    contactId: row.contact_id,
    contactName: row.contact_name,
    company: row.company,
    value: row.value,
    stage: row.stage,
    probability: row.probability,
    expectedClose: row.expected_close,
    assignedTo: row.assigned_to,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET / — List deals
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const { stage, assignedTo, contactId } = req.query;
    const conditions: string[] = [];
    const params: unknown[] = [];

    // Ownership: sellers only see their own deals
    if (req.auth!.role === 'seller') {
      conditions.push('assigned_to = ?');
      params.push(req.auth!.userId);
    }

    if (stage) {
      conditions.push('stage = ?');
      params.push(stage);
    }

    if (assignedTo) {
      conditions.push('assigned_to = ?');
      params.push(assignedTo);
    }

    if (contactId) {
      conditions.push('contact_id = ?');
      params.push(contactId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const deals = db.prepare(`SELECT * FROM deals ${where} ORDER BY created_at DESC`).all(...params) as DealRow[];

    res.json({ deals: deals.map(sanitizeDeal) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar deals: ${message}` });
  }
});

// ──────────────────────────────────────
// GET /stalled — Deals without upcoming activities
// ──────────────────────────────────────

router.get('/stalled', (req: AuthRequest, res) => {
  try {
    const conditions: string[] = [];
    const params: unknown[] = [];

    conditions.push("(next_activity_date IS NULL OR next_activity_date < date('now'))");

    // Ownership: sellers only see their own deals
    if (req.auth!.role === 'seller') {
      conditions.push('assigned_to = ?');
      params.push(req.auth!.userId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const deals = db.prepare(`SELECT * FROM deals ${where} ORDER BY created_at DESC`).all(...params) as DealRow[];

    res.json({ deals: deals.map(sanitizeDeal) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar deals parados: ${message}` });
  }
});

// ──────────────────────────────────────
// GET /:id — Single deal
// ──────────────────────────────────────

router.get('/:id', (req: AuthRequest, res) => {
  try {
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id) as DealRow | undefined;

    if (!deal) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    res.json({ deal: sanitizeDeal(deal) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar deal: ${message}` });
  }
});

// ──────────────────────────────────────
// POST / — Create deal
// ──────────────────────────────────────

router.post('/', (req: AuthRequest, res) => {
  try {
    const { title, contactId, contactName, company, value, stage, probability, expectedClose, assignedTo } = req.body;

    if (!title || !contactId || !contactName) {
      res.status(400).json({ error: 'Título, contato e nome do contato são obrigatórios' });
      return;
    }

    const dealStage = stage && validStages.includes(stage) ? stage : 'lead';

    // Validate assignedTo exists in users table; fallback to authenticated user
    let dealAssignedTo = req.auth!.userId;
    if (assignedTo) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedTo);
      if (userExists) dealAssignedTo = assignedTo;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(`
      INSERT INTO deals (id, title, contact_id, contact_name, company, value, stage, probability, expected_close, assigned_to, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title,
      contactId,
      contactName,
      company || '',
      value ?? 0,
      dealStage,
      probability ?? 20,
      expectedClose || null,
      dealAssignedTo,
      now,
      now,
    );

    // Create activity for the new deal
    db.prepare(`
      INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'status_change',
      `Deal criado: ${title}`,
      contactName,
      contactId,
      id,
      now,
      null,
      now,
    );

    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as DealRow;

    // Disparar automações para deal criado
    try {
      evaluateAutomations({ type: 'deal_created', data: deal as unknown as Record<string, unknown>, userId: req.auth!.userId });
    } catch (autoErr) {
      console.error('[Automação] Erro ao processar evento deal_created:', autoErr);
    }

    res.status(201).json({ deal: sanitizeDeal(deal) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar deal: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id — Update deal (partial)
// ──────────────────────────────────────

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as DealRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    const { title, contactId, contactName, company, value, stage, probability, expectedClose, assignedTo } = req.body;

    if (stage && !validStages.includes(stage)) {
      res.status(400).json({ error: 'Estágio inválido' });
      return;
    }

    const updates = {
      title: title ?? existing.title,
      contact_id: contactId ?? existing.contact_id,
      contact_name: contactName ?? existing.contact_name,
      company: company ?? existing.company,
      value: value ?? existing.value,
      stage: stage ?? existing.stage,
      probability: probability ?? existing.probability,
      expected_close: expectedClose !== undefined ? expectedClose : existing.expected_close,
      assigned_to: assignedTo ?? existing.assigned_to,
    };

    db.prepare(`
      UPDATE deals
      SET title = ?, contact_id = ?, contact_name = ?, company = ?, value = ?, stage = ?, probability = ?, expected_close = ?, assigned_to = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.title,
      updates.contact_id,
      updates.contact_name,
      updates.company,
      updates.value,
      updates.stage,
      updates.probability,
      updates.expected_close,
      updates.assigned_to,
      id,
    );

    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as DealRow;

    res.json({ deal: sanitizeDeal(deal) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao atualizar deal: ${message}` });
  }
});

// ──────────────────────────────────────
// DELETE /:id — Delete deal
// ──────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM deals WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    db.prepare('DELETE FROM deals WHERE id = ?').run(id);

    res.json({ message: 'Negócio removido com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover deal: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id/stage — Quick stage change (drag-and-drop)
// ──────────────────────────────────────

router.put('/:id/stage', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { stage, probability } = req.body;

    if (!stage || !validStages.includes(stage)) {
      res.status(400).json({ error: 'Estágio inválido' });
      return;
    }

    const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as DealRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Negócio não encontrado' });
      return;
    }

    const oldStage = existing.stage;

    // Determine probability based on stage
    let newProbability: number;
    if (stage === 'fechado_ganho') {
      newProbability = 100;
    } else if (stage === 'fechado_perdido') {
      newProbability = 0;
    } else {
      newProbability = probability ?? existing.probability;
    }

    db.prepare(`
      UPDATE deals SET stage = ?, probability = ?, updated_at = datetime('now') WHERE id = ?
    `).run(stage, newProbability, id);

    // Create activity for stage change
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const stageLabel = stageLabels[stage] || stage;
    const oldStageLabel = stageLabels[oldStage] || oldStage;

    db.prepare(`
      INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      'status_change',
      `Estagio alterado para ${stageLabel}`,
      existing.contact_name,
      existing.contact_id,
      id,
      now,
      `${oldStageLabel} → ${stageLabel}`,
      now,
    );

    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(id) as DealRow;

    // Disparar automações para mudança de estágio
    try {
      evaluateAutomations({
        type: 'deal_stage_changed',
        data: { ...(deal as unknown as Record<string, unknown>), fromStage: oldStage, toStage: stage },
        userId: req.auth!.userId,
      });
    } catch (autoErr) {
      console.error('[Automação] Erro ao processar evento deal_stage_changed:', autoErr);
    }

    res.json({ deal: sanitizeDeal(deal) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao alterar estagio do deal: ${message}` });
  }
});

export default router;
