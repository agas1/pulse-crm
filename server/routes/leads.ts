import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';
import { initializeLeadScore, calculateLeadScore } from '../services/lead-scoring.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  score: string;
  notes: string;
  status: string;
  assigned_to: string;
  organization_id: string;
  job_title: string;
  company_size: string;
  created_at: string;
  updated_at: string;
}

interface ContactRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  avatar: string;
  status: string;
  value: number;
  last_contact: string;
  tags: string;
  assigned_to: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

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

function sanitizeLead(row: LeadRow) {
  // Get numeric score if available
  const scoreData = db.prepare('SELECT numeric_score, derived_label, score_breakdown FROM lead_scores WHERE lead_id = ?').get(row.id) as any;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    source: row.source,
    score: row.score,
    notes: row.notes,
    status: row.status,
    assignedTo: row.assigned_to,
    organizationId: row.organization_id,
    jobTitle: row.job_title || '',
    companySize: row.company_size || '',
    numericScore: scoreData?.numeric_score ?? 0,
    scoreDerivedLabel: scoreData?.derived_label || row.score,
    scoreBreakdown: scoreData ? JSON.parse(scoreData.score_breakdown || '{}') : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeContact(row: ContactRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    role: row.role,
    avatar: row.avatar,
    status: row.status,
    value: row.value,
    lastContact: row.last_contact,
    tags: JSON.parse(row.tags || '[]'),
    assignedTo: row.assigned_to,
    organizationId: row.organization_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
// GET / — List leads with filters
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const { status, score, search, assignedTo } = req.query;
    const auth = req.auth!;

    const conditions: string[] = [];
    const params: unknown[] = [];

    // Ownership: sellers see only their own leads
    if (auth.role === 'seller') {
      conditions.push('assigned_to = ?');
      params.push(auth.userId);
    } else if (assignedTo) {
      conditions.push('assigned_to = ?');
      params.push(assignedTo);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (score) {
      conditions.push('score = ?');
      params.push(score);
    }

    if (search) {
      conditions.push('(name LIKE ? OR email LIKE ? OR company LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const leads = db.prepare(`SELECT * FROM leads ${where} ORDER BY created_at DESC`).all(...params) as LeadRow[];

    res.json({ leads: leads.map(sanitizeLead) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar leads: ${message}` });
  }
});

// ──────────────────────────────────────
// POST / — Create lead
// ──────────────────────────────────────

router.post('/', (req: AuthRequest, res) => {
  try {
    const { name, email, phone, company, source, score, notes, status, assignedTo, organizationId, jobTitle, companySize } = req.body;
    const auth = req.auth!;

    if (!name) {
      res.status(400).json({ error: 'Nome e obrigatorio' });
      return;
    }

    const validScores = ['hot', 'warm', 'cold'];
    const validStatuses = ['new', 'contacted', 'qualified', 'disqualified'];

    const leadScore = score && validScores.includes(score) ? score : 'warm';
    const leadStatus = status && validStatuses.includes(status) ? status : 'new';

    // Validate assignedTo exists in users table; fallback to authenticated user
    let owner = auth.userId;
    if (assignedTo && assignedTo !== auth.userId) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedTo);
      if (userExists) owner = assignedTo;
    }

    // Validate organizationId if provided
    let orgId: string | null = null;
    if (organizationId) {
      const orgExists = db.prepare('SELECT id FROM organizations WHERE id = ?').get(organizationId);
      if (orgExists) orgId = organizationId;
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO leads (id, name, email, phone, company, source, score, notes, status, assigned_to, organization_id, job_title, company_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      email || '',
      phone || '',
      company || '',
      source || '',
      leadScore,
      notes || '',
      leadStatus,
      owner,
      orgId,
      jobTitle || '',
      companySize || '',
    );

    // Initialize lead score based on source + ICP
    try { initializeLeadScore(id); } catch { /* ignore scoring errors */ }

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow;

    res.status(201).json({ lead: sanitizeLead(lead) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar lead: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id — Update lead (partial)
// ──────────────────────────────────────

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Lead nao encontrado' });
      return;
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      email: 'email',
      phone: 'phone',
      company: 'company',
      source: 'source',
      score: 'score',
      notes: 'notes',
      status: 'status',
      assignedTo: 'assigned_to',
      organizationId: 'organization_id',
      jobTitle: 'job_title',
      companySize: 'company_size',
    };

    for (const [bodyKey, dbColumn] of Object.entries(fieldMap)) {
      if (req.body[bodyKey] !== undefined) {
        fields.push(`${dbColumn} = ?`);
        params.push(req.body[bodyKey]);
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'Nenhum campo para atualizar' });
      return;
    }

    // Validate assignedTo if being changed
    if (req.body.assignedTo !== undefined) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(req.body.assignedTo);
      if (!userExists) {
        const idx = fields.findIndex(f => f === 'assigned_to = ?');
        if (idx !== -1) {
          fields.splice(idx, 1);
          params.splice(idx, 1);
        }
      }
    }

    // Validate organizationId if being changed
    if (req.body.organizationId !== undefined && req.body.organizationId !== null) {
      const orgExists = db.prepare('SELECT id FROM organizations WHERE id = ?').get(req.body.organizationId);
      if (!orgExists) {
        const idx = fields.findIndex(f => f === 'organization_id = ?');
        if (idx !== -1) {
          fields.splice(idx, 1);
          params.splice(idx, 1);
        }
      }
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'Nenhum campo valido para atualizar' });
      return;
    }

    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    // Recalculate score if ICP-relevant fields changed
    if (req.body.jobTitle !== undefined || req.body.companySize !== undefined || req.body.source !== undefined) {
      try { calculateLeadScore(id as string); } catch { /* ignore scoring errors */ }
    }

    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow;

    res.json({ lead: sanitizeLead(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao atualizar lead: ${message}` });
  }
});

// ──────────────────────────────────────
// DELETE /:id — Delete lead
// ──────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Lead nao encontrado' });
      return;
    }

    db.prepare('DELETE FROM leads WHERE id = ?').run(id);

    res.json({ message: 'Lead removido com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover lead: ${message}` });
  }
});

// ──────────────────────────────────────
// POST /:id/convert — Convert lead to Contact + Deal
// ──────────────────────────────────────

router.post('/:id/convert', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { dealTitle, dealValue, dealStage } = req.body;
    const auth = req.auth!;

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as LeadRow | undefined;
    if (!lead) {
      res.status(404).json({ error: 'Lead nao encontrado' });
      return;
    }

    if (lead.status === 'disqualified') {
      res.status(400).json({ error: 'Nao e possivel converter um lead desqualificado' });
      return;
    }

    const validStages = ['lead', 'contato_feito', 'proposta_enviada', 'negociacao', 'fechado_ganho', 'fechado_perdido'];
    const stage = dealStage && validStages.includes(dealStage) ? dealStage : 'lead';

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // Determine owner: use lead's assigned_to or fallback to authenticated user
    const owner = lead.assigned_to || auth.userId;

    // Create contact from lead data
    const contactId = crypto.randomUUID();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(lead.name)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`;

    db.prepare(`
      INSERT INTO contacts (id, name, email, phone, company, role, avatar, status, value, tags, assigned_to, organization_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contactId,
      lead.name,
      lead.email || '',
      lead.phone || '',
      lead.company || '',
      '',
      avatar,
      'active',
      dealValue ?? 0,
      '[]',
      owner,
      lead.organization_id || null,
      now,
      now,
    );

    // Create deal linked to new contact
    const dealId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO deals (id, title, contact_id, contact_name, company, value, stage, probability, expected_close, assigned_to, organization_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dealId,
      dealTitle || `Deal - ${lead.name}`,
      contactId,
      lead.name,
      lead.company || '',
      dealValue ?? 0,
      stage,
      20,
      null,
      owner,
      lead.organization_id || null,
      now,
      now,
    );

    // Update lead status to 'qualified'
    db.prepare("UPDATE leads SET status = 'qualified', updated_at = datetime('now') WHERE id = ?").run(id);

    // Create activity with type 'lead_converted'
    const activityId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      activityId,
      'lead_converted',
      `Lead convertido: ${lead.name}`,
      lead.name,
      contactId,
      dealId,
      now,
      null,
      now,
    );

    // Fetch the created records for response
    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contactId) as ContactRow;
    const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(dealId) as DealRow;

    res.status(201).json({
      contact: sanitizeContact(contact),
      deal: sanitizeDeal(deal),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao converter lead: ${message}` });
  }
});

export default router;
