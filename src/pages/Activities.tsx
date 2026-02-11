import { Mail, Phone, Calendar, FileText, MessageCircle, Zap, CheckCircle2 } from 'lucide-react';
import Header from '../layouts/Header';
import { useData } from '../contexts/DataContext';

const activityConfig: Record<string, { icon: typeof Mail; label: string; bg: string; color: string }> = {
  email: { icon: Mail, label: 'E-mail', bg: 'var(--tint-blue)', color: '#3b82f6' },
  call: { icon: Phone, label: 'Ligação', bg: 'var(--tint-green)', color: '#22c55e' },
  meeting: { icon: Calendar, label: 'Reunião', bg: 'var(--tint-purple)', color: '#8b5cf6' },
  note: { icon: FileText, label: 'Nota', bg: 'var(--tint-amber)', color: '#f59e0b' },
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', bg: 'var(--tint-green)', color: '#22c55e' },
  status_change: { icon: Zap, label: 'Mudança', bg: 'var(--tint-red)', color: '#ef4444' },
  task_done: { icon: CheckCircle2, label: 'Tarefa', bg: 'var(--tint-green)', color: '#16a34a' },
};

export default function Activities() {
  const { activities } = useData();

  return (
    <div>
      <Header title="Atividades" subtitle="Histórico de interações" />

      <div className="p-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {activities.map((act) => {
              const config = activityConfig[act.type];
              const Icon = config.icon;
              return (
                <div key={act.id} className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: config.bg, color: config.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{act.description}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{act.contactName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className="inline-block px-2.5 py-0.5 text-xs font-medium rounded-full"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {config.label}
                    </span>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{act.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
