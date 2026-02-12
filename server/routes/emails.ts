import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

interface EmailRow {
  id: string;
  contact_id: string | null;
  contact_name: string;
  contact_email: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: number;
  direction: string;
  starred: number;
  created_at: string;
}

function sanitizeEmail(row: EmailRow) {
  return {
    id: row.id,
    contactId: row.contact_id,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    subject: row.subject,
    preview: row.preview,
    body: row.body,
    date: row.date,
    read: Boolean(row.read),
    direction: row.direction,
    starred: Boolean(row.starred),
    createdAt: row.created_at,
  };
}

// All routes require authentication
router.use(verifyAuth);

// GET /api/emails — list emails with optional filters
router.get('/', (req: AuthRequest, res) => {
  try {
    const { direction, search, contactId } = req.query;

    let query = 'SELECT * FROM emails WHERE 1=1';
    const params: unknown[] = [];

    if (direction && (direction === 'sent' || direction === 'received')) {
      query += ' AND direction = ?';
      params.push(direction);
    }

    if (contactId && typeof contactId === 'string') {
      query += ' AND contact_id = ?';
      params.push(contactId);
    }

    if (search && typeof search === 'string') {
      query += ' AND (contact_name LIKE ? OR subject LIKE ? OR preview LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY date DESC';

    const emails = db.prepare(query).all(...params) as EmailRow[];

    res.json({ emails: emails.map(sanitizeEmail) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// POST /api/emails — create email
router.post('/', (req: AuthRequest, res) => {
  const { contactId, contactName, contactEmail, subject, preview, body, date, direction, starred } = req.body;

  if (!subject) {
    res.status(400).json({ error: 'Assunto e obrigatorio' });
    return;
  }

  if (!direction || (direction !== 'sent' && direction !== 'received')) {
    res.status(400).json({ error: 'Direcao e obrigatoria e deve ser "sent" ou "received"' });
    return;
  }

  try {
    const id = crypto.randomUUID();
    const emailDate = date || new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(`
      INSERT INTO emails (id, contact_id, contact_name, contact_email, subject, preview, body, date, read, direction, starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      contactId || null,
      (contactName || '').trim(),
      (contactEmail || '').trim(),
      subject.trim(),
      (preview || '').trim(),
      (body || '').trim(),
      emailDate,
      direction,
      starred ? 1 : 0,
    );

    // Create associated activity
    const activityId = crypto.randomUUID();
    const activityDescription = direction === 'sent'
      ? `E-mail enviado: ${subject.trim()}`
      : `E-mail recebido: ${subject.trim()}`;

    db.prepare(`
      INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta)
      VALUES (?, 'email', ?, ?, ?, NULL, ?, NULL)
    `).run(
      activityId,
      activityDescription,
      (contactName || '').trim(),
      contactId || null,
      emailDate,
    );

    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as EmailRow;

    res.status(201).json({ email: sanitizeEmail(email) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// PUT /api/emails/:id — partial update (read, starred, etc.)
router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as EmailRow | undefined;
    if (!email) {
      res.status(404).json({ error: 'E-mail nao encontrado' });
      return;
    }

    const fields: string[] = [];
    const params: unknown[] = [];

    const fieldMap: Record<string, string> = {
      contactId: 'contact_id',
      contactName: 'contact_name',
      contactEmail: 'contact_email',
      subject: 'subject',
      preview: 'preview',
      body: 'body',
      date: 'date',
      direction: 'direction',
    };

    for (const [bodyKey, dbColumn] of Object.entries(fieldMap)) {
      if (req.body[bodyKey] !== undefined) {
        fields.push(`${dbColumn} = ?`);
        params.push(req.body[bodyKey]);
      }
    }

    // Handle boolean/integer fields separately
    if (req.body.read !== undefined) {
      fields.push('read = ?');
      params.push(req.body.read ? 1 : 0);
    }

    if (req.body.starred !== undefined) {
      fields.push('starred = ?');
      params.push(req.body.starred ? 1 : 0);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'Nenhum campo para atualizar' });
      return;
    }

    params.push(id);

    db.prepare(`UPDATE emails SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as EmailRow;

    res.json({ email: sanitizeEmail(updated) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/emails/:id — delete email
router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as EmailRow | undefined;
    if (!email) {
      res.status(404).json({ error: 'E-mail nao encontrado' });
      return;
    }

    db.prepare('DELETE FROM emails WHERE id = ?').run(id);

    res.json({ message: 'E-mail removido com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: message });
  }
});

export default router;
