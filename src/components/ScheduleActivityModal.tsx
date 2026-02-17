import { useState, useEffect, type FormEvent } from 'react';
import type { ScheduledActivity } from '../data/types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  dealId?: string;
  contactId?: string;
}

const activityTypes: { id: ScheduledActivity['type']; label: string }[] = [
  { id: 'call', label: 'Ligacao' },
  { id: 'meeting', label: 'Reuniao' },
  { id: 'email', label: 'E-mail' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'task', label: 'Tarefa' },
  { id: 'demo', label: 'Demonstracao' },
];

export default function ScheduleActivityModal({ open, onClose, dealId, contactId }: Props) {
  const { addScheduledActivity } = useData();
  const { user } = useAuth();

  const [type, setType] = useState<ScheduledActivity['type']>('call');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');

  useEffect(() => {
    if (open) {
      setType('call');
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');
    }
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    await addScheduledActivity({
      type,
      title: title.trim(),
      description: description.trim(),
      dealId: dealId || undefined,
      contactId: contactId || undefined,
      assignedTo: user?.id || '',
      dueDate,
      dueTime: dueTime || undefined,
    });
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title="Agendar Atividade">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as ScheduledActivity['type'])} className={inputClass}>
            {activityTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Titulo *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Ligar para confirmar reuniao"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Descricao</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes da atividade..."
            className={inputClass}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Data *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Horario</label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#3b82f6' }}
          >
            Agendar
          </button>
        </div>
      </form>
    </Modal>
  );
}
