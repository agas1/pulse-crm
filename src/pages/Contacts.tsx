import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Mail, Phone } from 'lucide-react';
import Header from '../layouts/Header';
import { useAuth } from '../contexts/AuthContext';
import { filterByOwnership } from '../config/permissions';
import { useData } from '../contexts/DataContext';
import ContactModal from '../components/ContactModal';

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: 'Ativo', bg: 'var(--tint-green)', color: '#16a34a' },
  lead: { label: 'Lead', bg: 'var(--tint-blue)', color: '#2563eb' },
  inactive: { label: 'Inativo', bg: 'var(--tint-slate)', color: '#64748b' },
};

export default function Contacts() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts } = useData();
  const userContacts = user ? filterByOwnership(contacts, user) : contacts;

  const filtered = userContacts.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <Header title="Contatos" subtitle={`${userContacts.length} contatos cadastrados`} />

      <div className="p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar contatos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              {['all', 'active', 'lead', 'inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                  style={{
                    backgroundColor: filterStatus === status ? '#3b82f6' : 'transparent',
                    color: filterStatus === status ? '#ffffff' : 'var(--text-tertiary)',
                  }}
                >
                  {status === 'all' ? 'Todos' : statusConfig[status].label}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>

        {/* Contact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((contact) => {
            const status = statusConfig[contact.status];
            return (
              <div
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={contact.avatar}
                      alt={contact.name}
                      className="w-11 h-11 rounded-full"
                      style={{ backgroundColor: '#dbeafe' }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        {contact.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{contact.role}</p>
                    </div>
                  </div>
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded-full"
                    style={{ backgroundColor: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-3">{contact.company}</p>

                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Mail className="w-3.5 h-3.5" />
                    {contact.email}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                    {contact.phone}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex gap-1.5">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {contact.value > 0 && (
                    <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                      R$ {(contact.value / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <ContactModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
