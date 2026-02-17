import { useState, useEffect, useCallback } from 'react';
import {
  Rocket,
  Users,
  Play,
  Pause,
  MessageSquare,
  Mail,
  Phone,
  CheckSquare,
  Linkedin,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Clock,
  Hash,
  RefreshCw,
  Eye,
  Brain,
} from 'lucide-react';
import Header from '../layouts/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import CadenceBuilder from '../components/CadenceBuilder';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type {
  Cadence,
  CadenceStep,
  CadenceEnrollment,
  CadenceStatus,
  CadenceChannel,
  EnrollmentStatus,
} from '../data/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function channelIcon(channel: CadenceChannel) {
  switch (channel) {
    case 'email':
      return Mail;
    case 'whatsapp':
      return MessageSquare;
    case 'call':
      return Phone;
    case 'task':
      return CheckSquare;
    case 'linkedin_manual':
      return Linkedin;
    default:
      return Mail;
  }
}

function channelLabel(channel: CadenceChannel): string {
  switch (channel) {
    case 'email':
      return 'E-mail';
    case 'whatsapp':
      return 'WhatsApp';
    case 'call':
      return 'Ligação';
    case 'task':
      return 'Tarefa';
    case 'linkedin_manual':
      return 'LinkedIn';
    default:
      return channel;
  }
}

function statusColor(status: CadenceStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'active':
      return { bg: 'var(--tint-green, #dcfce7)', text: '#16a34a', dot: '#22c55e' };
    case 'paused':
      return { bg: 'var(--tint-amber, #fef3c7)', text: '#92400e', dot: '#f59e0b' };
    case 'draft':
      return { bg: 'var(--surface-secondary, #f1f5f9)', text: '#64748b', dot: '#94a3b8' };
    case 'archived':
      return { bg: 'var(--surface-secondary, #f1f5f9)', text: '#94a3b8', dot: '#cbd5e1' };
    default:
      return { bg: 'var(--surface-secondary, #f1f5f9)', text: '#64748b', dot: '#94a3b8' };
  }
}

function statusLabel(status: CadenceStatus): string {
  switch (status) {
    case 'active':
      return 'Ativa';
    case 'paused':
      return 'Pausada';
    case 'draft':
      return 'Rascunho';
    case 'archived':
      return 'Arquivada';
    default:
      return status;
  }
}

function enrollmentStatusColor(status: EnrollmentStatus): { bg: string; text: string; dot: string } {
  switch (status) {
    case 'active':
      return { bg: 'var(--tint-green, #dcfce7)', text: '#16a34a', dot: '#22c55e' };
    case 'paused':
      return { bg: 'var(--tint-amber, #fef3c7)', text: '#92400e', dot: '#f59e0b' };
    case 'completed':
      return { bg: 'var(--tint-blue, #dbeafe)', text: '#1e40af', dot: '#3b82f6' };
    case 'replied':
      return { bg: 'var(--tint-purple, #f3e8ff)', text: '#7c3aed', dot: '#8b5cf6' };
    case 'bounced':
      return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' };
    case 'unsubscribed':
      return { bg: 'var(--surface-secondary, #f1f5f9)', text: '#94a3b8', dot: '#cbd5e1' };
    default:
      return { bg: 'var(--surface-secondary, #f1f5f9)', text: '#64748b', dot: '#94a3b8' };
  }
}

function enrollmentStatusLabel(status: EnrollmentStatus): string {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'paused':
      return 'Pausado';
    case 'completed':
      return 'Completou';
    case 'replied':
      return 'Respondeu';
    case 'bounced':
      return 'Bounced';
    case 'unsubscribed':
      return 'Descadastrado';
    default:
      return status;
  }
}

function classificationBadge(classification: string | undefined): { label: string; bg: string; color: string } | null {
  if (!classification) return null;
  const map: Record<string, { label: string; bg: string; color: string }> = {
    interested: { label: 'Interessado', bg: '#dcfce7', color: '#16a34a' },
    not_interested: { label: 'Sem interesse', bg: '#fee2e2', color: '#dc2626' },
    meeting_request: { label: 'Reunião', bg: '#f3e8ff', color: '#7c3aed' },
    proposal_request: { label: 'Proposta', bg: '#dbeafe', color: '#2563eb' },
    out_of_office: { label: 'Ausente', bg: '#f1f5f9', color: '#64748b' },
    unsubscribe: { label: 'Descadastrou', bg: '#1e293b', color: '#f8fafc' },
    other: { label: 'Outro', bg: '#fef9c3', color: '#92400e' },
  };
  return map[classification] || null;
}

// ---------------------------------------------------------------------------
// Stats overview type
// ---------------------------------------------------------------------------

interface CadenceStatsOverview {
  activeCadences: number;
  totalEnrolled: number;
  totalActive: number;
  totalReplied: number;
  totalCompleted: number;
  replyRate: number;
}

// ---------------------------------------------------------------------------
// Main Cadences Page
// ---------------------------------------------------------------------------

type Tab = 'cadences' | 'enrollments';

export default function Cadences() {
  const { hasPermission } = useAuth();
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<CadenceEnrollment[]>([]);
  const [stats, setStats] = useState<CadenceStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('cadences');

  // CadenceBuilder modal
  const [showBuilder, setShowBuilder] = useState(false);
  const [editCadence, setEditCadence] = useState<Cadence | null>(null);

  // Card hover
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Expanded cadence for inline enrollments
  const [expandedCadence, setExpandedCadence] = useState<string | null>(null);
  const [expandedEnrollments, setExpandedEnrollments] = useState<CadenceEnrollment[]>([]);
  const [expandedLoading, setExpandedLoading] = useState(false);

  const [classifications, setClassifications] = useState<Record<string, { classification: string; confidence: number; aiReasoning: string }>>({});

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<{ stats: CadenceStatsOverview }>('/cadences/stats/overview');
      setStats(data.stats);
    } catch {
      // silently fail
    }
  }, []);

  const fetchCadences = useCallback(async () => {
    try {
      const { cadences: data } = await api.get<{ cadences: Cadence[] }>('/cadences');
      setCadences(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true);
    try {
      // Fetch enrollments for all cadences
      const results: CadenceEnrollment[] = [];
      for (const cadence of cadences) {
        try {
          const { enrollments } = await api.get<{ enrollments: CadenceEnrollment[] }>(
            `/cadences/${cadence.id}/enrollments`
          );
          results.push(...enrollments);
        } catch {
          // skip this cadence
        }
      }
      setAllEnrollments(results);
    } catch {
      // silently fail
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [cadences]);

  const fetchExpandedEnrollments = useCallback(async (cadenceId: string) => {
    setExpandedLoading(true);
    try {
      const { enrollments } = await api.get<{ enrollments: CadenceEnrollment[] }>(
        `/cadences/${cadenceId}/enrollments`
      );
      setExpandedEnrollments(enrollments);
    } catch {
      setExpandedEnrollments([]);
    } finally {
      setExpandedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCadences();
    fetchStats();
  }, [fetchCadences, fetchStats]);

  useEffect(() => {
    if (activeTab === 'enrollments' && allEnrollments.length === 0 && cadences.length > 0) {
      fetchAllEnrollments();
    }
  }, [activeTab, allEnrollments.length, cadences.length, fetchAllEnrollments]);

  const fetchClassifications = useCallback(async () => {
    try {
      const data = await api.get<{ classifications: Array<{ enrollmentId: string; classification: string; confidence: number; aiReasoning: string }> }>('/reply-classification/recent?limit=200');
      const map: Record<string, { classification: string; confidence: number; aiReasoning: string }> = {};
      for (const c of data.classifications) {
        map[c.enrollmentId] = { classification: c.classification, confidence: c.confidence, aiReasoning: c.aiReasoning };
      }
      setClassifications(map);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'enrollments' || expandedCadence) {
      fetchClassifications();
    }
  }, [activeTab, expandedCadence, fetchClassifications]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const toggleCadenceStatus = async (cadence: Cadence) => {
    const newStatus: CadenceStatus = cadence.status === 'active' ? 'paused' : 'active';
    // Optimistic update
    setCadences((prev) =>
      prev.map((c) => (c.id === cadence.id ? { ...c, status: newStatus } : c))
    );
    try {
      await api.put(`/cadences/${cadence.id}`, { status: newStatus });
      fetchStats();
    } catch {
      // Revert
      setCadences((prev) =>
        prev.map((c) => (c.id === cadence.id ? { ...c, status: cadence.status } : c))
      );
    }
  };

  const deleteCadence = async (cadence: Cadence) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir a cadência "${cadence.name}"?`);
    if (!confirmed) return;
    try {
      await api.del(`/cadences/${cadence.id}`);
      setCadences((prev) => prev.filter((c) => c.id !== cadence.id));
      if (expandedCadence === cadence.id) {
        setExpandedCadence(null);
        setExpandedEnrollments([]);
      }
      fetchStats();
    } catch {
      // silently fail
    }
  };

  const openCreate = () => {
    setEditCadence(null);
    setShowBuilder(true);
  };

  const openEdit = (cadence: Cadence) => {
    setEditCadence(cadence);
    setShowBuilder(true);
  };

  const handleCardClick = (cadenceId: string) => {
    if (expandedCadence === cadenceId) {
      setExpandedCadence(null);
      setExpandedEnrollments([]);
    } else {
      setExpandedCadence(cadenceId);
      fetchExpandedEnrollments(cadenceId);
    }
  };

  const pauseEnrollment = async (enrollment: CadenceEnrollment) => {
    // Optimistic UI update
    const updateEnrollment = (list: CadenceEnrollment[]) =>
      list.map((e) => (e.id === enrollment.id ? { ...e, status: 'paused' as EnrollmentStatus } : e));
    setExpandedEnrollments(updateEnrollment);
    setAllEnrollments(updateEnrollment);
    try {
      await api.put(`/cadences/enrollments/${enrollment.id}/pause`);
    } catch {
      // Revert
      const revert = (list: CadenceEnrollment[]) =>
        list.map((e) => (e.id === enrollment.id ? { ...e, status: enrollment.status } : e));
      setExpandedEnrollments(revert);
      setAllEnrollments(revert);
    }
  };

  const resumeEnrollment = async (enrollment: CadenceEnrollment) => {
    // Optimistic UI update
    const updateEnrollment = (list: CadenceEnrollment[]) =>
      list.map((e) => (e.id === enrollment.id ? { ...e, status: 'active' as EnrollmentStatus } : e));
    setExpandedEnrollments(updateEnrollment);
    setAllEnrollments(updateEnrollment);
    try {
      await api.put(`/cadences/enrollments/${enrollment.id}/resume`);
    } catch {
      // Revert
      const revert = (list: CadenceEnrollment[]) =>
        list.map((e) => (e.id === enrollment.id ? { ...e, status: enrollment.status } : e));
      setExpandedEnrollments(revert);
      setAllEnrollments(revert);
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  const renderStepTimeline = (steps: CadenceStep[] | undefined, stepCount: number | undefined) => {
    if (!steps || steps.length === 0) {
      return (
        <span className="text-xs text-slate-400 dark:text-slate-500">
          {stepCount ?? 0} etapa{(stepCount ?? 0) !== 1 ? 's' : ''}
        </span>
      );
    }
    const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);
    return (
      <div className="flex items-center gap-1">
        {sorted.map((step, i) => {
          const Icon = channelIcon(step.channel);
          return (
            <div key={step.id} className="flex items-center gap-1">
              <div
                className="w-6 h-6 rounded flex items-center justify-center"
                style={{ backgroundColor: 'var(--surface-secondary, #f1f5f9)' }}
                title={`${step.stepOrder}. ${channelLabel(step.channel)}`}
              >
                <Icon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
              </div>
              {i < sorted.length - 1 && (
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEnrollmentRow = (enrollment: CadenceEnrollment, showCadenceName?: boolean) => {
    const eColor = enrollmentStatusColor(enrollment.status);
    const personName = enrollment.leadName || enrollment.contactName || '(sem nome)';
    const personEmail = enrollment.leadEmail || enrollment.contactEmail || '';
    const cadenceName = cadences.find((c) => c.id === enrollment.cadenceId)?.name ?? '';
    const cadenceObj = cadences.find((c) => c.id === enrollment.cadenceId);
    const totalSteps = cadenceObj?.stepCount ?? cadenceObj?.steps?.length ?? '?';

    return (
      <tr
        key={enrollment.id}
        className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
      >
        <td className="px-4 py-3">
          <div>
            <span className="font-medium text-slate-700 dark:text-slate-200 text-sm">
              {personName}
            </span>
            {personEmail && (
              <p className="text-xs text-slate-400 dark:text-slate-500">{personEmail}</p>
            )}
          </div>
        </td>
        {showCadenceName && (
          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
            {cadenceName}
          </td>
        )}
        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium">{enrollment.currentStep}</span>
          <span className="text-slate-400 dark:text-slate-500"> / {totalSteps}</span>
        </td>
        <td className="px-4 py-3">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: eColor.bg, color: eColor.text }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: eColor.dot }}
            />
            {enrollmentStatusLabel(enrollment.status)}
          </span>
        </td>
        <td className="px-4 py-3">
          {(() => {
            const cls = classifications[enrollment.id];
            const badge = classificationBadge(cls?.classification);
            if (!badge) return <span className="text-xs text-slate-300 dark:text-slate-600">-</span>;
            return (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help"
                style={{ backgroundColor: badge.bg, color: badge.color }}
                title={cls?.aiReasoning || ''}
              >
                <Brain className="w-3 h-3" />
                {badge.label}
              </span>
            );
          })()}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
          {enrollment.startedAt ? formatDate(enrollment.startedAt) : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
          {enrollment.lastStepAt ? formatDate(enrollment.lastStepAt) : '-'}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
          {enrollment.nextStepDue ? formatDate(enrollment.nextStepDue) : '-'}
        </td>
        <td className="px-4 py-3">
          {enrollment.status === 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                pauseEnrollment(enrollment);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-slate-400 hover:text-amber-600"
              title="Pausar inscrição"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
          {enrollment.status === 'paused' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                resumeEnrollment(enrollment);
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors text-slate-400 hover:text-green-600"
              title="Retomar inscrição"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
        </td>
      </tr>
    );
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) return <LoadingSpinner />;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div>
      <Header title="Cadências" subtitle="Motor de prospecção outbound - sequências multicanal" />

      <div className="p-8 space-y-6">
        {/* Stats bar + Nova Cadência button */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Active cadences */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-purple, #f3e8ff)' }}
              >
                <Rocket className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {stats?.activeCadences ?? 0} ativas
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  de {cadences.length} cadências
                </p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />

            {/* Total enrolled */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-blue, #dbeafe)' }}
              >
                <Users className="w-4 h-4" style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {stats?.totalEnrolled ?? 0}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">total inscritos</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />

            {/* Active enrollments */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-green, #dcfce7)' }}
              >
                <Play className="w-4 h-4" style={{ color: '#16a34a' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {stats?.totalActive ?? 0}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">em andamento</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />

            {/* Replied */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-amber, #fef3c7)' }}
              >
                <MessageSquare className="w-4 h-4" style={{ color: '#d97706' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {stats?.totalReplied ?? 0}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">responderam</p>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-600" />

            {/* Response rate */}
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--tint-purple, #f3e8ff)' }}
              >
                <TrendingUp className="w-4 h-4" style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {stats?.replyRate != null ? `${stats.replyRate.toFixed(1)}%` : '0%'}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">taxa de resposta</p>
              </div>
            </div>
          </div>

          {hasPermission('cadences.create') && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Cadência
            </button>
          )}
        </div>

        {/* Tabs: Cadências | Inscrições */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('cadences')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'cadences'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Rocket className="w-4 h-4" />
            Cadências
          </button>
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'enrollments'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Inscrições
          </button>
        </div>

        {/* ================================================================ */}
        {/* Tab: Cadências                                                    */}
        {/* ================================================================ */}
        {activeTab === 'cadences' && (
          <div className="space-y-4">
            {cadences.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Nenhuma cadência criada
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Clique em "Nova Cadência" para criar sua primeira sequência de prospecção.
                </p>
              </div>
            )}

            {cadences.map((cadence) => {
              const sColor = statusColor(cadence.status);
              const isExpanded = expandedCadence === cadence.id;
              const responseRate =
                cadence.totalEnrolled > 0
                  ? ((cadence.totalReplied / cadence.totalEnrolled) * 100).toFixed(1)
                  : '0.0';

              return (
                <div key={cadence.id} className="space-y-0">
                  <div
                    className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer"
                    style={{
                      opacity: cadence.status === 'archived' ? 0.55 : 1,
                      borderBottomLeftRadius: isExpanded ? 0 : undefined,
                      borderBottomRightRadius: isExpanded ? 0 : undefined,
                    }}
                    onMouseEnter={() => setHoveredCard(cadence.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleCardClick(cadence.id)}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Expand/Collapse chevron */}
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                          {/* Status badge */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                            style={{ backgroundColor: sColor.bg, color: sColor.text }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: sColor.dot }}
                            />
                            {statusLabel(cadence.status)}
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {cadence.name}
                            </h3>
                            {cadence.description && (
                              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 max-w-xl">
                                {cadence.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-4">
                          {/* Edit, Toggle, Delete buttons - visible on hover */}
                          <div
                            className={`flex items-center gap-1 transition-opacity ${
                              hoveredCard === cadence.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            {hasPermission('cadences.create') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEdit(cadence);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title="Editar cadência"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {hasPermission('cadences.create') && cadence.status !== 'archived' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCadenceStatus(cadence);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                title={cadence.status === 'active' ? 'Pausar cadência' : 'Ativar cadência'}
                              >
                                {cadence.status === 'active' ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            {hasPermission('cadences.create') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCadence(cadence);
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-slate-400 hover:text-red-500"
                                title="Excluir cadência"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Step timeline */}
                      <div className="flex items-center gap-3 mt-3 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Hash className="w-3.5 h-3.5" />
                          <span className="font-medium">{cadence.stepCount ?? cadence.steps?.length ?? 0} etapas</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-600" />
                        {renderStepTimeline(cadence.steps, cadence.stepCount)}
                      </div>

                      {/* Stats footer */}
                      <div className="flex items-center gap-5 pt-4 border-t border-slate-100 dark:border-slate-700 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {cadence.totalEnrolled}
                            </span>{' '}
                            inscritos
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {cadence.totalCompleted}
                            </span>{' '}
                            completaram
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {cadence.totalReplied}
                            </span>{' '}
                            responderam
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {responseRate}%
                            </span>{' '}
                            taxa de resposta
                          </span>
                        </div>
                        <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Criada em {formatDate(cadence.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded enrollments inline */}
                  {isExpanded && (
                    <div className="bg-white dark:bg-slate-800 border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-xl overflow-hidden">
                      {expandedLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                      ) : expandedEnrollments.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-sm text-slate-400 dark:text-slate-500">
                            Nenhum inscrito nesta cadência ainda.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Lead / Contato
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Etapa
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  IA
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Início
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Última etapa
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Próxima etapa
                                </th>
                                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  Ações
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {expandedEnrollments.map((enrollment) =>
                                renderEnrollmentRow(enrollment, false)
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {/* Refresh button */}
                      {!expandedLoading && expandedEnrollments.length > 0 && (
                        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchExpandedEnrollments(cadence.id);
                            }}
                            className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Atualizar inscrições
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ================================================================ */}
        {/* Tab: Inscrições (all enrollments across all cadences)             */}
        {/* ================================================================ */}
        {activeTab === 'enrollments' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {enrollmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : allEnrollments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-7 h-7 text-slate-300 dark:text-slate-500" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Nenhuma inscrição encontrada
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  As inscrições aparecerão quando leads ou contatos forem adicionados às cadências.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Lead / Contato
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Cadência
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Etapa
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        IA
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Início
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Última etapa
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Próxima etapa
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {allEnrollments.map((enrollment) =>
                      renderEnrollmentRow(enrollment, true)
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Refresh button */}
            {!enrollmentsLoading && allEnrollments.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                <button
                  onClick={fetchAllEnrollments}
                  className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar inscrições
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CadenceBuilder Modal */}
      <CadenceBuilder
        open={showBuilder}
        onClose={() => setShowBuilder(false)}
        editCadence={editCadence}
        onSaved={() => {
          fetchCadences();
          fetchStats();
        }}
      />
    </div>
  );
}
