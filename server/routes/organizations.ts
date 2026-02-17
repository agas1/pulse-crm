import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface OrgRow {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  employee_count: number;
  annual_revenue: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function sanitizeOrg(row: OrgRow) {
  return {
    id: row.id,
    name: row.name,
    industry: row.industry,
    website: row.website,
    phone: row.phone,
    address: row.address,
    employeeCount: row.employee_count,
    annualRevenue: row.annual_revenue,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET / — List organizations with filters
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const { search, industry } = req.query;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (search) {
      conditions.push('(name LIKE ? OR website LIKE ? OR phone LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (industry) {
      conditions.push('industry = ?');
      params.push(industry);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orgs = db.prepare(`SELECT * FROM organizations ${where} ORDER BY created_at DESC`).all(...params) as OrgRow[];

    res.json({ organizations: orgs.map(sanitizeOrg) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar organizacoes: ${message}` });
  }
});

// ──────────────────────────────────────
// GET /:id — Single organization with related counts
// ──────────────────────────────────────

router.get('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as OrgRow | undefined;
    if (!org) {
      res.status(404).json({ error: 'Organizacao nao encontrada' });
      return;
    }

    // Count related contacts
    const contactsResult = db.prepare('SELECT COUNT(*) as count FROM contacts WHERE organization_id = ?').get(id) as { count: number };

    // Count related deals and sum revenue from won deals
    const dealsResult = db.prepare(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(CASE WHEN stage = 'fechado_ganho' THEN value ELSE 0 END), 0) as total_revenue
      FROM deals
      WHERE organization_id = ?
    `).get(id) as { count: number; total_revenue: number };

    res.json({
      organization: {
        ...sanitizeOrg(org),
        contactsCount: contactsResult.count,
        dealsCount: dealsResult.count,
        totalRevenue: dealsResult.total_revenue,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar organizacao: ${message}` });
  }
});

// ──────────────────────────────────────
// POST / — Create organization
// ──────────────────────────────────────

router.post('/', (req: AuthRequest, res) => {
  try {
    const { name, industry, website, phone, address, employeeCount, annualRevenue, notes } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Nome e obrigatorio' });
      return;
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO organizations (id, name, industry, website, phone, address, employee_count, annual_revenue, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      industry || '',
      website || '',
      phone || '',
      address || '',
      employeeCount ?? 0,
      annualRevenue ?? 0,
      notes || '',
    );

    const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as OrgRow;

    res.status(201).json({ organization: sanitizeOrg(org) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar organizacao: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:id — Update organization (partial)
// ──────────────────────────────────────

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as OrgRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Organizacao nao encontrada' });
      return;
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    const fieldMap: Record<string, string> = {
      name: 'name',
      industry: 'industry',
      website: 'website',
      phone: 'phone',
      address: 'address',
      employeeCount: 'employee_count',
      annualRevenue: 'annual_revenue',
      notes: 'notes',
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

    fields.push("updated_at = datetime('now')");
    params.push(id);

    db.prepare(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as OrgRow;

    res.json({ organization: sanitizeOrg(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao atualizar organizacao: ${message}` });
  }
});

// ──────────────────────────────────────
// DELETE /:id — Delete organization
// ──────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM organizations WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Organizacao nao encontrada' });
      return;
    }

    db.prepare('DELETE FROM organizations WHERE id = ?').run(id);

    res.json({ message: 'Organizacao removida com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover organizacao: ${message}` });
  }
});

export default router;
