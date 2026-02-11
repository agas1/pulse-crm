import { useState } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Circle, User, Zap, Plus, Filter } from 'lucide-react';
import Header from '../layouts/Header';
import { useAuth } from '../contexts/AuthContext';
import { filterByOwnership } from '../config/permissions';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';

const priorityConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  high: { label: 'Alta', bg: 'var(--tint-red)', color: '#dc2626', border: '#fecaca' },
  medium: { label: 'Média', bg: 'var(--tint-amber)', color: '#d97706', border: '#fde68a' },
  low: { label: 'Normal', bg: 'var(--tint-green)', color: '#16a34a', border: '#bbf7d0' },
};

const typeConfig: Record<string, { label: string; bg: string; color: string }> = {
  follow_up: { label: 'Follow-up', bg: 'var(--tint-purple)', color: '#7c3aed' },
  call: { label: 'Ligação', bg: 'var(--tint-green)', color: '#059669' },
  meeting: { label: 'Reunião', bg: 'var(--tint-blue)', color: '#2563eb' },
  email: { label: 'E-mail', bg: 'var(--tint-amber)', color: '#b45309' },
  other: { label: 'Outro', bg: 'var(--tint-slate)', color: '#475569' },
};

const userMap: Record<string, string> = {
  u1: 'Você (Admin)',
  u2: 'Marina Rocha',
  u3: 'Pedro Henrique',
  u4: 'Camila Duarte',
  u5: 'Thiago Lima',
};

type TabKey = 'all' | 'pending' | 'in_progress' | 'completed';

const tabs: { key: TabKey; label: string; status?: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'pending', label: 'Pendentes', status: 'pending' },
  { key: 'in_progress', label: 'Em andamento', status: 'in_progress' },
  { key: 'completed', label: 'Concluídas', status: 'completed' },
];

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') {
    return <CheckCircle2 className="w-5 h-5" style={{ color: '#16a34a' }} />;
  }
  if (status === 'in_progress') {
    return <Circle className="w-5 h-5" style={{ color: '#2563eb' }} />;
  }
  return <Circle className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />;
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

export default function Tasks() {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { tasks, updateTask } = useData();
  const userTasks = user ? filterByOwnership(tasks, user) : tasks;

  const tabCounts: Record<TabKey, number> = {
    all: userTasks.length,
    pending: userTasks.filter((t) => t.status === 'pending').length,
    in_progress: userTasks.filter((t) => t.status === 'in_progress').length,
    completed: userTasks.filter((t) => t.status === 'completed').length,
  };

  const filtered = userTasks.filter((task) => {
    const tab = tabs.find((t) => t.key === activeTab);
    if (tab?.status && task.status !== tab.status) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchContact = task.contactName?.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      if (!matchTitle && !matchContact && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div>
      <Header title="Tarefas" subtitle="Gerencie suas tarefas e compromissos" />

      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Quadro de Tarefas</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {userTasks.length} tarefas no total &middot; {tabCounts.pending} pendentes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg"
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Plus className="w-4 h-4" />
            Nova Tarefa
          </button>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 mb-6 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all"
              style={{
                backgroundColor: activeTab === tab.key ? '#3b82f6' : 'transparent',
                color: activeTab === tab.key ? '#ffffff' : 'var(--text-tertiary)',
              }}
            >
              {tab.label}
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                style={{
                  backgroundColor: activeTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--tint-slate)',
                  color: activeTab === tab.key ? '#ffffff' : 'var(--text-tertiary)',
                }}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-200 dark:placeholder-slate-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="all">Todas prioridades</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Normal</option>
          </select>

          {(search || priorityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setPriorityFilter('all');
              }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline transition-colors"
            >
              Limpar filtros
            </button>
          )}

          <span className="text-sm text-slate-400 dark:text-slate-500 ml-auto">
            {filtered.length} tarefa{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Nenhuma tarefa encontrada</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Tente ajustar os filtros</p>
            </div>
          )}

          {filtered.map((task) => {
            const priority = priorityConfig[task.priority];
            const taskType = typeConfig[task.type];
            const assignee = userMap[task.assignedTo] || task.assignedTo;

            return (
              <div
                key={task.id}
                className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <button
                    className="mt-0.5 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed';
                      updateTask(task.id, { status: next });
                    }}
                    title="Alternar status"
                  >
                    <StatusIcon status={task.status} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="text-sm font-semibold truncate"
                        style={{
                          color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </h4>
                      {task.automated && (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                          style={{ backgroundColor: '#fef3c7', color: '#b45309' }}
                          title="Tarefa automatizada"
                        >
                          <Zap className="w-3 h-3" />
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-3">{task.description}</p>

                    <div className="flex items-center gap-4 flex-wrap">
                      {task.contactName && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <User className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          <span>{task.contactName}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>

                      {task.dueTime && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                          <span>{task.dueTime}</span>
                        </div>
                      )}

                      <span
                        className="inline-block px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: taskType.bg, color: taskType.color }}
                      >
                        {taskType.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border"
                      style={{
                        backgroundColor: priority.bg,
                        color: priority.color,
                        borderColor: priority.border,
                      }}
                    >
                      {task.priority === 'high' && <AlertCircle className="w-3 h-3" />}
                      {priority.label}
                    </span>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{
                          backgroundColor: '#94a3b8',
                          fontSize: '8px',
                        }}
                      >
                        {assignee.charAt(0).toUpperCase()}
                      </div>
                      <span>{assignee}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <TaskModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
