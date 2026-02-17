import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  Phone,
  CheckSquare,
  Linkedin,
  Sparkles,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import Modal from './Modal';
import { api } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CadenceStatus = 'draft' | 'active' | 'paused' | 'archived';
export type CadenceChannel = 'email' | 'whatsapp' | 'call' | 'task' | 'linkedin_manual';

export interface CadenceStep {
  id: string;
  cadenceId: string;
  stepOrder: number;
  delayDays: number;
  delayHours: number;
  channel: CadenceChannel;
  templateSubject: string;
  templateBody: string;
  conditionSkip: Record<string, unknown>;
  createdAt: string;
}

export interface Cadence {
  id: string;
  name: string;
  description: string;
  status: CadenceStatus;
  createdBy: string;
  totalEnrolled: number;
  totalCompleted: number;
  totalReplied: number;
  steps?: CadenceStep[];
  stepCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CadenceBuilderProps {
  open: boolean;
  onClose: () => void;
  editCadence: Cadence | null;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Step form type
// ---------------------------------------------------------------------------

interface StepForm {
  id?: string;
  stepOrder: number;
  delayDays: number;
  delayHours: number;
  channel: CadenceChannel;
  templateSubject: string;
  templateBody: string;
}

// ---------------------------------------------------------------------------
// Channel configuration
// ---------------------------------------------------------------------------

interface ChannelConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

const channelMap: Record<CadenceChannel, ChannelConfig> = {
  email: {
    label: 'E-mail',
    icon: Mail,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-900/30',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageSquare,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50',
    darkBgColor: 'dark:bg-green-900/30',
  },
  call: {
    label: 'Ligacao',
    icon: Phone,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50',
    darkBgColor: 'dark:bg-amber-900/30',
  },
  task: {
    label: 'Tarefa',
    icon: CheckSquare,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50',
    darkBgColor: 'dark:bg-slate-800/50',
  },
  linkedin_manual: {
    label: 'LinkedIn',
    icon: Linkedin,
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-50',
    darkBgColor: 'dark:bg-sky-900/30',
  },
};

const channels: CadenceChannel[] = ['email', 'whatsapp', 'call', 'task', 'linkedin_manual'];

// ---------------------------------------------------------------------------
// Default step
// ---------------------------------------------------------------------------

const createDefaultStep = (order: number, delayDays = 0): StepForm => ({
  stepOrder: order,
  delayDays,
  delayHours: 0,
  channel: 'email',
  templateSubject: '',
  templateBody: '',
});

// ---------------------------------------------------------------------------
// Helper: format delay label
// ---------------------------------------------------------------------------

function formatDelay(days: number, hours: number): string {
  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'dia' : 'dias'}`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (parts.length === 0) return 'Imediato';
  return `+${parts.join(', ')}`;
}

// ---------------------------------------------------------------------------
// Shared CSS classes
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CadenceBuilder({ open, onClose, editCadence, onSaved }: CadenceBuilderProps) {
  const isEdit = !!editCadence;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState<StepForm[]>([createDefaultStep(1)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [aiLoadingStep, setAiLoadingStep] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // ---------------------------------------------------------------------------
  // Load cadence data when editing
  // ---------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setSteps([createDefaultStep(1)]);
    setSaving(false);
    setError('');
    setAiLoadingStep(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    if (editCadence) {
      setLoading(true);
      setError('');
      api
        .get<Cadence>(`/cadences/${editCadence.id}`)
        .then((cadence) => {
          setName(cadence.name);
          setDescription(cadence.description || '');
          if (cadence.steps && cadence.steps.length > 0) {
            const mapped: StepForm[] = cadence.steps
              .sort((a, b) => a.stepOrder - b.stepOrder)
              .map((s) => ({
                id: s.id,
                stepOrder: s.stepOrder,
                delayDays: s.delayDays,
                delayHours: s.delayHours,
                channel: s.channel,
                templateSubject: s.templateSubject || '',
                templateBody: s.templateBody || '',
              }));
            setSteps(mapped);
          } else {
            setSteps([createDefaultStep(1)]);
          }
        })
        .catch((err) => {
          setError(`Erro ao carregar cadencia: ${err.message}`);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      resetForm();
    }
  }, [open, editCadence, resetForm]);

  // ---------------------------------------------------------------------------
  // Step manipulation
  // ---------------------------------------------------------------------------

  const addStep = () => {
    setSteps((prev) => [...prev, createDefaultStep(prev.length + 1, 1)]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.map((s, i) => ({ ...s, stepOrder: i + 1 }));
    });
  };

  const updateStep = (index: number, field: keyof StepForm, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        return { ...s, [field]: value };
      }),
    );
  };

  // ---------------------------------------------------------------------------
  // AI generation
  // ---------------------------------------------------------------------------

  const generateWithAI = async (index: number) => {
    const step = steps[index];
    setAiLoadingStep(index);
    setError('');

    const typeMapping: Record<CadenceChannel, string> = {
      email: index === 0 ? 'email' : 'follow_up',
      whatsapp: 'whatsapp',
      call: 'follow_up',
      task: 'follow_up',
      linkedin_manual: 'follow_up',
    };

    try {
      const response = await api.post<{
        subject?: string;
        body?: string;
        message?: string;
      }>('/ai/generate-message', {
        type: typeMapping[step.channel],
        context: {
          nome: 'Prospect',
          empresa: 'Empresa',
          cargo: 'Decisor',
          nicho: 'Tecnologia',
          dor: 'Precisa melhorar processos',
        },
      });

      setSteps((prev) =>
        prev.map((s, i) => {
          if (i !== index) return s;
          return {
            ...s,
            templateSubject: response.subject || s.templateSubject,
            templateBody: response.body || response.message || s.templateBody,
          };
        }),
      );
    } catch {
      setError('Configure a chave da API Anthropic nas configuracoes');
    } finally {
      setAiLoadingStep(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const handleSave = async () => {
    setError('');

    // Validation
    if (!name.trim()) {
      setError('O nome da cadencia e obrigatorio.');
      return;
    }
    if (steps.length === 0) {
      setError('Adicione pelo menos um passo.');
      return;
    }
    const emptyBodyStep = steps.findIndex((s) => !s.templateBody.trim());
    if (emptyBodyStep >= 0) {
      setError(`O passo ${emptyBodyStep + 1} precisa ter um conteudo/template.`);
      return;
    }

    setSaving(true);

    const stepsPayload = steps.map((s, i) => ({
      stepOrder: i + 1,
      delayDays: Number(s.delayDays) || 0,
      delayHours: Number(s.delayHours) || 0,
      channel: s.channel,
      templateSubject: s.templateSubject,
      templateBody: s.templateBody,
    }));

    try {
      if (isEdit && editCadence) {
        await api.put(`/cadences/${editCadence.id}`, {
          name: name.trim(),
          description: description.trim(),
          steps: stepsPayload,
        });
      } else {
        await api.post('/cadences', {
          name: name.trim(),
          description: description.trim(),
          status: 'draft' as CadenceStatus,
          steps: stepsPayload,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar cadencia';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Channel selector dropdown
  // ---------------------------------------------------------------------------

  const renderChannelSelector = (step: StepForm, index: number) => {
    const config = channelMap[step.channel];
    const Icon = config.icon;

    return (
      <div className="relative">
        <select
          value={step.channel}
          onChange={(e) => updateStep(index, 'channel', e.target.value as CadenceChannel)}
          className={`appearance-none pl-9 pr-8 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 ${config.bgColor} ${config.darkBgColor} ${config.color} focus:outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer transition-all`}
        >
          {channels.map((ch) => (
            <option key={ch} value={ch}>
              {channelMap[ch].label}
            </option>
          ))}
        </select>
        <Icon className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${config.color} pointer-events-none`} />
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Template editor per channel
  // ---------------------------------------------------------------------------

  const renderTemplateEditor = (step: StepForm, index: number) => {
    const isAiLoading = aiLoadingStep === index;

    if (step.channel === 'email') {
      return (
        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>Assunto</label>
            <input
              value={step.templateSubject}
              onChange={(e) => updateStep(index, 'templateSubject', e.target.value)}
              placeholder="Assunto do e-mail..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Corpo do e-mail</label>
            <textarea
              value={step.templateBody}
              onChange={(e) => updateStep(index, 'templateBody', e.target.value)}
              placeholder="Escreva o corpo do e-mail ou gere com IA..."
              rows={4}
              className={inputClass}
            />
          </div>
          {renderAiButton(index, isAiLoading)}
        </div>
      );
    }

    if (step.channel === 'whatsapp') {
      return (
        <div className="mt-3 space-y-3">
          <div>
            <label className={labelClass}>Mensagem</label>
            <textarea
              value={step.templateBody}
              onChange={(e) => updateStep(index, 'templateBody', e.target.value)}
              placeholder="Escreva a mensagem do WhatsApp ou gere com IA..."
              rows={4}
              className={inputClass}
            />
          </div>
          {renderAiButton(index, isAiLoading)}
        </div>
      );
    }

    // call, task, linkedin_manual
    return (
      <div className="mt-3 space-y-3">
        <div>
          <label className={labelClass}>Instrucoes</label>
          <textarea
            value={step.templateBody}
            onChange={(e) => updateStep(index, 'templateBody', e.target.value)}
            placeholder="Instrucoes para o vendedor..."
            rows={3}
            className={inputClass}
          />
        </div>
        {renderAiButton(index, isAiLoading)}
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: AI generation button
  // ---------------------------------------------------------------------------

  const renderAiButton = (index: number, isLoading: boolean) => (
    <button
      type="button"
      onClick={() => generateWithAI(index)}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
        ${
          isLoading
            ? 'border-violet-300 dark:border-violet-700 text-violet-400 dark:text-violet-500 cursor-wait'
            : 'border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:border-violet-300 dark:hover:border-violet-700'
        }`}
    >
      <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-pulse' : ''}`} />
      {isLoading ? 'Gerando...' : 'Gerar com IA'}
    </button>
  );

  // ---------------------------------------------------------------------------
  // Render: Step card
  // ---------------------------------------------------------------------------

  const renderStepCard = (step: StepForm, index: number) => {
    const config = channelMap[step.channel];

    return (
      <div key={index} className="relative">
        {/* Delay indicator between steps */}
        {index > 0 && (
          <div className="flex items-center gap-2 ml-5 mb-3">
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600" />
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              {formatDelay(step.delayDays, step.delayHours)}
            </div>
          </div>
        )}

        {/* Step card */}
        <div className="flex gap-3">
          {/* Step number badge */}
          <div className="flex-shrink-0 mt-1">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md"
              style={{ backgroundColor: '#7c3aed' }}
            >
              {index + 1}
            </div>
            {/* Vertical line connector */}
            {index < steps.length - 1 && (
              <div className="w-px h-full bg-slate-300 dark:bg-slate-600 mx-auto mt-1" />
            )}
          </div>

          {/* Card body */}
          <div className="flex-1 min-w-0 mb-2">
            <div className={`rounded-xl border border-slate-200 dark:border-slate-700 ${config.bgColor}/30 ${config.darkBgColor} p-4 transition-all`}>
              {/* Header row */}
              <div className="flex flex-wrap items-center gap-3 mb-1">
                {/* Channel selector */}
                {renderChannelSelector(step, index)}

                {/* Delay inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={step.delayDays}
                      onChange={(e) => updateStep(index, 'delayDays', Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-16 px-2 py-2 text-sm text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-slate-800 dark:text-slate-100 transition-all"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">dias</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={step.delayHours}
                      onChange={(e) => updateStep(index, 'delayHours', Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                      className="w-16 px-2 py-2 text-sm text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-slate-800 dark:text-slate-100 transition-all"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">horas</span>
                  </div>
                </div>

                {/* Cumulative day label */}
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto hidden sm:inline">
                  Dia {steps.slice(0, index + 1).reduce((sum, s) => sum + s.delayDays, 0)}
                </span>

                {/* Delete button */}
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Remover passo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Template editor */}
              {renderTemplateEditor(step, index)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Render: Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <Modal open={open} onClose={onClose} title="Carregando..." width="max-w-4xl">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-violet-200 dark:border-violet-800 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
          <span className="ml-3 text-sm text-slate-500 dark:text-slate-400">
            Carregando cadencia...
          </span>
        </div>
      </Modal>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Cadencia' : 'Nova Cadencia'}
      width="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Top section: Name + Description */}
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Nome da cadencia *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Prospecao Outbound - SaaS B2B"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Descricao</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo desta cadencia..."
              rows={2}
              className={inputClass}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700" />

        {/* Steps section header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Passos da Cadencia
            <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
              ({steps.length} {steps.length === 1 ? 'passo' : 'passos'})
            </span>
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Duracao total: {steps.reduce((sum, s) => sum + s.delayDays, 0)} dias
          </span>
        </div>

        {/* Steps timeline */}
        <div className="relative">
          {steps.map((step, index) => renderStepCard(step, index))}
        </div>

        {/* Add step button */}
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-2 w-full justify-center py-3 px-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-violet-400 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Adicionar Passo
        </button>

        {/* Error display */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#7c3aed' }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </span>
            ) : isEdit ? (
              'Salvar Alteracoes'
            ) : (
              'Criar Cadencia'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
