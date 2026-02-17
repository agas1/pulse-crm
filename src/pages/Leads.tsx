import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Mail,
  Phone,
  Pencil,
  Trash2,
  ArrowRightCircle,
  Clock,
  Rocket,
  CheckSquare,
  Square,
  X,
  Zap,
} from 'lucide-react';
import Header from '../layouts/Header';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { filterByOwnership } from '../config/permissions';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import LeadModal from '../components/LeadModal';
import LeadConvertModal from '../components/LeadConvertModal';
import type { Lead, Cadence } from '../data/types';

/* ------------------------------------------------------------------ */
/*  Configs                                                            */
/* ------------------------------------------------------------------ */

const statusConfig: Record<Lead['status'], { label: string; bg: string; color: string }> = {
  new: { label: 'Novo', bg: 'var(--tint-blue, #dbeafe)', color: '#2563eb' },
  contacted: { label: 'Contatado', bg: 'var(--tint-yellow, #fef9c3)', color: '#ca8a04' },
  qualified: { label: 'Qualificado', bg: 'var(--tint-green, #dcfce7)', color: '#16a34a' },
  disqualified: { label: 'Desqualificado', bg: 'var(--tint-slate, #f1f5f9)', color: '#64748b' },
};

const scoreConfig: Record<Lead['score'], { label: string; bg: string; color: string }> = {
  hot: { label: 'Hot', bg: '#fee2e2', color: '#dc2626' },
  warm: { label: 'Warm', bg: '#fef9c3', color: '#ca8a04' },
  cold: { label: 'Cold', bg: '#dbeafe', color: '#2563eb' },
};

const sourceConfig: Record<string, { label: string; bg: string; color: string }> = {
  website: { label: 'Website', bg: '#dbeafe', color: '#2563eb' },
  facebook: { label: 'Facebook', bg: '#ede9fe', color: '#7c3aed' },
  manual: { label: 'Manual', bg: '#f1f5f9', color: '#64748b' },
  referral: { label: 'Indicacao', bg: '#dcfce7', color: '#16a34a' },
  csv: { label: 'CSV', bg: '#fef9c3', color: '#ca8a04' },
};

const statusFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'new', label: 'Novos' },
  { key: 'contacted', label: 'Contatados' },
  { key: 'qualified', label: 'Qualificados' },
  { key: 'disqualified', label: 'Desqualificados' },
];

const scoreFilters = [
  { key: 'all', label: 'Todos' },
  { key: 'hot', label: 'Hot' },
  { key: 'warm', label: 'Warm' },
  { key: 'cold', label: 'Cold' },
];

/* ------------------------------------------------------------------ */
/*  Relative time helper                                               */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `ha ${diffDay} dia${diffDay > 1 ? 's' : ''}`;
  if (diffHour > 0) return `ha ${diffHour} hora${diffHour > 1 ? 's' : ''}`;
  if (diffMin > 0) return `ha ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  return 'agora';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Leads() {
  const { user } = useAuth();
  const { leads, loading, deleteLead } = useData();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterScore, setFilterScore] = useState('all');
  const [smartQueue, setSmartQueue] = useState(false);

  // Modal states
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | undefined>(undefined);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);

  // Selection + Cadence enrollment
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [selectedCadence, setSelectedCadence] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  const fetchCadences = useCallback(async () => {
    try {
      const { cadences: data } = await api.get<{ cadences: Cadence[] }>('/cadences');
      setCadences(data.filter((c) => c.status === 'active'));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCadences(); }, [fetchCadences]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleEnroll = async () => {
    if (!selectedCadence || selectedIds.size === 0) return;
    setEnrolling(true);
    setEnrollError('');
    try {
      await api.post(`/cadences/${selectedCadence}/enroll-bulk`, {
        leadIds: Array.from(selectedIds),
      });
      setShowEnrollModal(false);
      setSelectedIds(new Set());
      setSelectedCadence('');
    } catch (err) {
      setEnrollError(err instanceof Error ? err.message : 'Erro ao inscrever');
    } finally {
      setEnrolling(false);
    }
  };

  // Filtered data
  const userLeads = user ? filterByOwnership(leads, user) : leads;

  const filtered = useMemo(() => {
    let result = userLeads.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.company.toLowerCase().includes(search.toLowerCase()) ||
        l.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = smartQueue
        ? (l.status === 'new' || l.status === 'contacted')
        : (filterStatus === 'all' || l.status === filterStatus);
      const matchesScore = filterScore === 'all' || l.score === filterScore;
      return matchesSearch && matchesStatus && matchesScore;
    });

    if (smartQueue) {
      result = [...result].sort((a, b) => (b.numericScore ?? 0) - (a.numericScore ?? 0));
    }

    return result;
  }, [userLeads, search, filterStatus, filterScore, smartQueue]);

  // Handlers
  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setShowLeadModal(true);
  };

  const handleDelete = async (lead: Lead) => {
    if (window.confirm(`Deseja realmente excluir o lead "${lead.name}"?`)) {
      await deleteLead(lead.id);
    }
  };

  const handleConvert = (lead: Lead) => {
    setConvertingLead(lead);
  };

  const handleCloseLeadModal = () => {
    setShowLeadModal(false);
    setEditingLead(undefined);
  };

  const handleCloseConvertModal = () => {
    setConvertingLead(null);
  };

  if (loading) {
    return (
      <div>
        <Header title="Lead Inbox" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Lead Inbox"
        subtitle={`${userLeads.length} lead${userLeads.length !== 1 ? 's' : ''} no total`}
      />

      <div className="p-8">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>

            {/* Status filter pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterStatus(f.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                  style={{
                    backgroundColor: filterStatus === f.key ? '#3b82f6' : 'transparent',
                    color: filterStatus === f.key ? '#ffffff' : 'var(--text-tertiary)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Score filter pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              {scoreFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilterScore(f.key)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                  style={{
                    backgroundColor: filterScore === f.key ? '#3b82f6' : 'transparent',
                    color: filterScore === f.key ? '#ffffff' : 'var(--text-tertiary)',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Enroll in cadence */}
            {selectedIds.size > 0 && (
              <button
                onClick={() => { setShowEnrollModal(true); setEnrollError(''); setSelectedCadence(''); }}
                className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
              >
                <Rocket className="w-4 h-4" />
                Inscrever ({selectedIds.size}) em Cadência
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
                Limpar
              </button>
            )}

            {/* Smart Queue toggle */}
            <button
              onClick={() => setSmartQueue(!smartQueue)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                smartQueue
                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Zap className="w-4 h-4" />
              Fila Inteligente
            </button>

            {/* New lead button */}
            <button
              onClick={() => {
                setEditingLead(undefined);
                setShowLeadModal(true);
              }}
              className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Lead
            </button>
          </div>
        </div>

        {/* Select all bar */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              {selectedIds.size === filtered.length ? (
                <CheckSquare className="w-4 h-4 text-violet-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedIds.size === filtered.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            {selectedIds.size > 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {selectedIds.size} de {filtered.length} selecionado{selectedIds.size !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Lead cards grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search || filterStatus !== 'all' || filterScore !== 'all'
                ? 'Nenhum lead encontrado com os filtros aplicados.'
                : 'Nenhum lead cadastrado ainda.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((lead) => {
              const statusCfg = statusConfig[lead.status];
              const scoreCfg = scoreConfig[lead.score];
              const sourceCfg = sourceConfig[lead.source] || {
                label: lead.source,
                bg: '#f1f5f9',
                color: '#64748b',
              };

              return (
                <div
                  key={lead.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border transition-all group hover:shadow-md ${
                    selectedIds.has(lead.id)
                      ? 'border-violet-500 border-2'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500/30'
                  }`}
                >
                  <div className={selectedIds.has(lead.id) ? 'p-[19px]' : 'p-5'}>
                  {/* Top row: checkbox + name + badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <button
                        onClick={() => toggleSelect(lead.id)}
                        className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600 hover:text-violet-500 transition-colors"
                      >
                        {selectedIds.has(lead.id) ? (
                          <CheckSquare className="w-4 h-4 text-violet-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {lead.name}
                      </h3>
                      {lead.company && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {lead.company}
                        </p>
                      )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 shrink-0">
                      {/* Numeric Score */}
                      {(lead.numericScore != null && lead.numericScore > 0) && (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{
                            background: (lead.numericScore ?? 0) >= 70
                              ? 'linear-gradient(135deg, #ef4444, #f97316)'
                              : (lead.numericScore ?? 0) >= 40
                              ? 'linear-gradient(135deg, #f59e0b, #eab308)'
                              : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                          }}
                          title={`Score: ${lead.numericScore}/100`}
                        >
                          {lead.numericScore}
                        </div>
                      )}
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: sourceCfg.bg, color: sourceCfg.color }}
                      >
                        {sourceCfg.label}
                      </span>
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: scoreCfg.bg, color: scoreCfg.color }}
                      >
                        {scoreCfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Contact info */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                    {lead.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom row: time, status, actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}
                      >
                        {statusCfg.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Clock className="w-3 h-3" />
                        {timeAgo(lead.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(lead)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-blue-500"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lead)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-red-500"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleConvert(lead)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 hover:text-green-500"
                        title="Converter"
                      >
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <LeadModal
        open={showLeadModal}
        onClose={handleCloseLeadModal}
        lead={editingLead}
      />

      {convertingLead && (
        <LeadConvertModal
          open={!!convertingLead}
          onClose={handleCloseConvertModal}
          lead={convertingLead}
        />
      )}

      {/* Enroll in Cadence Modal */}
      <Modal
        open={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        title="Inscrever Leads em Cadência"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {selectedIds.size} lead{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''} para inscrição.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Cadência *
            </label>
            {cadences.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Nenhuma cadência ativa. Crie uma cadência primeiro.
              </p>
            ) : (
              <select
                value={selectedCadence}
                onChange={(e) => setSelectedCadence(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
              >
                <option value="">Selecione uma cadência</option>
                {cadences.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.stepCount ?? 0} passos)
                  </option>
                ))}
              </select>
            )}
          </div>

          {enrollError && (
            <p className="text-sm text-red-600 dark:text-red-400">{enrollError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowEnrollModal(false)}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEnroll}
              disabled={!selectedCadence || enrolling}
              className="px-5 py-2.5 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {enrolling && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Inscrever
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
