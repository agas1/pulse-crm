import { useState, useEffect, useCallback, type FormEvent } from 'react';
import {
  Zap,
  Play,
  Pause,
  ArrowRight,
  ArrowDown,
  Clock,
  Hash,
  Plus,
  ChevronRight,
  Pencil,
  Trash2,
  Filter,
  ListChecks,
  Activity,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import Header from '../layouts/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { AutomationRule, AutomationLog } from '../data/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

const DEAL_STAGES: { value: string; label: string }[] = [
  { value: 'lead', label: 'Lead' },
  { value: 'contato_feito', label: 'Contato Feito' },
  { value: 'proposta_enviada', label: 'Proposta Enviada' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechado_ganho', label: 'Fechado Ganho' },
  { value: 'fechado_perdido', label: 'Fechado Perdido' },
];

function stageLabel(value: string): string {
  return DEAL_STAGES.find((s) => s.value === value)?.label ?? value;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Human-readable label helpers
// ---------------------------------------------------------------------------

function triggerLabel(rule: AutomationRule): string {
  const cfg = rule.triggerConfig ?? {};
  switch (rule.triggerType) {
    case 'deal_stage_changed': {
      const from = cfg.fromStage as string | undefined;
      const to = cfg.toStage as string | undefined;
      if (from && to) return `Deal mudar de ${stageLabel(from)} para ${stageLabel(to)}`;
      if (to) return `Deal mudar para ${stageLabel(to)}`;
      if (from) return `Deal sair de ${stageLabel(from)}`;
      return 'Deal mudar de estágio';
    }
    case 'deal_created':
      return 'Deal criado';
    case 'contact_created':
      return 'Contato criado';
    case 'task_completed':
      return 'Tarefa concluída';
    case 'lead_created':
      return 'Lead criado';
    case 'lead_converted':
      return 'Lead convertido';
    case 'inactivity_days': {
      const days = (cfg.days as number) ?? '?';
      const entity = (cfg.entity as string) === 'contact' ? 'contato' : 'deal';
      return `Inativo há ${days} dias (${entity})`;
    }
    default:
      return rule.trigger || rule.triggerType || 'Gatilho';
  }
}

function conditionLabel(rule: AutomationRule): string {
  const cfg = rule.conditionConfig ?? {};
  switch (rule.conditionType) {
    case 'always':
      return 'Sempre';
    case 'field_equals':
      return `${cfg.entity ?? '?'}.${cfg.field ?? '?'} = "${cfg.value ?? ''}"`;
    case 'value_greater_than':
      return `${cfg.entity ?? '?'}.${cfg.field ?? '?'} > ${cfg.value ?? 0}`;
    default:
      return rule.condition || rule.conditionType || 'Condição';
  }
}

function actionLabel(rule: AutomationRule): string {
  const cfg = rule.actionConfig ?? {};
  switch (rule.actionType) {
    case 'create_task':
      return `Criar tarefa: ${cfg.title ?? 'sem título'}`;
    case 'create_activity':
      return `Criar atividade (${cfg.type ?? '?'})`;
    case 'update_field':
      return `Atualizar ${cfg.entity ?? '?'}.${cfg.field ?? '?'} = "${cfg.value ?? ''}"`;
    case 'send_notification':
      return 'Enviar notificação';
    default:
      return rule.action || rule.actionType || 'Ação';
  }
}

// Generate human-readable strings for saving to API
function buildTriggerString(triggerType: string, triggerConfig: Record<string, unknown>): string {
  switch (triggerType) {
    case 'deal_stage_changed': {
      const from = triggerConfig.fromStage as string | undefined;
      const to = triggerConfig.toStage as string | undefined;
      if (from && to) return `Quando deal mudar de ${stageLabel(from)} para ${stageLabel(to)}`;
      if (to) return `Quando deal mudar para ${stageLabel(to)}`;
      if (from) return `Quando deal sair de ${stageLabel(from)}`;
      return 'Quando deal mudar de estágio';
    }
    case 'deal_created':
      return 'Quando deal for criado';
    case 'contact_created':
      return 'Quando contato for criado';
    case 'task_completed':
      return 'Quando tarefa for concluída';
    case 'lead_created':
      return 'Quando lead for criado';
    case 'lead_converted':
      return 'Quando lead for convertido';
    case 'inactivity_days': {
      const days = (triggerConfig.days as number) ?? 0;
      const entity = (triggerConfig.entity as string) === 'contact' ? 'contato' : 'deal';
      return `Quando ${entity} ficar inativo por ${days} dias`;
    }
    default:
      return triggerType;
  }
}

function buildConditionString(conditionType: string, conditionConfig: Record<string, unknown>): string {
  switch (conditionType) {
    case 'always':
      return 'Sempre';
    case 'field_equals':
      return `Se ${conditionConfig.entity}.${conditionConfig.field} = "${conditionConfig.value}"`;
    case 'value_greater_than':
      return `Se ${conditionConfig.entity}.${conditionConfig.field} > ${conditionConfig.value}`;
    default:
      return conditionType;
  }
}

function buildActionString(actionType: string, actionConfig: Record<string, unknown>): string {
  switch (actionType) {
    case 'create_task':
      return `Criar tarefa: ${actionConfig.title}`;
    case 'create_activity':
      return `Criar atividade (${actionConfig.type}): ${actionConfig.description ?? ''}`;
    case 'update_field':
      return `Atualizar ${actionConfig.entity}.${actionConfig.field} = "${actionConfig.value}"`;
    case 'send_notification':
      return `Enviar notificação: ${(actionConfig.message as string)?.slice(0, 50) ?? ''}`;
    default:
      return actionType;
  }
}

// ---------------------------------------------------------------------------
// Trigger type label for logs
// ---------------------------------------------------------------------------

function triggerTypeLabel(type: string): string {
  const map: Record<string, string> = {
    deal_stage_changed: 'Deal mudou estágio',
    deal_created: 'Deal criado',
    contact_created: 'Contato criado',
    task_completed: 'Tarefa concluída',
    lead_created: 'Lead criado',
    lead_converted: 'Lead convertido',
    inactivity_days: 'Inatividade',
  };
  return map[type] ?? type;
}

function actionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    create_task: 'Criar tarefa',
    create_activity: 'Criar atividade',
    update_field: 'Atualizar campo',
    send_notification: 'Notificação',
  };
  return map[type] ?? type;
}

// ---------------------------------------------------------------------------
// Form state types
// ---------------------------------------------------------------------------

interface FormState {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditionType: string;
  conditionConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
}

const emptyForm: FormState = {
  name: '',
  description: '',
  triggerType: 'deal_stage_changed',
  triggerConfig: {},
  conditionType: 'always',
  conditionConfig: {},
  actionType: 'create_task',
  actionConfig: { title: '', dueDays: 1, priority: 'medium', type: 'follow_up' },
};

function ruleToForm(rule: AutomationRule): FormState {
  return {
    name: rule.name,
    description: rule.description,
    triggerType: rule.triggerType,
    triggerConfig: { ...rule.triggerConfig },
    conditionType: rule.conditionType,
    conditionConfig: { ...rule.conditionConfig },
    actionType: rule.actionType,
    actionConfig: { ...rule.actionConfig },
  };
}

// ---------------------------------------------------------------------------
// AutomationModal Component
// ---------------------------------------------------------------------------

interface AutomationModalProps {
  open: boolean;
  onClose: () => void;
  editRule: AutomationRule | null;
  onSaved: () => void;
}

function AutomationModal({ open, onClose, editRule, onSaved }: AutomationModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(editRule ? ruleToForm(editRule) : { ...emptyForm, triggerConfig: {}, conditionConfig: {}, actionConfig: { title: '', dueDays: 1, priority: 'medium', type: 'follow_up' } });
      setError('');
      setSaving(false);
    }
  }, [open, editRule]);

  const updateTriggerConfig = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, triggerConfig: { ...prev.triggerConfig, [key]: value } }));
  };

  const updateConditionConfig = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, conditionConfig: { ...prev.conditionConfig, [key]: value } }));
  };

  const updateActionConfig = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, actionConfig: { ...prev.actionConfig, [key]: value } }));
  };

  const setTriggerType = (type: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      deal_stage_changed: {},
      deal_created: {},
      contact_created: {},
      task_completed: {},
      lead_created: {},
      lead_converted: {},
      inactivity_days: { days: 7, entity: 'deal' },
    };
    setForm((prev) => ({ ...prev, triggerType: type, triggerConfig: defaults[type] ?? {} }));
  };

  const setConditionType = (type: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      always: {},
      field_equals: { entity: 'deal', field: '', value: '' },
      value_greater_than: { entity: 'deal', field: '', value: 0 },
    };
    setForm((prev) => ({ ...prev, conditionType: type, conditionConfig: defaults[type] ?? {} }));
  };

  const setActionType = (type: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      create_task: { title: '', dueDays: 1, priority: 'medium', type: 'follow_up' },
      create_activity: { type: 'email', description: '' },
      update_field: { entity: 'deal', field: '', value: '' },
      send_notification: { message: '' },
    };
    setForm((prev) => ({ ...prev, actionType: type, actionConfig: defaults[type] ?? {} }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    setSaving(true);
    setError('');

    const trigger = buildTriggerString(form.triggerType, form.triggerConfig);
    const condition = buildConditionString(form.conditionType, form.conditionConfig);
    const action = buildActionString(form.actionType, form.actionConfig);

    const payload = {
      name: form.name,
      description: form.description,
      trigger,
      condition,
      action,
      triggerType: form.triggerType,
      triggerConfig: form.triggerConfig,
      conditionType: form.conditionType,
      conditionConfig: form.conditionConfig,
      actionType: form.actionType,
      actionConfig: form.actionConfig,
      enabled: editRule?.enabled ?? true,
    };

    try {
      if (editRule) {
        await api.put(`/automations/${editRule.id}`, payload);
      } else {
        await api.post('/automations', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // --- Render config sections ---

  const renderTriggerConfig = () => {
    switch (form.triggerType) {
      case 'deal_stage_changed':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelClass}>De (opcional)</label>
              <select
                className={inputClass}
                value={(form.triggerConfig.fromStage as string) ?? ''}
                onChange={(e) => updateTriggerConfig('fromStage', e.target.value || undefined)}
              >
                <option value="">Qualquer estágio</option>
                {DEAL_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Para (opcional)</label>
              <select
                className={inputClass}
                value={(form.triggerConfig.toStage as string) ?? ''}
                onChange={(e) => updateTriggerConfig('toStage', e.target.value || undefined)}
              >
                <option value="">Qualquer estágio</option>
                {DEAL_STAGES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        );
      case 'inactivity_days':
        return (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className={labelClass}>Dias de inatividade</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={(form.triggerConfig.days as number) ?? 7}
                onChange={(e) => updateTriggerConfig('days', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelClass}>Entidade</label>
              <select
                className={inputClass}
                value={(form.triggerConfig.entity as string) ?? 'deal'}
                onChange={(e) => updateTriggerConfig('entity', e.target.value)}
              >
                <option value="deal">Deal</option>
                <option value="contact">Contato</option>
              </select>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderConditionConfig = () => {
    switch (form.conditionType) {
      case 'field_equals':
        return (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className={labelClass}>Entidade</label>
              <select
                className={inputClass}
                value={(form.conditionConfig.entity as string) ?? 'deal'}
                onChange={(e) => updateConditionConfig('entity', e.target.value)}
              >
                <option value="deal">Deal</option>
                <option value="contact">Contato</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Campo</label>
              <input
                className={inputClass}
                placeholder="ex: stage, status"
                value={(form.conditionConfig.field as string) ?? ''}
                onChange={(e) => updateConditionConfig('field', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Valor</label>
              <input
                className={inputClass}
                placeholder="ex: negociacao"
                value={(form.conditionConfig.value as string) ?? ''}
                onChange={(e) => updateConditionConfig('value', e.target.value)}
              />
            </div>
          </div>
        );
      case 'value_greater_than':
        return (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className={labelClass}>Entidade</label>
              <select
                className={inputClass}
                value={(form.conditionConfig.entity as string) ?? 'deal'}
                onChange={(e) => updateConditionConfig('entity', e.target.value)}
              >
                <option value="deal">Deal</option>
                <option value="contact">Contato</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Campo</label>
              <input
                className={inputClass}
                placeholder="ex: value, score"
                value={(form.conditionConfig.field as string) ?? ''}
                onChange={(e) => updateConditionConfig('field', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Valor mínimo</label>
              <input
                type="number"
                className={inputClass}
                value={(form.conditionConfig.value as number) ?? 0}
                onChange={(e) => updateConditionConfig('value', Number(e.target.value))}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderActionConfig = () => {
    switch (form.actionType) {
      case 'create_task':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <label className={labelClass}>Título da tarefa *</label>
              <input
                className={inputClass}
                placeholder="ex: Follow up com o cliente"
                value={(form.actionConfig.title as string) ?? ''}
                onChange={(e) => updateActionConfig('title', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Prazo (dias)</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={(form.actionConfig.dueDays as number) ?? 1}
                  onChange={(e) => updateActionConfig('dueDays', Number(e.target.value))}
                />
              </div>
              <div>
                <label className={labelClass}>Prioridade</label>
                <select
                  className={inputClass}
                  value={(form.actionConfig.priority as string) ?? 'medium'}
                  onChange={(e) => updateActionConfig('priority', e.target.value)}
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Tipo</label>
                <select
                  className={inputClass}
                  value={(form.actionConfig.type as string) ?? 'follow_up'}
                  onChange={(e) => updateActionConfig('type', e.target.value)}
                >
                  <option value="follow_up">Follow Up</option>
                  <option value="call">Ligação</option>
                  <option value="meeting">Reunião</option>
                  <option value="email">Email</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 'create_activity':
        return (
          <div className="space-y-3 mt-3">
            <div>
              <label className={labelClass}>Tipo de atividade</label>
              <select
                className={inputClass}
                value={(form.actionConfig.type as string) ?? 'email'}
                onChange={(e) => updateActionConfig('type', e.target.value)}
              >
                <option value="email">Email</option>
                <option value="call">Ligação</option>
                <option value="meeting">Reunião</option>
                <option value="note">Nota</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Descrição</label>
              <textarea
                className={inputClass}
                rows={2}
                placeholder="Descrição da atividade..."
                value={(form.actionConfig.description as string) ?? ''}
                onChange={(e) => updateActionConfig('description', e.target.value)}
              />
            </div>
          </div>
        );
      case 'update_field':
        return (
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div>
              <label className={labelClass}>Entidade</label>
              <select
                className={inputClass}
                value={(form.actionConfig.entity as string) ?? 'deal'}
                onChange={(e) => updateActionConfig('entity', e.target.value)}
              >
                <option value="deal">Deal</option>
                <option value="contact">Contato</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Campo</label>
              <input
                className={inputClass}
                placeholder="ex: stage"
                value={(form.actionConfig.field as string) ?? ''}
                onChange={(e) => updateActionConfig('field', e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Novo valor</label>
              <input
                className={inputClass}
                placeholder="ex: negociacao"
                value={(form.actionConfig.value as string) ?? ''}
                onChange={(e) => updateActionConfig('value', e.target.value)}
              />
            </div>
          </div>
        );
      case 'send_notification':
        return (
          <div className="mt-3">
            <label className={labelClass}>Mensagem *</label>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="Mensagem da notificação..."
              value={(form.actionConfig.message as string) ?? ''}
              onChange={(e) => updateActionConfig('message', e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editRule ? 'Editar Regra' : 'Nova Regra de Automação'} width="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name & Description */}
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nome da regra *</label>
            <input
              className={inputClass}
              placeholder="ex: Follow-up automático"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <label className={labelClass}>Descrição</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Descreva o que esta regra faz..."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Section 1: Trigger (QUANDO) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-50 dark:bg-purple-950/30 border-l-4 border-l-purple-500">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-800 dark:text-purple-300">QUANDO</p>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70">Quando isto acontecer...</p>
            </div>
          </div>
          <div className="p-4">
            <select
              className={inputClass}
              value={form.triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
            >
              <option value="deal_stage_changed">Deal mudar de estágio</option>
              <option value="deal_created">Deal criado</option>
              <option value="contact_created">Contato criado</option>
              <option value="task_completed">Tarefa concluída</option>
              <option value="lead_created">Lead criado</option>
              <option value="lead_converted">Lead convertido</option>
              <option value="inactivity_days">Inatividade por X dias</option>
            </select>
            {renderTriggerConfig()}
          </div>
        </div>

        {/* Arrow between sections */}
        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-slate-300 dark:text-slate-600" />
        </div>

        {/* Section 2: Condition (SE) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-l-amber-500">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <Filter className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">SE</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Se esta condição for verdadeira...</p>
            </div>
          </div>
          <div className="p-4">
            <select
              className={inputClass}
              value={form.conditionType}
              onChange={(e) => setConditionType(e.target.value)}
            >
              <option value="always">Sempre</option>
              <option value="field_equals">Campo igual a</option>
              <option value="value_greater_than">Valor maior que</option>
            </select>
            {renderConditionConfig()}
          </div>
        </div>

        {/* Arrow between sections */}
        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-slate-300 dark:text-slate-600" />
        </div>

        {/* Section 3: Action (ENTÃO) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-l-blue-500">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">ENTÃO</p>
              <p className="text-xs text-blue-600/70 dark:text-blue-400/70">Executar esta ação...</p>
            </div>
          </div>
          <div className="p-4">
            <select
              className={inputClass}
              value={form.actionType}
              onChange={(e) => setActionType(e.target.value)}
            >
              <option value="create_task">Criar tarefa</option>
              <option value="create_activity">Criar atividade</option>
              <option value="update_field">Atualizar campo</option>
              <option value="send_notification">Enviar notificação</option>
            </select>
            {renderActionConfig()}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {editRule ? 'Salvar Alterações' : 'Criar Regra'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Automations Page
// ---------------------------------------------------------------------------

type Tab = 'rules' | 'logs';

export default function Automations() {
  const { hasPermission } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('rules');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editRule, setEditRule] = useState<AutomationRule | null>(null);

  // Hover state for card actions
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const { automations } = await api.get<{ automations: AutomationRule[] }>('/automations');
      setRules(automations);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { logs: data } = await api.get<{ logs: AutomationLog[] }>('/automations/logs');
      setLogs(data);
    } catch {
      // silently fail
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    if (activeTab === 'logs' && logs.length === 0) {
      fetchLogs();
    }
  }, [activeTab, logs.length, fetchLogs]);

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    try {
      await api.put(`/automations/${id}`, { enabled: !rule.enabled });
    } catch {
      setRules((prev) =>
        prev.map((r) => (r.id === id ? { ...r, enabled: rule.enabled } : r))
      );
    }
  };

  const deleteRule = async (rule: AutomationRule) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir a regra "${rule.name}"?`);
    if (!confirmed) return;
    try {
      await api.del(`/automations/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch {
      // silently fail
    }
  };

  const openCreate = () => {
    setEditRule(null);
    setShowModal(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setEditRule(rule);
    setShowModal(true);
  };

  const onSaved = () => {
    fetchRules();
  };

  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + r.executions, 0);

  if (loading) return <LoadingSpinner />;

  const recentLogs = logs.slice(0, 10);

  return (
    <div>
      <Header title="Automações" subtitle="Regras de automação de vendas" />

      <div className="p-8 space-y-6">
        {/* Stats bar + New Rule button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-purple)' }}
              >
                <Zap className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {enabledCount} ativas
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  de {rules.length} regras
                </p>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-blue)' }}
              >
                <Hash className="w-4 h-4" style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {totalExecutions}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">execuções totais</p>
              </div>
            </div>
          </div>

          {hasPermission('automations.create') && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Regra
            </button>
          )}
        </div>

        {/* Tabs: Regras | Logs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'rules'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Regras
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            Logs
          </button>
        </div>

        {/* Tab: Rules */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            {rules.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhuma regra de automação</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Clique em "Nova Regra" para criar sua primeira automação.</p>
              </div>
            )}

            {rules.map((rule) => (
              <div
                key={rule.id}
                className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
                style={{ opacity: rule.enabled ? 1 : 0.55 }}
                onMouseEnter={() => setHoveredCard(rule.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: rule.enabled
                            ? 'var(--tint-purple)'
                            : 'var(--surface-secondary)',
                          color: rule.enabled ? '#8b5cf6' : '#94a3b8',
                        }}
                      >
                        {rule.enabled ? (
                          <Play className="w-5 h-5" />
                        ) : (
                          <Pause className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {rule.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-xl">
                          {rule.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {/* Edit & Delete buttons - visible on hover */}
                      <div
                        className={`flex items-center gap-1 transition-opacity ${
                          hoveredCard === rule.id ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        {hasPermission('automations.create') && (
                          <button
                            onClick={() => openEdit(rule)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            title="Editar regra"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('automations.create') && (
                          <button
                            onClick={() => deleteRule(rule)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-slate-400 hover:text-red-500"
                            title="Excluir regra"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Toggle switch */}
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className="relative shrink-0"
                        aria-label={rule.enabled ? 'Desativar regra' : 'Ativar regra'}
                      >
                        <div
                          className="w-11 h-6 rounded-full transition-colors"
                          style={{
                            backgroundColor: rule.enabled ? '#8b5cf6' : 'var(--text-muted)',
                          }}
                        />
                        <div
                          className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          style={{
                            transform: rule.enabled
                              ? 'translateX(22px)'
                              : 'translateX(2px)',
                          }}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Enhanced pills */}
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--tint-purple, #f3e8ff)',
                        color: '#7c3aed',
                      }}
                    >
                      <Zap className="w-3 h-3" />
                      {triggerLabel(rule)}
                    </div>

                    <ArrowRight
                      className="w-4 h-4 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    />

                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--tint-amber, #fef3c7)',
                        color: '#92400e',
                      }}
                    >
                      <ChevronRight className="w-3 h-3" />
                      {conditionLabel(rule)}
                    </div>

                    <ArrowRight
                      className="w-4 h-4 shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                    />

                    <div
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        backgroundColor: 'var(--tint-blue, #dbeafe)',
                        color: '#1e40af',
                      }}
                    >
                      <Play className="w-3 h-3" />
                      {actionLabel(rule)}
                    </div>
                  </div>

                  {/* Stats footer */}
                  <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Hash className="w-3.5 h-3.5" />
                      <span>
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {rule.executions}
                        </span>{' '}
                        execuções
                      </span>
                    </div>
                    {rule.lastTriggered && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Último disparo:{' '}
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            {formatDate(rule.lastTriggered)}
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="ml-auto">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: rule.enabled
                            ? 'var(--tint-green)'
                            : 'var(--surface-secondary)',
                          color: rule.enabled ? '#16a34a' : '#94a3b8',
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: rule.enabled ? '#22c55e' : '#94a3b8',
                          }}
                        />
                        {rule.enabled ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Logs */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-7 h-7 text-slate-300 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Nenhum log disponível</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Os logs aparecerão quando as automações forem executadas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Regra
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Gatilho
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Resultado
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {recentLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {log.ruleName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {triggerTypeLabel(log.triggerType)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {actionTypeLabel(log.actionType)}
                        </td>
                        <td className="px-4 py-3">
                          {log.result === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Sucesso
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">
                              <XCircle className="w-3 h-3" />
                              Erro
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs">
                          {formatDate(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Refresh button */}
            {!logsLoading && recentLogs.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                  onClick={fetchLogs}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  Atualizar logs
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Automation Modal */}
      <AutomationModal
        open={showModal}
        onClose={() => setShowModal(false)}
        editRule={editRule}
        onSaved={onSaved}
      />
    </div>
  );
}
