import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, Target,
  Mail, Phone, Calendar, FileText, MessageCircle, Zap, CheckCircle2,
  ArrowUpRight, ArrowDownRight,
  AlertTriangle, Clock, CalendarCheck,
} from 'lucide-react';
import Header from '../layouts/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { filterByOwnership } from '../config/permissions';
import { useData } from '../contexts/DataContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../services/api';

const activityIcons: Record<string, typeof Mail> = { email: Mail, call: Phone, meeting: Calendar, note: FileText, whatsapp: MessageCircle, status_change: Zap, task_done: CheckCircle2 };

const formatCurrency = (value: number) => `R$ ${(value / 1000).toFixed(0)}k`;

export default function Dashboard() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { contacts, deals, activities, scheduledActivities, loading } = useData();

  const [activitySummary, setActivitySummary] = useState({ overdue: 0, today: 0, upcoming: 0, stalled: 0 });

  // Compute activity summary from local data as fallback, and also try API
  const localSummary = useMemo(() => {
    if (loading) return { overdue: 0, today: 0, upcoming: 0, stalled: 0 };

    const userDeals = user ? filterByOwnership(deals, user) : deals;
    const todayStr = new Date().toISOString().split('T')[0];
    let overdue = 0;
    let today = 0;
    let upcoming = 0;
    let stalled = 0;

    for (const deal of userDeals) {
      // Skip closed deals
      if (deal.stage === 'fechado_ganho' || deal.stage === 'fechado_perdido') continue;

      const dealActivities = scheduledActivities.filter(sa => sa.dealId === deal.id && !sa.completed);
      if (dealActivities.length === 0) {
        stalled++;
        continue;
      }
      const nextDate = dealActivities.reduce((min, sa) => sa.dueDate < min ? sa.dueDate : min, dealActivities[0].dueDate);
      if (nextDate < todayStr) overdue++;
      else if (nextDate === todayStr) today++;
      else upcoming++;
    }

    return { overdue, today, upcoming, stalled };
  }, [deals, scheduledActivities, user, loading]);

  useEffect(() => {
    // Try to fetch from API, fall back to local computation
    api.get<{ overdue: number; today: number; upcoming: number; stalled: number }>('/dashboard/activity-summary')
      .then((data) => {
        setActivitySummary(data);
      })
      .catch(() => {
        // API endpoint may not exist yet, use local computation
        setActivitySummary(localSummary);
      });
  }, [localSummary]);

  if (loading) return <div><Header title="Dashboard" /><LoadingSpinner /></div>;

  const userDeals = user ? filterByOwnership(deals, user) : deals;
  const userContacts = user ? filterByOwnership(contacts, user) : contacts;

  const totalRevenue = userDeals.filter(d => d.stage === 'fechado_ganho').reduce((s, d) => s + d.value, 0);
  const pipelineValue = userDeals.filter(d => d.stage !== 'fechado_ganho' && d.stage !== 'fechado_perdido').reduce((s, d) => s + d.value, 0);
  const activeContacts = userContacts.filter(c => c.status === 'active').length;
  const conversionRate = userDeals.length > 0 ? Math.round((userDeals.filter(d => d.stage === 'fechado_ganho').length / userDeals.length) * 100) : 0;

  // Compute chart data from real deals
  const stageConfig = [
    { stage: 'lead', label: 'Lead', color: '#94a3b8' },
    { stage: 'contato_feito', label: 'Contato Feito', color: '#60a5fa' },
    { stage: 'proposta_enviada', label: 'Proposta Enviada', color: '#f59e0b' },
    { stage: 'negociacao', label: 'Negociação', color: '#8b5cf6' },
    { stage: 'fechado_ganho', label: 'Fechado (Ganho)', color: '#22c55e' },
    { stage: 'fechado_perdido', label: 'Fechado (Perdido)', color: '#ef4444' },
  ];

  const dealsByStage = stageConfig.map(s => ({
    name: s.label,
    value: userDeals.filter(d => d.stage === s.stage).length,
    color: s.color,
  })).filter(s => s.value > 0);

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyRevenue = months.map((month, i) => {
    const value = userDeals
      .filter(d => d.stage === 'fechado_ganho' && new Date(d.createdAt).getMonth() === i)
      .reduce((s, d) => s + d.value, 0);
    return { month, value };
  });

  const conversionData = months.map((month, i) => {
    const monthDeals = userDeals.filter(d => new Date(d.createdAt).getMonth() === i);
    return {
      month,
      leads: monthDeals.length,
      converted: monthDeals.filter(d => d.stage === 'fechado_ganho').length,
    };
  });

  const metrics = [
    { title: 'Receita Total', value: `R$ ${(totalRevenue / 1000).toFixed(0)}k`, change: 18.2, icon: DollarSign, bg: '#22c55e' },
    { title: 'Pipeline Ativo', value: `R$ ${(pipelineValue / 1000).toFixed(0)}k`, change: 12.5, icon: TrendingUp, bg: '#3b82f6' },
    { title: 'Contatos Ativos', value: String(activeContacts), change: 8.3, icon: Users, bg: '#8b5cf6' },
    { title: 'Taxa de Conversão', value: `${conversionRate}%`, change: -2.1, icon: Target, bg: '#f97316' },
  ];

  const summary = activitySummary.stalled > 0 || activitySummary.overdue > 0 || activitySummary.today > 0 || activitySummary.upcoming > 0
    ? activitySummary
    : localSummary;

  const hasAttention = summary.stalled > 0 || summary.overdue > 0;

  return (
    <div>
      <Header title="Dashboard" subtitle="Visão geral do seu negócio" />

      <div className="p-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div key={metric.title} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: metric.bg }}
                >
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className="flex items-center gap-1 text-sm font-medium"
                  style={{ color: metric.change >= 0 ? '#16a34a' : '#ef4444' }}
                >
                  {metric.change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {Math.abs(metric.change)}%
                </span>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metric.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{metric.title}</p>
            </div>
          ))}
        </div>

        {/* Activity Motor Card */}
        <div
          className="bg-white dark:bg-slate-800 rounded-xl p-6 border transition-shadow hover:shadow-md"
          style={{
            borderColor: hasAttention ? '#f97316' : isDark ? '#334155' : '#e2e8f0',
            borderWidth: hasAttention ? '2px' : '1px',
          }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: hasAttention ? '#f97316' : '#3b82f6' }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Motor de Atividades</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {hasAttention ? 'Atenção necessária - existem deals que precisam de ação' : 'Todas as atividades em dia'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Stalled */}
            <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? 'rgba(148,163,184,0.1)' : '#f8fafc' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(148,163,184,0.2)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: '#94a3b8' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.stalled}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Deals Parados</p>
            </div>

            {/* Overdue */}
            <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}>
                  <Clock className="w-4 h-4" style={{ color: '#ef4444' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.overdue}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Atrasadas</p>
            </div>

            {/* Today */}
            <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                  <Calendar className="w-4 h-4" style={{ color: '#f59e0b' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.today}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Hoje</p>
            </div>

            {/* Upcoming */}
            <div className="rounded-xl p-4" style={{ backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#f0fdf4' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.15)' }}>
                  <CalendarCheck className="w-4 h-4" style={{ color: '#22c55e' }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.upcoming}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Próximas</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">Receita Mensal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyRevenue}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={formatCurrency} />
                <Tooltip formatter={(v) => [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'Receita']} contentStyle={{ borderRadius: 8, border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pipeline Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">Deals por Estágio</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={dealsByStage} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={4} strokeWidth={0}>
                  {dealsByStage.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--text-primary)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Conversion Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-6">Leads vs Conversões</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={conversionData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--text-primary)' }} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Bar dataKey="leads" name="Leads" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                <Bar dataKey="converted" name="Convertidos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Atividade Recente</h3>
            <div className="space-y-3">
              {activities.slice(0, 6).map((act) => {
                const Icon = activityIcons[act.type];
                return (
                  <div key={act.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate">{act.description}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{act.contactName} · {act.date.split(' ')[0]}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
