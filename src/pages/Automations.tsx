import { useState, useEffect, useCallback } from 'react';
import { Zap, Play, Pause, ArrowRight, Clock, Hash, Plus, ChevronRight } from 'lucide-react';
import Header from '../layouts/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { AutomationRule } from '../data/types';

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

export default function Automations() {
  const { hasPermission } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRule = async (id: string) => {
    const rule = rules.find((r) => r.id === id);
    if (!rule) return;
    // optimistic update
    setRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    );
    try {
      await api.put(`/automations/${id}`, { enabled: !rule.enabled });
    } catch {
      // revert on error
      setRules((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, enabled: rule.enabled } : r
        )
      );
    }
  };

  const enabledCount = rules.filter((r) => r.enabled).length;
  const totalExecutions = rules.reduce((sum, r) => sum + r.executions, 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <Header title="Automações" subtitle="Regras de automação de vendas" />

      <div className="p-8 space-y-6">
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
            <button className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Nova Regra
            </button>
          )}
        </div>

        <div className="space-y-4">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
              style={{ opacity: rule.enabled ? 1 : 0.55 }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: rule.enabled ? 'var(--tint-purple)' : 'var(--surface-secondary)',
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

                  <button
                    onClick={() => toggleRule(rule.id)}
                    className="relative shrink-0 ml-4"
                    aria-label={
                      rule.enabled ? 'Desativar regra' : 'Ativar regra'
                    }
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

                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--tint-slate)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Zap className="w-3 h-3" />
                    {rule.trigger}
                  </div>

                  <ArrowRight
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  />

                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--tint-amber)',
                      color: '#92400e',
                    }}
                  >
                    <ChevronRight className="w-3 h-3" />
                    {rule.condition}
                  </div>

                  <ArrowRight
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  />

                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--tint-blue)',
                      color: '#1e40af',
                    }}
                  >
                    <Play className="w-3 h-3" />
                    {rule.action}
                  </div>
                </div>

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
                        backgroundColor: rule.enabled ? 'var(--tint-green)' : 'var(--surface-secondary)',
                        color: rule.enabled ? '#16a34a' : '#94a3b8',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: rule.enabled
                            ? '#22c55e'
                            : '#94a3b8',
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
      </div>
    </div>
  );
}
