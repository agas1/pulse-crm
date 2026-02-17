import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface AutomationRuleRow {
  id: string;
  name: string;
  description: string;
  trigger_event: string;
  condition: string;
  action: string;
  trigger_type: string;
  trigger_config: string;
  condition_type: string;
  condition_config: string;
  action_type: string;
  action_config: string;
  enabled: number;
  executions: number;
  last_triggered: string | null;
  created_at: string;
  updated_at: string;
}

interface AutomationLogRow {
  id: string;
  rule_id: string;
  rule_name: string;
  trigger_type: string;
  action_type: string;
  result: string;
  details: string;
  created_at: string;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function sanitizeRule(row: AutomationRuleRow) {
  let triggerConfig = {};
  let conditionConfig = {};
  let actionConfig = {};
  try { triggerConfig = JSON.parse(row.trigger_config || '{}'); } catch { /* config inválida */ }
  try { conditionConfig = JSON.parse(row.condition_config || '{}'); } catch { /* config inválida */ }
  try { actionConfig = JSON.parse(row.action_config || '{}'); } catch { /* config inválida */ }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trigger: row.trigger_event,
    condition: row.condition,
    action: row.action,
    triggerType: row.trigger_type,
    triggerConfig,
    conditionType: row.condition_type,
    conditionConfig,
    actionType: row.action_type,
    actionConfig,
    enabled: Boolean(row.enabled),
    executions: row.executions,
    lastTriggered: row.last_triggered,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeLog(row: AutomationLogRow) {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    triggerType: row.trigger_type,
    actionType: row.action_type,
    result: row.result,
    details: row.details,
    createdAt: row.created_at,
  };
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET / — List all automation rules
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const rules = db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC').all() as AutomationRuleRow[];

    res.json({ automations: rules.map(sanitizeRule) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar regras de automação' });
  }
});

// ──────────────────────────────────────
// POST / — Create automation rule
// ──────────────────────────────────────

router.post('/', (req: AuthRequest, res) => {
  try {
    const { name, description, trigger, condition, action, enabled } = req.body;

    if (!name || !trigger || !condition || !action) {
      res.status(400).json({ error: 'Nome, trigger, condição e ação são obrigatórios' });
      return;
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const ruleEnabled = enabled !== undefined ? (enabled ? 1 : 0) : 1;

    db.prepare(`
      INSERT INTO automation_rules (id, name, description, trigger_event, condition, action, enabled, executions, last_triggered, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
    `).run(
      id,
      name.trim(),
      (description || '').trim(),
      trigger.trim(),
      condition.trim(),
      action.trim(),
      ruleEnabled,
      now,
      now,
    );

    const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(id) as AutomationRuleRow;

    res.status(201).json({ rule: sanitizeRule(rule) });
  } catch {
    res.status(500).json({ error: 'Erro ao criar regra de automação' });
  }
});

// ──────────────────────────────────────
// PUT /:id — Update automation rule
// ──────────────────────────────────────

router.put('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(id) as AutomationRuleRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Regra de automação não encontrada' });
      return;
    }

    const { name, description, trigger, condition, action, enabled } = req.body;

    const updates = {
      name: name?.trim() || existing.name,
      description: description !== undefined ? (description || '').trim() : existing.description,
      trigger_event: trigger?.trim() || existing.trigger_event,
      condition: condition?.trim() || existing.condition,
      action: action?.trim() || existing.action,
      enabled: enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
    };

    db.prepare(`
      UPDATE automation_rules
      SET name = ?, description = ?, trigger_event = ?, condition = ?, action = ?, enabled = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.name,
      updates.description,
      updates.trigger_event,
      updates.condition,
      updates.action,
      updates.enabled,
      id,
    );

    const rule = db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(id) as AutomationRuleRow;

    res.json({ rule: sanitizeRule(rule) });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar regra de automação' });
  }
});

// ──────────────────────────────────────
// DELETE /:id — Delete automation rule
// ──────────────────────────────────────

router.delete('/:id', (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT id FROM automation_rules WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'Regra de automação não encontrada' });
      return;
    }

    db.prepare('DELETE FROM automation_rules WHERE id = ?').run(id);

    res.json({ message: 'Regra de automação removida com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover regra de automação' });
  }
});

// ──────────────────────────────────────
// GET /logs — List automation execution logs
// ──────────────────────────────────────

router.get('/logs', (req: AuthRequest, res) => {
  try {
    const logs = db.prepare('SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT 50').all() as AutomationLogRow[];

    res.json({ logs: logs.map(sanitizeLog) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar logs de automação' });
  }
});

export default router;
