import { Router } from 'express';
import db from '../db.js';
import crypto from 'crypto';
import { addToUnsubscribeList } from '../services/compliance.js';

const router = Router();

// GET /api/unsubscribe/:enrollmentId - confirmation page
router.get('/:enrollmentId', (req, res) => {
  const enrollment = db.prepare(`
    SELECT ce.id, ce.lead_id, ce.contact_id,
      COALESCE(l.name, c.name) as name, COALESCE(l.email, c.email) as email
    FROM cadence_enrollments ce
    LEFT JOIN leads l ON ce.lead_id = l.id
    LEFT JOIN contacts c ON ce.contact_id = c.id
    WHERE ce.id = ?
  `).get(req.params.enrollmentId) as any;

  if (!enrollment) {
    return res.status(404).send('<html><body><h1>Link invalido</h1><p>Este link de descadastro nao e valido.</p></body></html>');
  }

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelar Inscricao - PulseCRM</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; max-width: 480px; width: 100%; text-align: center; }
    h1 { font-size: 24px; color: #1e293b; margin-bottom: 8px; }
    p { color: #64748b; margin-bottom: 24px; line-height: 1.6; }
    .name { font-weight: 600; color: #334155; }
    textarea { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; resize: vertical; min-height: 80px; font-family: inherit; margin-bottom: 16px; }
    button { background: #ef4444; color: white; border: none; padding: 12px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: background 0.2s; }
    button:hover { background: #dc2626; }
    .subtle { font-size: 13px; color: #94a3b8; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Cancelar Inscricao</h1>
    <p>Ola <span class="name">${enrollment.name || 'visitante'}</span>, voce esta prestes a cancelar o recebimento de nossas comunicacoes.</p>
    <form method="POST" action="/api/unsubscribe/${enrollment.id}">
      <textarea name="reason" placeholder="Motivo (opcional)"></textarea>
      <button type="submit">Confirmar Cancelamento</button>
    </form>
    <p class="subtle">Voce pode reverter esta acao entrando em contato conosco.</p>
  </div>
</body>
</html>`);
});

// POST /api/unsubscribe/:enrollmentId - process opt-out
router.post('/:enrollmentId', (req, res) => {
  const enrollment = db.prepare(`
    SELECT ce.id, ce.lead_id, ce.contact_id,
      COALESCE(l.email, c.email) as email, COALESCE(l.phone, c.phone) as phone,
      COALESCE(l.name, c.name) as name
    FROM cadence_enrollments ce
    LEFT JOIN leads l ON ce.lead_id = l.id
    LEFT JOIN contacts c ON ce.contact_id = c.id
    WHERE ce.id = ?
  `).get(req.params.enrollmentId) as any;

  if (!enrollment) {
    return res.status(404).send('<html><body><h1>Link invalido</h1></body></html>');
  }

  const reason = req.body?.reason || 'Descadastro via link no email';

  // Add to unsubscribe list
  addToUnsubscribeList(enrollment.email || '', enrollment.phone || '', reason, 'email_link', enrollment.id);

  // Mark enrollment as unsubscribed
  db.prepare("UPDATE cadence_enrollments SET status = 'unsubscribed', paused_at = datetime('now'), next_step_due = NULL WHERE id = ?").run(enrollment.id);

  // Also unsubscribe from all other active enrollments for same lead/contact
  if (enrollment.lead_id) {
    db.prepare("UPDATE cadence_enrollments SET status = 'unsubscribed', paused_at = datetime('now'), next_step_due = NULL WHERE lead_id = ? AND status = 'active'").run(enrollment.lead_id);
  }
  if (enrollment.contact_id) {
    db.prepare("UPDATE cadence_enrollments SET status = 'unsubscribed', paused_at = datetime('now'), next_step_due = NULL WHERE contact_id = ? AND status = 'active'").run(enrollment.contact_id);
  }

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inscricao Cancelada - PulseCRM</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 40px; max-width: 480px; text-align: center; }
    h1 { font-size: 24px; color: #16a34a; margin-bottom: 8px; }
    p { color: #64748b; line-height: 1.6; }
    .check { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#x2713;</div>
    <h1>Inscricao Cancelada</h1>
    <p>${enrollment.name || 'Voce'} foi removido(a) da nossa lista de comunicacoes. Voce nao recebera mais mensagens automaticas.</p>
  </div>
</body>
</html>`);
});

export default router;
