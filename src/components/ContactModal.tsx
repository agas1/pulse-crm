import { useState, type FormEvent } from 'react';
import type { Contact } from '../data/types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  contact?: Contact;
}

export default function ContactModal({ open, onClose, contact }: Props) {
  const { addContact, updateContact } = useData();
  const { user } = useAuth();
  const isEdit = !!contact;

  const [name, setName] = useState(contact?.name || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [phone, setPhone] = useState(contact?.phone || '');
  const [company, setCompany] = useState(contact?.company || '');
  const [role, setRole] = useState(contact?.role || '');
  const [status, setStatus] = useState<Contact['status']>(contact?.status || 'lead');
  const [value, setValue] = useState(String(contact?.value || ''));
  const [tags, setTags] = useState(contact?.tags.join(', ') || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const payload: Record<string, unknown> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      company: company.trim(),
      role: role.trim(),
      status,
      value: Number(value) || 0,
      lastContact: new Date().toISOString().split('T')[0],
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    // Only send assignedTo when editing (preserve existing assignment); new contacts use backend default (auth user)
    if (isEdit && contact?.assignedTo) {
      payload.assignedTo = contact.assignedTo;
    }

    if (isEdit && contact) {
      updateContact(contact.id, payload);
    } else {
      addContact(payload);
    }
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500';
  const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5';

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Contato' : 'Novo Contato'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>E-mail *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Empresa</label>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Cargo</label>
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ex: Diretor de TI" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as Contact['status'])} className={inputClass}>
              <option value="lead">Lead</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Valor estimado (R$)</label>
            <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Tags</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Separadas por vírgula" className={inputClass} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors" style={{ backgroundColor: '#3b82f6' }}>
            {isEdit ? 'Salvar' : 'Criar Contato'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
