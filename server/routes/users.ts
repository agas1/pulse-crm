import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, requireRole } from '../middleware/auth.js';

const router = Router();

interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: 'admin' | 'manager' | 'seller';
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive';
  deals: number;
  revenue: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

function sanitizeUser(row: UserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(row.name)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`,
    role: row.role,
    plan: row.plan,
    status: row.status,
    deals: row.deals,
    revenue: row.revenue,
    conversionRate: row.conversion_rate,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// All routes require authentication
router.use(verifyAuth);

// GET /api/users — list all users (admin + manager)
router.get('/', requireRole('admin', 'manager'), (_req, res) => {
  const users = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as UserRow[];
  res.json({ users: users.map(sanitizeUser) });
});

// POST /api/users — create user (admin only)
router.post('/', requireRole('admin'), (req, res) => {
  const { name, email, password, role, status } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    res.status(409).json({ error: 'Já existe um usuário com este e-mail' });
    return;
  }

  const validRoles = ['admin', 'manager', 'seller'];
  const userRole = validRoles.includes(role) ? role : 'seller';
  const userStatus = status === 'inactive' ? 'inactive' : 'active';

  const id = crypto.randomUUID();
  const hashed = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password, role, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), email.trim().toLowerCase(), hashed, userRole, userStatus);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;

  res.status(201).json({ user: sanitizeUser(user) });
});

// PUT /api/users/:id — update user (admin only)
router.put('/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?').get(email.trim(), id);
    if (existing) {
      res.status(409).json({ error: 'Já existe outro usuário com este e-mail' });
      return;
    }
  }

  const validRoles = ['admin', 'manager', 'seller'];
  const updates = {
    name: name?.trim() || user.name,
    email: email?.trim().toLowerCase() || user.email,
    role: validRoles.includes(role) ? role : user.role,
    status: ['active', 'inactive'].includes(status) ? status : user.status,
  };

  db.prepare(`
    UPDATE users SET name = ?, email = ?, role = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(updates.name, updates.email, updates.role, updates.status, id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;

  res.json({ user: sanitizeUser(updated) });
});

// PUT /api/users/:id/password — reset password (admin only)
router.put('/:id/password', requireRole('admin'), (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hashed, id);

  res.json({ message: 'Senha redefinida com sucesso' });
});

// DELETE /api/users/:id — delete user (admin only)
router.delete('/:id', requireRole('admin'), (req, res) => {
  const { id } = req.params;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);

  res.json({ message: 'Usuário removido com sucesso' });
});

export default router;
