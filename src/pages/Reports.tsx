import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Clock, Target } from 'lucide-react';
import Header from '../layouts/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { filterByOwnership } from '../config/permissions';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  contato_feito: 'Contato Feito',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociacao',
  fechado_ganho: 'Fechado (Ganho)',
  fechado_perdido: 'Fechado (Perdido)',
};

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#94a3b8'];

const formatCurrency = (value: number) => `R$ ${(value / 1000).toFixed(0)}k`;

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-slate-700 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Receita: <span className="font-medium">R$ {data.revenue.toLocaleString('pt-BR')}</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Deals: <span className="font-medium">{data.deals}</span>
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Conversão: <span className="font-medium">{data.rate}%</span>
        </p>
      </div>
    );
  }
  return null;
};

interface RevenueUser {
  name: string;
  revenue: number;
  deals: number;
  rate: number;
}

const avgClosingTime = [
  { stage: 'Lead → Contato', days: 3 },
  { stage: 'Contato → Proposta', days: 7 },
  { stage: 'Proposta → Negociação', days: 12 },
  { stage: 'Negociação → Fechamento', days: 10 },
];

export default function Reports() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { deals } = useData();
  const [revenueByUser, setRevenueByUser] = useState<RevenueUser[]>([]);

  const fetchReports = useCallback(async () => {
    try {
      const data = await api.get<{ revenueByUser: Array<{ name: string; revenue: number; dealCount: number; conversionRate: number }> }>('/dashboard/reports');
      setRevenueByUser(data.revenueByUser.map(u => ({
        name: u.name.split(' ').slice(0, 2).join(' '),
        revenue: u.revenue,
        deals: u.dealCount,
        rate: u.conversionRate,
      })));
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const userDeals = user ? filterByOwnership(deals, user) : deals;

  const pipelineValue = userDeals.filter(d => d.stage !== 'fechado_ganho' && d.stage !== 'fechado_perdido').reduce((s, d) => s + d.value, 0);
  const closedRevenue = userDeals.filter(d => d.stage === 'fechado_ganho').reduce((s, d) => s + d.value, 0);

  const stageCount = (stage: string) => userDeals.filter(d => d.stage === stage).length;

  const leadsByStage = [
    { name: stageLabels.lead, value: stageCount('lead'), color: COLORS[0] },
    { name: stageLabels.contato_feito, value: stageCount('contato_feito'), color: COLORS[1] },
    { name: stageLabels.proposta_enviada, value: stageCount('proposta_enviada'), color: COLORS[2] },
    { name: stageLabels.negociacao, value: stageCount('negociacao'), color: COLORS[3] },
    { name: stageLabels.fechado_ganho, value: stageCount('fechado_ganho'), color: COLORS[4] },
  ];

  const metrics = [
    { title: 'Pipeline Ativo', value: `R$ ${(pipelineValue / 1000).toFixed(0)}k`, subtitle: 'Valor em negociação', icon: TrendingUp, bg: '#3b82f6' },
    { title: 'Receita Fechada', value: `R$ ${(closedRevenue / 1000).toFixed(0)}k`, subtitle: 'Deals ganhos', icon: Target, bg: '#22c55e' },
    { title: 'Total de Deals', value: String(userDeals.length), subtitle: 'Todos os estágios', icon: Users, bg: '#8b5cf6' },
    { title: 'Taxa de Fechamento', value: userDeals.length > 0 ? `${Math.round((stageCount('fechado_ganho') / userDeals.length) * 100)}%` : '0%', subtitle: 'Fechado / Total', icon: Clock, bg: '#f59e0b' },
  ];

  return (
    <div>
      <Header title="Relatórios" subtitle="Análise inteligente de vendas" />

      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: metric.bg }}
                >
                  <metric.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{metric.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{metric.title}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{metric.subtitle}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Conversão por Vendedor</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Receita e performance individual</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByUser} layout="vertical" barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} horizontal={false} />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: 500 }}
                  width={85}
                />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }} />
                <Bar dataKey="revenue" name="Receita" fill="#3b82f6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              {revenueByUser.map((user) => (
                <div key={user.name} className="text-center">
                  <p className="text-xs text-slate-400 dark:text-slate-500">{user.name}</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user.deals} deals</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.rate}% conversão</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="mb-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Leads por Etapa</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Distribuição atual do funil</p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={leadsByStage}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {leadsByStage.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [`${Number(value)} deals`, name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--text-primary)' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-2">
              {leadsByStage.map((stage) => (
                <div key={stage.name} className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{stage.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stage.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Tempo Médio de Fechamento</h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Dias médios em cada transição do funil</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">Média total: 32 dias</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={avgClosingTime} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#f1f5f9'} />
              <XAxis
                dataKey="stage"
                axisLine={false}
                tickLine={false}
                tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => `${v}d`}
              />
              <Tooltip
                formatter={(value) => [`${Number(value)} dias`, 'Tempo Médio']}
                contentStyle={{ borderRadius: 8, border: '1px solid var(--chart-tooltip-border)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--text-primary)' }}
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc' }}
              />
              <Bar dataKey="days" name="Dias" radius={[6, 6, 0, 0]}>
                {avgClosingTime.map((_entry, index) => (
                  <Cell
                    key={index}
                    fill={index === avgClosingTime.length - 1 ? '#f59e0b' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
