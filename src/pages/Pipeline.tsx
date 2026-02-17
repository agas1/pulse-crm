import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { Building2, Calendar, User, GripVertical, Plus, Trash2, Pencil, CalendarPlus } from 'lucide-react';
import Header from '../layouts/Header';
import { useAuth } from '../contexts/AuthContext';
import { filterByOwnership } from '../config/permissions';
import { useData } from '../contexts/DataContext';
import DealModal from '../components/DealModal';
import ScheduleActivityModal from '../components/ScheduleActivityModal';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Deal, DealStage, ScheduledActivity } from '../data/types';

const stages: { id: DealStage; label: string; dotColor: string; headerBg: string }[] = [
  { id: 'lead', label: 'Lead', dotColor: '#94a3b8', headerBg: 'var(--surface-secondary)' },
  { id: 'contato_feito', label: 'Contato Feito', dotColor: '#60a5fa', headerBg: 'var(--tint-blue)' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', dotColor: '#fbbf24', headerBg: 'var(--tint-amber)' },
  { id: 'negociacao', label: 'Negociacao', dotColor: '#a78bfa', headerBg: 'var(--tint-purple)' },
  { id: 'fechado_ganho', label: 'Fechado (Ganho)', dotColor: '#4ade80', headerBg: 'var(--tint-green)' },
  { id: 'fechado_perdido', label: 'Fechado (Perdido)', dotColor: '#ef4444', headerBg: 'var(--tint-red)' },
];

function getProbabilityColor(p: number): string {
  if (p >= 80) return '#4ade80';
  if (p >= 50) return '#60a5fa';
  if (p >= 30) return '#fbbf24';
  return '#cbd5e1';
}

type ActivityStatus = 'stalled' | 'overdue' | 'today' | 'scheduled';

function getActivityStatus(deal: Deal, scheduledActivities: ScheduledActivity[]): ActivityStatus {
  const today = new Date().toISOString().split('T')[0];
  const dealActivities = scheduledActivities.filter(sa => sa.dealId === deal.id && !sa.completed);
  if (dealActivities.length === 0) return 'stalled';
  const nextDate = dealActivities.reduce((min, sa) => sa.dueDate < min ? sa.dueDate : min, dealActivities[0].dueDate);
  if (nextDate < today) return 'overdue';
  if (nextDate === today) return 'today';
  return 'scheduled';
}

function getActivityTooltip(deal: Deal, scheduledActivities: ScheduledActivity[]): string {
  const dealActivities = scheduledActivities.filter(sa => sa.dealId === deal.id && !sa.completed);
  if (dealActivities.length === 0) return 'Sem atividade agendada - Deal parado';
  const sorted = [...dealActivities].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const next = sorted[0];
  const timeStr = next.dueTime ? ` as ${next.dueTime}` : '';
  return `Proxima: ${next.title} em ${next.dueDate}${timeStr} (${dealActivities.length} pendente${dealActivities.length > 1 ? 's' : ''})`;
}

const activityDotStyles: Record<ActivityStatus, { bg: string; shadow: string; animate: boolean }> = {
  stalled: { bg: '#94a3b8', shadow: '0 0 0 2px rgba(148,163,184,0.3)', animate: true },
  overdue: { bg: '#ef4444', shadow: '0 0 0 2px rgba(239,68,68,0.3)', animate: false },
  today: { bg: '#f59e0b', shadow: '0 0 0 2px rgba(245,158,11,0.3)', animate: false },
  scheduled: { bg: '#22c55e', shadow: '0 0 0 2px rgba(34,197,94,0.3)', animate: false },
};

export default function Pipeline() {
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [scheduleForDeal, setScheduleForDeal] = useState<string | null>(null);
  const { user } = useAuth();
  const { deals, updateDeal, deleteDeal, scheduledActivities, loading } = useData();

  if (loading) return <div><Header title="Pipeline de Vendas" /><LoadingSpinner /></div>;
  const userDeals = user ? filterByOwnership(deals, user) : deals;

  const getDealsByStage = (stage: DealStage) =>
    userDeals.filter((d) => d.stage === stage);

  const getStageTotal = (stage: DealStage) =>
    getDealsByStage(stage).reduce((s, d) => s + d.value, 0);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const dealId = result.draggableId;
    const newStage = result.destination.droppableId as DealStage;

    updateDeal(dealId, {
      stage: newStage,
      probability: newStage === 'fechado_ganho' ? 100 : undefined,
    });
  };

  const totalPipeline = userDeals.filter(d => d.stage !== 'fechado_ganho' && d.stage !== 'fechado_perdido').reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <Header
        title="Pipeline de Vendas"
        subtitle={`Valor total no pipeline: R$ ${totalPipeline.toLocaleString('pt-BR')}`}
      />

      <div className="p-8">
        <div className="flex justify-end mb-4">
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg" style={{ backgroundColor: '#3b82f6' }}>
            <Plus className="w-4 h-4" />
            Novo Deal
          </button>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageDeals = getDealsByStage(stage.id);
              const stageTotal = getStageTotal(stage.id);
              return (
                <div key={stage.id} className="shrink-0 w-72">
                  {/* Stage Header */}
                  <div
                    className="rounded-t-xl p-4 border border-b-0 border-slate-200 dark:border-slate-700"
                    style={{ backgroundColor: stage.headerBg }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: stage.dotColor }}
                        />
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{stage.label}</h3>
                      </div>
                      <span className="text-xs bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium px-2 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400" style={{ marginLeft: '18px' }}>
                      R$ {stageTotal.toLocaleString('pt-BR')}
                    </p>
                  </div>

                  {/* Stage Body */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="rounded-b-xl border border-slate-200 dark:border-slate-700 p-3 space-y-3 transition-colors"
                        style={{
                          minHeight: '400px',
                          backgroundColor: snapshot.isDraggingOver ? 'var(--surface-active)' : 'var(--surface-secondary)',
                        }}
                      >
                        {stageDeals.map((deal, index) => {
                          const actStatus = getActivityStatus(deal, scheduledActivities);
                          const actTooltip = getActivityTooltip(deal, scheduledActivities);
                          const dotStyle = activityDotStyles[actStatus];
                          return (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="group bg-white dark:bg-slate-800 rounded-lg p-4 transition-shadow"
                                style={{
                                  ...provided.draggableProps.style,
                                  border: snapshot.isDragging ? '1px solid #93c5fd' : '1px solid var(--border-primary)',
                                  boxShadow: snapshot.isDragging ? '0 10px 25px -5px rgba(0,0,0,0.1)' : 'none',
                                }}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-block w-2 h-2 rounded-full shrink-0${dotStyle.animate ? ' animate-pulse' : ''}`}
                                      title={actTooltip}
                                      style={{
                                        backgroundColor: dotStyle.bg,
                                        boxShadow: dotStyle.shadow,
                                      }}
                                    />
                                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug pr-2">
                                      {deal.title}
                                    </h4>
                                  </div>
                                  <div {...provided.dragHandleProps} className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="w-4 h-4" />
                                  </div>
                                </div>

                                <div className="space-y-1.5 mb-3">
                                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <User className="w-3.5 h-3.5" />
                                    {deal.contactName}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Building2 className="w-3.5 h-3.5" />
                                    {deal.company}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                                  <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                                    <Calendar className="w-3 h-3" />
                                    {deal.expectedClose}
                                  </div>
                                  <span className="text-sm font-bold text-blue-600">
                                    R$ {(deal.value / 1000).toFixed(0)}k
                                  </span>
                                </div>

                                {/* Probability bar */}
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-slate-400 dark:text-slate-500 font-medium" style={{ fontSize: '10px' }}>Probabilidade</span>
                                    <span className="text-slate-500 dark:text-slate-400 font-semibold" style={{ fontSize: '10px' }}>{deal.probability}%</span>
                                  </div>
                                  <div className="w-full rounded-full overflow-hidden" style={{ height: '6px', backgroundColor: 'var(--surface-tertiary)' }}>
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${deal.probability}%`,
                                        backgroundColor: getProbabilityColor(deal.probability),
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditDeal(deal); }}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors"
                                  >
                                    <Pencil className="w-3 h-3" /> Editar
                                  </button>
                                  <button
                                    onClick={() => setScheduleForDeal(deal.id)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 rounded transition-colors"
                                  >
                                    <CalendarPlus className="w-3 h-3" /> Atividade
                                  </button>
                                  <button
                                    onClick={() => { if (confirm('Remover este deal?')) deleteDeal(deal.id); }}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" /> Remover
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
      <DealModal open={showModal || !!editDeal} onClose={() => { setShowModal(false); setEditDeal(null); }} deal={editDeal || undefined} />
      <ScheduleActivityModal
        open={!!scheduleForDeal}
        onClose={() => setScheduleForDeal(null)}
        dealId={scheduleForDeal || undefined}
      />
    </div>
  );
}
