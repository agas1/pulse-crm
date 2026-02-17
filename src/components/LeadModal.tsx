import { useState, useEffect, type FormEvent } from 'react';
import type { Lead } from '../data/types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
}

export default function LeadModal({ open, onClose, lead }: Props) {
  const { addLead, updateLead, organizations } = useData();
  const { user } = useAuth();
  const isEdit = !!lead;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [source, setSource] = useState('manual');
  const [score, setScore] = useState<Lead['score']>('warm');
  const [status, setStatus] = useState<Lead['status']>('new');
  const [notes, setNotes] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(lead?.name || '');
      setEmail(lead?.email || '');
      setPhone(lead?.phone || '');
      setCompany(lead?.company || '');
      setSource(lead?.source || 'manual');
      setScore(lead?.score || 'warm');
      setStatus(lead?.status || 'new');
      setNotes(lead?.notes || '');
      setOrganizationId(lead?.organizationId || '');
      setJobTitle(lead?.jobTitle || '');
      setCompanySize(lead?.companySize || '');
      setSaving(false);
    }
  }, [lead, open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        source,
        score,
        status,
        notes: notes.trim(),
        assignedTo: lead?.assignedTo || user?.id || '',
        ...(organizationId ? { organizationId } : {}),
        jobTitle: jobTitle.trim(),
        companySize,
      };

      if (isEdit && lead) {
        await updateLead(lead.id, payload);
      } else {
        await addLead(payload);
      }
      onClose();
    } catch {
      // error handled by context
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Lead' : 'Novo Lead'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>E-mail *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className={inputClass}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-0000"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Empresa</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nome da empresa"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Origem</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className={inputClass}
            >
              <option value="website">Website</option>
              <option value="facebook">Facebook</option>
              <option value="manual">Manual</option>
              <option value="referral">Indicacao</option>
              <option value="csv">CSV</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Score</label>
            <select
              value={score}
              onChange={(e) => setScore(e.target.value as Lead['score'])}
              className={inputClass}
            >
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Cargo</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Ex: CEO, Diretor Comercial..."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Tamanho da Empresa</label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              <option value="1-10">1-10 funcionarios</option>
              <option value="11-50">11-50 funcionarios</option>
              <option value="51-200">51-200 funcionarios</option>
              <option value="201-1000">201-1000 funcionarios</option>
              <option value="1000+">1000+ funcionarios</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Lead['status'])}
              className={inputClass}
            >
              <option value="new">Novo</option>
              <option value="contacted">Contatado</option>
              <option value="qualified">Qualificado</option>
              <option value="disqualified">Desqualificado</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Organizacao</label>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className={inputClass}
            >
              <option value="">Nenhuma</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observacoes sobre o lead..."
            rows={3}
            className={inputClass}
            style={{ resize: 'vertical' }}
          />
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
            style={{ backgroundColor: '#3b82f6' }}
          >
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
