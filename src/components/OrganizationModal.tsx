import { useState, useEffect, type FormEvent } from 'react';
import type { Organization } from '../data/types';
import { useData } from '../contexts/DataContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  organization?: Organization;
}

export default function OrganizationModal({ open, onClose, organization }: Props) {
  const { addOrganization, updateOrganization } = useData();
  const isEdit = !!organization;

  const [name, setName] = useState(organization?.name || '');
  const [industry, setIndustry] = useState(organization?.industry || '');
  const [website, setWebsite] = useState(organization?.website || '');
  const [phone, setPhone] = useState(organization?.phone || '');
  const [address, setAddress] = useState(organization?.address || '');
  const [employeeCount, setEmployeeCount] = useState(String(organization?.employeeCount || ''));
  const [annualRevenue, setAnnualRevenue] = useState(String(organization?.annualRevenue || ''));
  const [notes, setNotes] = useState(organization?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(organization?.name || '');
    setIndustry(organization?.industry || '');
    setWebsite(organization?.website || '');
    setPhone(organization?.phone || '');
    setAddress(organization?.address || '');
    setEmployeeCount(String(organization?.employeeCount || ''));
    setAnnualRevenue(String(organization?.annualRevenue || ''));
    setNotes(organization?.notes || '');
  }, [organization]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        industry: industry.trim(),
        website: website.trim(),
        phone: phone.trim(),
        address: address.trim(),
        employeeCount: Number(employeeCount) || 0,
        annualRevenue: Number(annualRevenue) || 0,
        notes: notes.trim(),
      };

      if (isEdit && organization) {
        await updateOrganization(organization.id, payload);
      } else {
        await addOrganization(payload);
      }
      onClose();
    } catch {
      // error handling is done at the context level
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Organização' : 'Nova Organização'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da organização"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Indústria</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="Ex: Tecnologia"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Website</label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://exemplo.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 3000-0000"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Endereço</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, cidade - UF"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nº de Funcionários</label>
            <input
              type="number"
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              placeholder="0"
              min="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Receita Anual (R$)</label>
            <input
              type="number"
              value={annualRevenue}
              onChange={(e) => setAnnualRevenue(e.target.value)}
              placeholder="0"
              min="0"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações sobre a organização..."
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
            {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Organização'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
