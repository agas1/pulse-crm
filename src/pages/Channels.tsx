import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageCircle,
  Instagram,
  Send,
  ArrowDownLeft,
  Wifi,
  WifiOff,
  TestTube,
  Clock,
  Hash,
  TrendingUp,
  RefreshCw,
  Settings,
  ExternalLink,
} from 'lucide-react';
import Header from '../layouts/Header';
import { api } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import type { ChannelConfig, Activity } from '../data/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CadenceStatsOverview {
  activeCadences: number;
  totalEnrolled: number;
  totalActive: number;
  totalReplied: number;
  totalCompleted: number;
  replyRate: number;
}

type Tab = 'enviadas' | 'recebidas' | 'visao_geral';

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

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

const CHANNEL_META: Record<
  string,
  { label: string; icon: typeof Mail; color: string; bg: string }
> = {
  smtp: {
    label: 'E-mail (SMTP)',
    icon: Mail,
    color: '#3b82f6',
    bg: 'var(--tint-blue, #dbeafe)',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    color: '#22c55e',
    bg: 'var(--tint-green, #dcfce7)',
  },
  instagram: {
    label: 'Instagram',
    icon: Instagram,
    color: '#e1306c',
    bg: '#fce7f3',
  },
};

function channelIconForActivity(type: string) {
  if (type === 'email') return Mail;
  if (type === 'whatsapp') return MessageCircle;
  return Send;
}

function channelLabelForActivity(type: string): string {
  if (type === 'email') return 'E-mail';
  if (type === 'whatsapp') return 'WhatsApp';
  return type;
}

function isInboundActivity(activity: Activity): boolean {
  const desc = activity.description.toLowerCase();
  return (
    desc.includes('recebido') ||
    desc.includes('recebida') ||
    desc.includes('inbound') ||
    desc.includes('webhook') ||
    desc.includes('resposta de') ||
    desc.includes('respondeu')
  );
}

function isOutboundActivity(activity: Activity): boolean {
  return (
    (activity.type === 'email' || activity.type === 'whatsapp') &&
    !isInboundActivity(activity)
  );
}

// ---------------------------------------------------------------------------
// Channel Status Card
// ---------------------------------------------------------------------------

function ChannelCard({ config }: { config: ChannelConfig | null; channel: string }) {
  const meta = CHANNEL_META[config?.channel ?? ''] ?? CHANNEL_META.smtp;
  const Icon = meta.icon;

  // Determine status
  let statusLabel = 'Desconectado';
  let statusColor = '#94a3b8';
  let statusBg = 'var(--surface-secondary, #f1f5f9)';
  let StatusIcon = WifiOff;

  if (config?.enabled && config.simulationMode) {
    statusLabel = 'Modo Simulacao';
    statusColor = '#d97706';
    statusBg = 'var(--tint-amber, #fef3c7)';
    StatusIcon = TestTube;
  } else if (config?.enabled && !config.simulationMode) {
    statusLabel = 'Conectado';
    statusColor = '#16a34a';
    statusBg = 'var(--tint-green, #dcfce7)';
    StatusIcon = Wifi;
  }

  // Extract key config info
  const configInfo: string[] = [];
  if (config?.config) {
    const cfg = config.config as Record<string, unknown>;
    if (cfg.smtpHost) configInfo.push(`Host: ${String(cfg.smtpHost)}`);
    if (cfg.smtpUser) configInfo.push(`User: ${String(cfg.smtpUser)}`);
    if (cfg.phoneNumber) configInfo.push(`Tel: ${String(cfg.phoneNumber)}`);
    if (cfg.phone) configInfo.push(`Tel: ${String(cfg.phone)}`);
    if (cfg.apiKey) configInfo.push(`API Key: ${String(cfg.apiKey)}`);
    if (cfg.accessToken) configInfo.push(`Token: ${String(cfg.accessToken)}`);
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: meta.bg }}
          >
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {meta.label}
            </h3>
            {config && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Atualizado em {formatDate(config.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: statusBg, color: statusColor }}
        >
          <StatusIcon className="w-3 h-3" />
          {statusLabel}
        </span>
      </div>

      {/* Config info */}
      {configInfo.length > 0 && (
        <div className="space-y-1 mb-3">
          {configInfo.map((info, i) => (
            <p key={i} className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {info}
            </p>
          ))}
        </div>
      )}

      {/* Configure link */}
      <a
        href="/settings"
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
      >
        <Settings className="w-3 h-3" />
        Configurar
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Table
// ---------------------------------------------------------------------------

function ActivityTable({
  activities,
  emptyMessage,
}: {
  activities: Activity[];
  emptyMessage: string;
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Data
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Canal
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Contato
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Descricao
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {activities.map((activity) => {
              const Icon = channelIconForActivity(activity.type);
              const chLabel = channelLabelForActivity(activity.type);
              const meta = activity.type === 'email' ? CHANNEL_META.smtp : CHANNEL_META[activity.type];
              const color = meta?.color ?? '#64748b';

              return (
                <tr
                  key={activity.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(activity.date)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: meta?.bg ?? 'var(--surface-secondary, #f1f5f9)',
                        color,
                      }}
                    >
                      <Icon className="w-3 h-3" />
                      {chLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {activity.contactName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 max-w-md">
                    <span title={activity.description}>
                      {truncate(activity.description, 80)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview Stats Panel
// ---------------------------------------------------------------------------

function OverviewPanel({ stats }: { stats: CadenceStatsOverview | null }) {
  if (!stats) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Nenhum dado de cadencia disponivel ainda.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Crie e ative cadencias para ver as estatisticas aqui.
        </p>
      </div>
    );
  }

  const responsePercent = Math.min(stats.replyRate, 100);

  const statItems = [
    {
      label: 'Total Inscritos',
      value: stats.totalEnrolled,
      icon: Hash,
      color: '#3b82f6',
      bg: 'var(--tint-blue, #dbeafe)',
    },
    {
      label: 'Inscritos Ativos',
      value: stats.totalActive,
      icon: TrendingUp,
      color: '#22c55e',
      bg: 'var(--tint-green, #dcfce7)',
    },
    {
      label: 'Completaram',
      value: stats.totalCompleted,
      icon: Send,
      color: '#8b5cf6',
      bg: 'var(--tint-purple, #f3e8ff)',
    },
    {
      label: 'Responderam',
      value: stats.totalReplied,
      icon: ArrowDownLeft,
      color: '#d97706',
      bg: 'var(--tint-amber, #fef3c7)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: item.bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">
                  {item.label}
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Response Rate Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--tint-green, #dcfce7)' }}
            >
              <TrendingUp className="w-5 h-5" style={{ color: '#16a34a' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Taxa de Resposta
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Percentual de inscritos que responderam
              </p>
            </div>
          </div>
          <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">
            {stats.replyRate.toFixed(1)}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${responsePercent}%`,
              backgroundColor:
                responsePercent >= 20 ? '#22c55e' : responsePercent >= 10 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-400 dark:text-slate-500">0%</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">100%</span>
        </div>
      </div>

      {/* Cadence summary */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Resumo das Cadencias
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.activeCadences}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cadencias Ativas</p>
          </div>
          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-900/40">
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.totalEnrolled}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Total Inscritos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component: Channels (Outbound Channel Dashboard)
// ---------------------------------------------------------------------------

export default function Channels() {
  const [activeTab, setActiveTab] = useState<Tab>('enviadas');
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [cadenceStats, setCadenceStats] = useState<CadenceStatsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchChannelConfigs = useCallback(async () => {
    try {
      const data = await api.get<{ configs: ChannelConfig[] }>('/channel-configs');
      setChannelConfigs(data.configs);
    } catch {
      setChannelConfigs([]);
    }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await api.get<{ activities: Activity[] }>('/activities?limit=50');
      setActivities(data.activities);
    } catch {
      setActivities([]);
    }
  }, []);

  const fetchCadenceStats = useCallback(async () => {
    try {
      const data = await api.get<{ stats: CadenceStatsOverview }>('/cadences/stats/overview');
      setCadenceStats(data.stats);
    } catch {
      setCadenceStats(null);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchChannelConfigs(), fetchActivities(), fetchCadenceStats()]);
    setLoading(false);
  }, [fetchChannelConfigs, fetchActivities, fetchCadenceStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchChannelConfigs(), fetchActivities(), fetchCadenceStats()]);
    setRefreshing(false);
  }, [fetchChannelConfigs, fetchActivities, fetchCadenceStats]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const configByChannel = (ch: string) =>
    channelConfigs.find((c) => c.channel === ch) ?? null;

  const outboundActivities = activities.filter(isOutboundActivity);
  const inboundActivities = activities.filter(isInboundActivity);

  // -------------------------------------------------------------------------
  // Loading
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div>
        <Header title="Canais" subtitle="Dashboard de canais outbound do motor de cadencias" />
        <LoadingSpinner />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const tabs: { key: Tab; label: string; icon: typeof Send; count?: number }[] = [
    { key: 'enviadas', label: 'Enviadas', icon: Send, count: outboundActivities.length },
    { key: 'recebidas', label: 'Recebidas', icon: ArrowDownLeft, count: inboundActivities.length },
    { key: 'visao_geral', label: 'Visao Geral', icon: TrendingUp },
  ];

  return (
    <div>
      <Header title="Canais" subtitle="Dashboard de canais outbound do motor de cadencias" />

      <div className="p-8 space-y-6">
        {/* ================================================================ */}
        {/* Channel Status Cards                                             */}
        {/* ================================================================ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              Status dos Canais
            </h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              Atualizar
            </button>
          </div>

          {channelConfigs.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <WifiOff className="w-8 h-8 text-slate-300 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Nenhum canal configurado
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Configure seus canais em{' '}
                <a
                  href="/settings"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Configuracoes
                </a>{' '}
                para comecar a enviar mensagens.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['smtp', 'whatsapp', 'instagram'] as const).map((ch) => (
                <ChannelCard key={ch} config={configByChannel(ch)} channel={ch} />
              ))}
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* Tabs                                                             */}
        {/* ================================================================ */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ================================================================ */}
        {/* Tab: Enviadas (Outbound)                                         */}
        {/* ================================================================ */}
        {activeTab === 'enviadas' && (
          <ActivityTable
            activities={outboundActivities}
            emptyMessage="Nenhuma mensagem enviada ainda. Crie uma cadencia para comecar."
          />
        )}

        {/* ================================================================ */}
        {/* Tab: Recebidas (Inbound)                                         */}
        {/* ================================================================ */}
        {activeTab === 'recebidas' && (
          <ActivityTable
            activities={inboundActivities}
            emptyMessage="Nenhuma resposta recebida ainda. As respostas aparecerao aqui quando seus contatos responderem."
          />
        )}

        {/* ================================================================ */}
        {/* Tab: Visao Geral (Overview)                                      */}
        {/* ================================================================ */}
        {activeTab === 'visao_geral' && <OverviewPanel stats={cadenceStats} />}
      </div>
    </div>
  );
}
