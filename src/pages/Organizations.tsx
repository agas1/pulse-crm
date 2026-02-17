import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Building2,
  Globe,
  Phone,
  Users,
  DollarSign,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  Briefcase,
  UserCircle,
} from 'lucide-react';
import Header from '../layouts/Header';
import { useData } from '../contexts/DataContext';
import OrganizationModal from '../components/OrganizationModal';
import LoadingSpinner from '../components/LoadingSpinner';
import type { Organization } from '../data/types';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatRevenue(value: number): string {
  if (value >= 1_000_000_000) return `R$ ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  if (value > 0) return `R$ ${value.toLocaleString('pt-BR')}`;
  return '—';
}

function formatDealValue(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  if (value > 0) return `R$ ${value.toLocaleString('pt-BR')}`;
  return 'R$ 0';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Organizations() {
  const { organizations, contacts, deals, deleteOrganization, loading } = useData();

  const [search, setSearch] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('Todas');
  const [showModal, setShowModal] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | undefined>(undefined);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* unique industries for filter */
  const industries = useMemo(() => {
    const set = new Set<string>();
    organizations.forEach((o) => {
      if (o.industry) set.add(o.industry);
    });
    return ['Todas', ...Array.from(set).sort()];
  }, [organizations]);

  /* filtered list */
  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      const q = search.toLowerCase();
      const matchesSearch =
        org.name.toLowerCase().includes(q) ||
        org.industry.toLowerCase().includes(q) ||
        org.website.toLowerCase().includes(q);
      const matchesIndustry = filterIndustry === 'Todas' || org.industry === filterIndustry;
      return matchesSearch && matchesIndustry;
    });
  }, [organizations, search, filterIndustry]);

  /* helpers to compute related counts */
  const orgContacts = (orgId: string) => contacts.filter((c) => c.organizationId === orgId);
  const orgDeals = (orgId: string) => deals.filter((d) => d.organizationId === orgId);
  const orgDealsValue = (orgId: string) =>
    orgDeals(orgId).reduce((sum, d) => sum + d.value, 0);

  /* actions */
  const handleEdit = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditOrg(org);
    setShowModal(true);
  };

  const handleDelete = async (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Tem certeza que deseja excluir "${org.name}"?`)) return;
    await deleteOrganization(org.id);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditOrg(undefined);
  };

  const toggleExpand = (orgId: string) => {
    setExpandedId((prev) => (prev === orgId ? null : orgId));
  };

  if (loading) {
    return (
      <div>
        <Header title="Organizações" />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Organizações"
        subtitle={`${organizations.length} organização${organizations.length !== 1 ? 'ões' : ''} cadastrada${organizations.length !== 1 ? 's' : ''}`}
      />

      <div className="p-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar organizações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-400"
              />
            </div>
            {/* Industry filter */}
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100"
            >
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setEditOrg(undefined);
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Organização
          </button>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nenhuma organização encontrada
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              {search || filterIndustry !== 'Todas'
                ? 'Tente ajustar sua busca ou filtro.'
                : 'Cadastre sua primeira organização clicando no botão acima.'}
            </p>
          </div>
        )}

        {/* Organization grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((org) => {
            const linkedContacts = orgContacts(org.id);
            const linkedDeals = orgDeals(org.id);
            const totalDealValue = orgDealsValue(org.id);
            const isExpanded = expandedId === org.id;

            return (
              <div
                key={org.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-500/30 transition-all"
              >
                {/* Card header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => toggleExpand(org.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {org.name}
                        </h3>
                        {org.industry && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            {org.industry}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button
                        onClick={(e) => handleEdit(org, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-blue-500"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(org, e)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-400 dark:text-slate-500 hover:text-red-500"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div className="space-y-1.5 mb-3">
                    {org.website && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        <a
                          href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="truncate hover:text-blue-500 transition-colors"
                        >
                          {org.website}
                        </a>
                      </div>
                    )}
                    {org.phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{org.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" title="Funcionários">
                        <Users className="w-3.5 h-3.5" />
                        <span>{org.employeeCount > 0 ? org.employeeCount : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" title="Receita anual">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{formatRevenue(org.annualRevenue)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400" title="Contatos vinculados">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{linkedContacts.length}</span> contato{linkedContacts.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400" title="Deals vinculados">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{linkedDeals.length}</span> deal{linkedDeals.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Total deal value */}
                  {totalDealValue > 0 && (
                    <div className="mt-2 text-right">
                      <span className="text-sm font-semibold" style={{ color: '#16a34a' }}>
                        {formatDealValue(totalDealValue)} em deals
                      </span>
                    </div>
                  )}

                  {/* Expand indicator */}
                  <div className="flex justify-center mt-2">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700">
                    {/* Full info */}
                    <div className="pt-4 space-y-3">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Detalhes
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        {org.address && (
                          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
                            <span>{org.address}</span>
                          </div>
                        )}
                        {org.employeeCount > 0 && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <Users className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                            <span>{org.employeeCount.toLocaleString('pt-BR')} funcionários</span>
                          </div>
                        )}
                        {org.annualRevenue > 0 && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                            <span>Receita anual: {formatRevenue(org.annualRevenue)}</span>
                          </div>
                        )}
                        {org.notes && (
                          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400 dark:text-slate-500" />
                            <span className="whitespace-pre-wrap">{org.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Linked contacts */}
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Contatos ({linkedContacts.length})
                      </h4>
                      {linkedContacts.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Nenhum contato vinculado
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {linkedContacts.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs"
                            >
                              <UserCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate block">
                                  {c.name}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 truncate block">
                                  {c.email}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Linked deals */}
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Deals ({linkedDeals.length})
                      </h4>
                      {linkedDeals.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                          Nenhum deal vinculado
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {linkedDeals.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                                  {d.title}
                                </span>
                              </div>
                              <span className="font-semibold text-slate-700 dark:text-slate-200 flex-shrink-0 ml-2">
                                {formatDealValue(d.value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <OrganizationModal open={showModal} onClose={handleCloseModal} organization={editOrg} />
    </div>
  );
}
