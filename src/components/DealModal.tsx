import { useState, type FormEvent } from 'react';
import type { Deal, DealStage } from '../data/types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  deal?: Deal;
  defaultContactId?: string;
}

const stages: { id: DealStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'contato_feito', label: 'Contato Feito' },
  { id: 'proposta_enviada', label: 'Proposta Enviada' },
  { id: 'negociacao', label: 'Negociacao' },
  { id: 'fechado_ganho', label: 'Fechado (Ganho)' },
  { id: 'fechado_perdido', label: 'Fechado (Perdido)' },
];

export default function DealModal({ open, onClose, deal, defaultContactId }: Props) {
  const { contacts, addDeal, updateDeal } = useData();
  const { user } = useAuth();
  const isEdit = !!deal;

  const [title, setTitle] = useState(deal?.title || '');
  const [contactId, setContactId] = useState(deal?.contactId || defaultContactId || '');
  const [value, setValue] = useState(String(deal?.value || ''));
  const [stage, setStage] = useState<DealStage>(deal?.stage || 'lead');
  const [probability, setProbability] = useState(String(deal?.probability ?? 20));
  const [expectedClose, setExpectedClose] = useState(deal?.expectedClose || '');

  const selectedContact = contacts.find((c) => c.id === contactId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !contactId) return;

    const payload: Record<string, unknown> = {
      title: title.trim(),
      contactId,
      contactName: selectedContact?.name || '',
      company: selectedContact?.company || '',
      value: Number(value) || 0,
      stage,
      probability: Number(probability) || 20,
      expectedClose,
    };
    if (isEdit && deal?.assignedTo) {
      payload.assignedTo = deal.assignedTo;
    }

    if (isEdit && deal) {
      updateDeal(deal.id, payload);
    } else {
      addDeal(payload as any);
    }
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Deal' : 'Novo Deal'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Título *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Licença Enterprise" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Contato *</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputClass} required>
            <option value="">Selecione um contato</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Valor (R$) *</label>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="50000" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Etapa</label>
            <select value={stage} onChange={(e) => setStage(e.target.value as DealStage)} className={inputClass}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Probabilidade (%)</label>
            <input type="number" min="0" max="100" value={probability} onChange={(e) => setProbability(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Previsão de fechamento</label>
            <input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors" style={{ backgroundColor: '#3b82f6' }}>
            {isEdit ? 'Salvar' : 'Criar Deal'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
