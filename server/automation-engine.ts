import crypto from 'crypto';
import db from './db.js';

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

export interface AutomationEvent {
  type: string; // trigger_type: 'deal_stage_changed', 'deal_created', 'contact_created', 'task_completed', 'lead_created', 'lead_converted'
  data: Record<string, unknown>; // entity data (the deal, contact, task, or lead object)
  userId: string; // the user who triggered the event
}

interface RuleRow {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: string;
  condition_type: string;
  condition_config: string;
  action_type: string;
  action_config: string;
  enabled: number;
  executions: number;
}

// ──────────────────────────────────────
// Condition evaluators
// ──────────────────────────────────────

function evaluateCondition(
  conditionType: string,
  conditionConfig: Record<string, unknown>,
  eventData: Record<string, unknown>,
): boolean {
  switch (conditionType) {
    case 'always':
      return true;

    case 'field_equals': {
      const field = conditionConfig.field as string;
      const value = conditionConfig.value;
      if (!field) return true;
      return eventData[field] === value;
    }

    case 'value_greater_than': {
      const field = conditionConfig.field as string;
      const value = conditionConfig.value;
      if (!field) return true;
      return Number(eventData[field]) > Number(value);
    }

    default:
      // Tipo de condição desconhecido — considerar como verdadeiro para não bloquear
      return true;
  }
}

// ──────────────────────────────────────
// Trigger matching (for deal_stage_changed)
// ──────────────────────────────────────

function matchesTrigger(
  triggerType: string,
  triggerConfig: Record<string, unknown>,
  event: AutomationEvent,
): boolean {
  if (triggerType !== event.type) return false;

  if (triggerType === 'deal_stage_changed') {
    const toStage = triggerConfig.toStage as string | undefined;
    const fromStage = triggerConfig.fromStage as string | undefined;

    if (toStage) {
      const eventToStage = (event.data.toStage ?? event.data.stage) as string | undefined;
      if (eventToStage !== toStage) return false;
    }

    if (fromStage) {
      const eventFromStage = event.data.fromStage as string | undefined;
      if (eventFromStage !== fromStage) return false;
    }
  }

  return true;
}

// ──────────────────────────────────────
// Action executors
// ──────────────────────────────────────

function executeAction(
  actionType: string,
  actionConfig: Record<string, unknown>,
  event: AutomationEvent,
): string {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  switch (actionType) {
    case 'create_task': {
      const title = (actionConfig.title as string) || 'Tarefa automática';
      const dueDays = Number(actionConfig.dueDays) || 1;
      const priority = (actionConfig.priority as string) || 'medium';
      const taskType = (actionConfig.type as string) || 'other';

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + dueDays);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const contactId = (event.data.contact_id ?? event.data.contactId ?? null) as string | null;
      const contactName = (event.data.contact_name ?? event.data.contactName ?? '') as string;

      const taskId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO tasks (id, title, description, contact_id, contact_name, due_date, due_time, priority, status, type, assigned_to, automated, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        taskId,
        title,
        `Gerado automaticamente pela automação`,
        contactId,
        contactName,
        dueDateStr,
        null,
        priority,
        'pending',
        taskType,
        event.userId,
        now,
        now,
      );

      return `Tarefa criada: "${title}" (vencimento: ${dueDateStr})`;
    }

    case 'create_activity': {
      const activityType = (actionConfig.type as string) || 'note';
      const description = (actionConfig.description as string) || 'Atividade automática';

      const contactId = (event.data.contact_id ?? event.data.contactId ?? null) as string | null;
      const contactName = (event.data.contact_name ?? event.data.contactName ?? '') as string;
      const dealId = (event.data.deal_id ?? event.data.dealId ?? event.data.id ?? null) as string | null;

      const activityId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO activities (id, type, description, contact_name, contact_id, deal_id, date, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        activityId,
        activityType,
        description,
        contactName,
        contactId,
        dealId,
        now,
        null,
        now,
      );

      return `Atividade criada: "${description}" (tipo: ${activityType})`;
    }

    case 'update_field': {
      const entity = (actionConfig.entity as string) || '';
      const field = (actionConfig.field as string) || '';
      const value = actionConfig.value;

      if (!entity || !field) {
        return 'Erro: entidade ou campo não especificado para update_field';
      }

      const entityId = (event.data.id as string) || '';
      if (!entityId) {
        return 'Erro: ID da entidade não encontrado nos dados do evento';
      }

      if (entity === 'deal') {
        db.prepare(`UPDATE deals SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(
          value,
          entityId,
        );
        return `Campo "${field}" do deal atualizado para "${value}"`;
      } else if (entity === 'contact') {
        db.prepare(`UPDATE contacts SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(
          value,
          entityId,
        );
        return `Campo "${field}" do contato atualizado para "${value}"`;
      }

      return `Erro: entidade "${entity}" não suportada para update_field`;
    }

    case 'send_notification': {
      const message = (actionConfig.message as string) || 'Notificação automática';

      const contactId = (event.data.contact_id ?? event.data.contactId ?? null) as string | null;
      const contactName = (event.data.contact_name ?? event.data.contactName ?? '') as string;

      // Sem sistema de notificação real ainda — registrar como atividade do tipo 'note'
      const activityId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO activities (id, type, description, contact_name, contact_id, date, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        activityId,
        'note',
        message,
        contactName,
        contactId,
        now,
        null,
        now,
      );

      console.log(`[Automação] Notificação: ${message}`);
      return `Notificação enviada: "${message}"`;
    }

    default:
      return `Erro: tipo de ação desconhecido "${actionType}"`;
  }
}

// ──────────────────────────────────────
// Main engine
// ──────────────────────────────────────

export function evaluateAutomations(event: AutomationEvent): void {
  try {
    // 1. Buscar regras ativas cujo trigger_type corresponde ao evento
    const rules = db.prepare(
      'SELECT id, name, trigger_type, trigger_config, condition_type, condition_config, action_type, action_config, enabled, executions FROM automation_rules WHERE enabled = 1 AND trigger_type = ?',
    ).all(event.type) as RuleRow[];

    for (const rule of rules) {
      try {
        // Parse configs
        let triggerConfig: Record<string, unknown> = {};
        let conditionConfig: Record<string, unknown> = {};
        let actionConfig: Record<string, unknown> = {};

        try { triggerConfig = JSON.parse(rule.trigger_config || '{}'); } catch { /* config inválida */ }
        try { conditionConfig = JSON.parse(rule.condition_config || '{}'); } catch { /* config inválida */ }
        try { actionConfig = JSON.parse(rule.action_config || '{}'); } catch { /* config inválida */ }

        // 2. Verificar se o trigger corresponde (inclui verificação de toStage/fromStage)
        if (!matchesTrigger(rule.trigger_type, triggerConfig, event)) {
          continue;
        }

        // 3. Avaliar condição
        if (!evaluateCondition(rule.condition_type, conditionConfig, event.data)) {
          continue;
        }

        // 4. Executar ação
        const details = executeAction(rule.action_type, actionConfig, event);

        // 5. Atualizar contadores da regra
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        db.prepare(
          'UPDATE automation_rules SET executions = executions + 1, last_triggered = ?, updated_at = ? WHERE id = ?',
        ).run(now, now, rule.id);

        // 6. Registrar log de execução
        const logId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO automation_logs (id, rule_id, rule_name, trigger_type, action_type, result, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          rule.id,
          rule.name,
          rule.trigger_type,
          rule.action_type,
          'success',
          details,
          now,
        );

        console.log(`[Automação] Regra "${rule.name}" executada com sucesso: ${details}`);
      } catch (ruleErr: unknown) {
        // Erro na execução de uma regra individual — registrar e continuar
        const errorMsg = ruleErr instanceof Error ? ruleErr.message : 'Erro desconhecido';
        console.error(`[Automação] Erro ao executar regra "${rule.name}": ${errorMsg}`);

        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const logId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO automation_logs (id, rule_id, rule_name, trigger_type, action_type, result, details, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          rule.id,
          rule.name,
          rule.trigger_type,
          rule.action_type,
          'error',
          `Erro: ${errorMsg}`,
          now,
        );
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error(`[Automação] Erro ao avaliar automações para evento "${event.type}": ${message}`);
  }
}
