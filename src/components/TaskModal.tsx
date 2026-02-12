import { useState, useEffect, type FormEvent } from 'react';
import type { Task } from '../data/types';
import { useData } from '../contexts/DataContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  task?: Task;
  defaultContactId?: string;
}

const types: { id: Task['type']; label: string }[] = [
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'call', label: 'Ligação' },
  { id: 'meeting', label: 'Reunião' },
  { id: 'email', label: 'E-mail' },
  { id: 'other', label: 'Outro' },
];

export default function TaskModal({ open, onClose, task, defaultContactId }: Props) {
  const { contacts, addTask, updateTask } = useData();
  const isEdit = !!task;

  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [contactId, setContactId] = useState(task?.contactId || defaultContactId || '');
  const [type, setType] = useState<Task['type']>(task?.type || 'follow_up');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [dueTime, setDueTime] = useState(task?.dueTime || '');

  useEffect(() => {
    setTitle(task?.title || '');
    setDescription(task?.description || '');
    setContactId(task?.contactId || defaultContactId || '');
    setType(task?.type || 'follow_up');
    setPriority(task?.priority || 'medium');
    setDueDate(task?.dueDate || '');
    setDueTime(task?.dueTime || '');
  }, [task, defaultContactId]);

  const selectedContact = contacts.find((c) => c.id === contactId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      contactId: contactId || undefined,
      contactName: selectedContact?.name || undefined,
      type,
      priority,
      status: task?.status || 'pending' as Task['status'],
      dueDate,
      dueTime: dueTime || undefined,
      automated: false,
    };
    if (isEdit && task?.assignedTo) {
      payload.assignedTo = task.assignedTo;
    }

    if (isEdit && task) {
      updateTask(task.id, payload);
    } else {
      addTask(payload as any);
    }
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Tarefa' : 'Nova Tarefa'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Título *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Ligar para cliente" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes da tarefa..." rows={2} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Contato (opcional)</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass}>
            <option value="">Nenhum contato</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as Task['type'])} className={inputClass}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])} className={inputClass}>
              <option value="low">Normal</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Data *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} required />
          </div>
        </div>
        <div className="w-1/3">
          <label className={labelClass}>Horário</label>
          <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className={inputClass} />
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors" style={{ backgroundColor: '#3b82f6' }}>
            {isEdit ? 'Salvar' : 'Criar Tarefa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
