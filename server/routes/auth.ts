import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../db.js';
import { signToken, verifyAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

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
  };
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as UserRow | undefined;

  if (!user) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  if (!bcrypt.compareSync(password, user.password)) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  if (user.status === 'inactive') {
    res.status(403).json({ error: 'Conta inativa. Contate o administrador.' });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });

  res.json({
    token,
    user: sanitizeUser(user),
  });
});

// GET /api/auth/me
router.get('/me', verifyAuth, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

// PUT /api/auth/password
router.put('/password', verifyAuth, (req: AuthRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.auth!.userId) as UserRow | undefined;

  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' });
    return;
  }

  if (!bcrypt.compareSync(currentPassword, user.password)) {
    res.status(401).json({ error: 'Senha atual incorreta' });
    return;
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hashed, user.id);

  res.json({ message: 'Senha alterada com sucesso' });
});

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    res.status(400).json({ error: 'E-mail inválido' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim());
  if (existing) {
    res.status(409).json({ error: 'Já existe uma conta com este e-mail' });
    return;
  }

  const id = crypto.randomUUID();
  const hashed = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, name, email, password, role, plan, status)
    VALUES (?, ?, ?, ?, 'seller', 'trial', 'active')
  `).run(id, name.trim(), email.trim().toLowerCase(), hashed);

  res.status(201).json({ message: 'Conta criada com sucesso! Faça login para continuar.' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'E-mail é obrigatório' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as UserRow | undefined;

  // Always return success to avoid email enumeration
  if (!user) {
    res.json({ message: 'Se o e-mail existir, um código de recuperação será enviado.' });
    return;
  }

  // Invalidate previous codes for this user
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ?').run(user.id);

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, code, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(id, user.id, code, expiresAt);

  // In production, send email here. In dev, we log and return the code.
  console.log(`🔑 Password reset code for ${user.email}: ${code}`);

  res.json({
    message: 'Se o e-mail existir, um código de recuperação será enviado.',
    // DEV ONLY - remove in production
    _devCode: code,
  });
});

// POST /api/auth/reset-password
router.post('/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400).json({ error: 'E-mail, código e nova senha são obrigatórios' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    return;
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim()) as UserRow | undefined;
  if (!user) {
    res.status(400).json({ error: 'Código inválido ou expirado' });
    return;
  }

  const tokenRow = db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
    ORDER BY created_at DESC LIMIT 1
  `).get(user.id, code) as { id: string } | undefined;

  if (!tokenRow) {
    res.status(400).json({ error: 'Código inválido ou expirado' });
    return;
  }

  // Mark token as used
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(tokenRow.id);

  // Update password
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?').run(hashed, user.id);

  res.json({ message: 'Senha redefinida com sucesso' });
});

export default router;
