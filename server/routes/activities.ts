import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  contact_name: string;
  contact_id: string | null;
  deal_id: string | null;
  date: string;
  meta: string | null;
  created_at: string;
}

function sanitizeActivity(row: ActivityRow) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    contactName: row.contact_name,
    contactId: row.contact_id,
    dealId: row.deal_id,
    date: row.date,
    meta: row.meta,
    createdAt: row.created_at,
  };
}

// All routes require authentication
router.use(verifyAuth);

// GET /api/activities — list activities sorted by date DESC
router.get('/', (req: AuthRequest, res) => {
  const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 50);
  const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);
  const { contactId } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (contactId && typeof contactId === 'string') {
    conditions.push('contact_id = ?');
    params.push(contactId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM activities ${where}`;
  const { total } = db.prepare(countSql).get(...params) as { total: number };

  const sql = `SELECT * FROM activities ${where} ORDER BY date DESC LIMIT ? OFFSET ?`;
  const activities = db.prepare(sql).all(...params, limit, offset) as ActivityRow[];

  res.json({
    activities: activities.map(sanitizeActivity),
    total,
    limit,
    offset,
  });
});

// POST /api/activities — create activity manually
router.post('/', (req: AuthRequest, res) => {
  const { type, description, contactName, contactId, dealId, date, meta } = req.body;

  if (!type || !description) {
    res.status(400).json({ error: 'Tipo e descricao sao obrigatorios' });
    return;
  }

  const validTypes = ['email', 'call', 'meeting', 'note', 'whatsapp', 'status_change', 'task_done'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `Tipo invalido. Tipos permitidos: ${validTypes.join(', ')}` });
    return;
  }

  const id = crypto.randomUUID();
  const activityDate = date || new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    type,
    description.trim(),
    (contactName || '').trim(),
    contactId || null,
    dealId || null,
    activityDate,
    meta || null,
  );

  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as ActivityRow;

  res.status(201).json({ activity: sanitizeActivity(activity) });
});

export default router;
