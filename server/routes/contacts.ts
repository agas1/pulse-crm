import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

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
  created_at: string;
  updated_at: string;
}

interface NoteRow {
  id: string;
  contact_id: string;
  content: string;
  author: string;
  date: string;
  created_at: string;
}

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  contact_name: string;
  contact_id: string;
  deal_id: string;
  date: string;
  meta: string;
  created_at: string;
}

interface EmailRow {
  id: string;
  contact_id: string;
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

interface DealRow {
  id: string;
  title: string;
  contact_id: string;
  contact_name: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  expected_close: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
}

function sanitizeNote(row: NoteRow) {
  return {
    id: row.id,
    contactId: row.contact_id,
    content: row.content,
    author: row.author,
    date: row.date,
    createdAt: row.created_at,
  };
}

function sanitizeContact(row: ContactRow, notes: NoteRow[] = []) {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: notes.map(sanitizeNote),
  };
}

// All routes require authentication
router.use(verifyAuth);

// GET /api/contacts — list contacts with optional filters
router.get('/', (req: AuthRequest, res) => {
  const { status, search, assignedTo } = req.query;
  const auth = req.auth!;

  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params: unknown[] = [];

  // Ownership filtering: sellers see only their own contacts
  if (auth.role === 'seller') {
    query += ' AND assigned_to = ?';
    params.push(auth.userId);
  } else if (assignedTo) {
    query += ' AND assigned_to = ?';
    params.push(assignedTo);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY created_at DESC';

  const contacts = db.prepare(query).all(...params) as ContactRow[];

  const result = contacts.map((contact) => {
    const notes = db.prepare('SELECT * FROM notes WHERE contact_id = ? ORDER BY date DESC').all(contact.id) as NoteRow[];
    return sanitizeContact(contact, notes);
  });

  res.json({ contacts: result });
});

// POST /api/contacts/import — import contacts in batch (MUST be before /:id)
router.post('/import', (req: AuthRequest, res) => {
  const { contacts } = req.body;

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    res.status(400).json({ error: 'Lista de contatos e obrigatoria' });
    return;
  }

  const auth = req.auth!;

  const insertContact = db.prepare(`
    INSERT INTO contacts (id, name, email, phone, company, role, avatar, status, value, tags, assigned_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const importAll = db.transaction((items: typeof contacts) => {
    let imported = 0;

    for (const c of items) {
      if (!c.name || !c.email) continue;

      const id = crypto.randomUUID();
      const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`;
      const tags = c.tags ? JSON.stringify(c.tags) : '[]';
      const assignedTo = c.assignedTo || auth.userId;

      insertContact.run(
        id,
        c.name,
        c.email,
        c.phone || '',
        c.company || '',
        c.role || '',
        avatar,
        c.status || 'lead',
        c.value || 0,
        tags,
        assignedTo
      );

      imported++;
    }

    return imported;
  });

  try {
    const imported = importAll(contacts);
    res.status(201).json({ imported });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao importar contatos: ${message}` });
  }
});

// GET /api/contacts/:id — single contact with notes
router.get('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined;
  if (!contact) {
    res.status(404).json({ error: 'Contato nao encontrado' });
    return;
  }

  const notes = db.prepare('SELECT * FROM notes WHERE contact_id = ? ORDER BY date DESC').all(id) as NoteRow[];

  res.json({ contact: sanitizeContact(contact, notes) });
});

// POST /api/contacts — create contact
router.post('/', (req: AuthRequest, res) => {
  const { name, email, phone, company, role, status, value, tags, assignedTo } = req.body;
  const auth = req.auth!;

  if (!name || !email) {
    res.status(400).json({ error: 'Nome e e-mail sao obrigatorios' });
    return;
  }

  try {
    const id = crypto.randomUUID();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`;
    const tagsJson = tags ? JSON.stringify(tags) : '[]';

    // Validate assignedTo exists in users table; fallback to authenticated user
    let owner = auth.userId;
    if (assignedTo && assignedTo !== auth.userId) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedTo);
      if (userExists) owner = assignedTo;
    }

    // Also verify auth.userId is valid
    const authUserExists = db.prepare('SELECT id FROM users WHERE id = ?').get(owner);
    if (!authUserExists) {
      // Fallback to first admin user
      const fallbackUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as { id: string } | undefined;
      if (fallbackUser) owner = fallbackUser.id;
    }

    db.prepare(`
      INSERT INTO contacts (id, name, email, phone, company, role, avatar, status, value, tags, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, phone || '', company || '', role || '', avatar, status || 'lead', value || 0, tagsJson, owner);

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow;
    const notes = db.prepare('SELECT * FROM notes WHERE contact_id = ? ORDER BY date DESC').all(id) as NoteRow[];

    res.status(201).json({ contact: sanitizeContact(contact, notes) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar contato: ${message}` });
  }
});

// PUT /api/contacts/:id — partial update
router.put('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined;
  if (!contact) {
    res.status(404).json({ error: 'Contato nao encontrado' });
    return;
  }

  const fields: string[] = [];
  const params: unknown[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    company: 'company',
    role: 'role',
    avatar: 'avatar',
    status: 'status',
    value: 'value',
    lastContact: 'last_contact',
    assignedTo: 'assigned_to',
  };

  for (const [bodyKey, dbColumn] of Object.entries(fieldMap)) {
    if (req.body[bodyKey] !== undefined) {
      fields.push(`${dbColumn} = ?`);
      params.push(req.body[bodyKey]);
    }
  }

  // Handle tags separately (needs JSON.stringify)
  if (req.body.tags !== undefined) {
    fields.push('tags = ?');
    params.push(JSON.stringify(req.body.tags));
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'Nenhum campo para atualizar' });
    return;
  }

  // Validate assignedTo if being changed
  if (req.body.assignedTo !== undefined) {
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(req.body.assignedTo);
    if (!userExists) {
      // Remove invalid assignedTo from the update
      const idx = fields.findIndex(f => f === 'assigned_to = ?');
      if (idx !== -1) {
        fields.splice(idx, 1);
        params.splice(idx, 1);
      }
    }
  }

  fields.push("updated_at = datetime('now')");
  params.push(id);

  try {
    db.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow;
    const notes = db.prepare('SELECT * FROM notes WHERE contact_id = ? ORDER BY date DESC').all(id) as NoteRow[];

    res.json({ contact: sanitizeContact(updated, notes) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao atualizar contato: ${message}` });
  }
});

// DELETE /api/contacts/:id — delete contact
router.delete('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined;
  if (!contact) {
    res.status(404).json({ error: 'Contato nao encontrado' });
    return;
  }

  try {
    db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    res.json({ message: 'Contato removido com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover contato: ${message}` });
  }
});

// GET /api/contacts/:id/timeline — aggregated timeline
router.get('/:id/timeline', (req: AuthRequest, res) => {
  const { id } = req.params;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined;
  if (!contact) {
    res.status(404).json({ error: 'Contato nao encontrado' });
    return;
  }

  const timeline: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    date: string;
    meta?: string;
  }> = [];

  // Emails
  const emails = db.prepare('SELECT * FROM emails WHERE contact_id = ?').all(id) as EmailRow[];
  for (const e of emails) {
    timeline.push({
      id: e.id,
      type: e.direction === 'sent' ? 'email_sent' : 'email_received',
      title: e.subject,
      description: e.preview,
      date: e.date,
    });
  }

  // Notes
  const notes = db.prepare('SELECT * FROM notes WHERE contact_id = ?').all(id) as NoteRow[];
  for (const n of notes) {
    timeline.push({
      id: n.id,
      type: 'note',
      title: `Nota de ${n.author}`,
      description: n.content,
      date: n.date,
    });
  }

  // Activities
  const activities = db.prepare('SELECT * FROM activities WHERE contact_id = ?').all(id) as ActivityRow[];
  for (const a of activities) {
    timeline.push({
      id: a.id,
      type: a.type,
      title: a.description,
      description: a.description,
      date: a.date,
      meta: a.meta || undefined,
    });
  }

  // Deals (as deal_created)
  const deals = db.prepare('SELECT * FROM deals WHERE contact_id = ?').all(id) as DealRow[];
  for (const d of deals) {
    timeline.push({
      id: d.id,
      type: 'deal_created',
      title: d.title,
      description: `Deal criado: ${d.title} - R$ ${d.value.toLocaleString('pt-BR')}`,
      date: d.created_at,
    });
  }

  // Sort by date descending
  timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({ timeline });
});

// POST /api/contacts/:id/notes — add note to contact
router.post('/:id/notes', (req: AuthRequest, res) => {
  const { id } = req.params;
  const { content, author } = req.body;

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id) as ContactRow | undefined;
  if (!contact) {
    res.status(404).json({ error: 'Contato nao encontrado' });
    return;
  }

  if (!content || !author) {
    res.status(400).json({ error: 'Conteudo e autor sao obrigatorios' });
    return;
  }

  const noteId = crypto.randomUUID();
  const now = new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO notes (id, contact_id, content, author, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(noteId, id, content, author, now);

  // Also create an activity with type='note'
  const activityId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO activities (id, type, description, contact_name, contact_id, date, meta)
    VALUES (?, 'note', ?, ?, ?, ?, NULL)
  `).run(activityId, content, contact.name, id, new Date().toISOString().replace('T', ' ').slice(0, 16));

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as NoteRow;

  res.status(201).json({ note: sanitizeNote(note) });
});

export default router;
