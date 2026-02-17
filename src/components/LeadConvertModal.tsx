import { useState, useEffect, type FormEvent } from 'react';
import { CheckCircle } from 'lucide-react';
import type { Lead, DealStage } from '../data/types';
import { useData } from '../contexts/DataContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: Lead;
}

const stages: { id: DealStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'contato_feito', label: 'Contato Feito' },
  { id: 'proposta_enviada', label: 'Proposta Enviada' },
  { id: 'negociacao', label: 'Negociacao' },
  { id: 'fechado_ganho', label: 'Fechado (Ganho)' },
  { id: 'fechado_perdido', label: 'Fechado (Perdido)' },
];

export default function LeadConvertModal({ open, onClose, lead }: Props) {
  const { convertLead } = useData();

  const [dealTitle, setDealTitle] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealStage, setDealStage] = useState<string>('lead');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setDealTitle(lead.company ? `Deal - ${lead.company}` : `Deal - ${lead.name}`);
      setDealValue('');
      setDealStage('lead');
      setSaving(false);
      setSuccess(false);
    }
  }, [lead, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealValue) return;

    setSaving(true);
    try {
      await convertLead(lead.id, {
        dealTitle: dealTitle.trim(),
        dealValue: Number(dealValue),
        dealStage,
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title="Converter Lead">
      {success ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Lead convertido com sucesso!
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Contato e deal criados.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lead summary */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Lead
            </p>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {lead.name}
              </p>
              {lead.company && (
                <p className="text-sm text-slate-600 dark:text-slate-300">{lead.company}</p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lead.email}
                {lead.phone ? ` \u00B7 ${lead.phone}` : ''}
              </p>
            </div>
          </div>

          {/* Deal fields */}
          <div>
            <label className={labelClass}>Titulo do Deal *</label>
            <input
              value={dealTitle}
              onChange={(e) => setDealTitle(e.target.value)}
              placeholder="Ex: Licenca Enterprise"
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Valor (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="50000"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Etapa</label>
              <select
                value={dealStage}
                onChange={(e) => setDealStage(e.target.value)}
                className={inputClass}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
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
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#16a34a' }}
            >
              {saving ? 'Convertendo...' : 'Converter Lead'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
