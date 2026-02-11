import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Building2, Briefcase,
  Calendar, DollarSign, Send, Tag, MessageCircle,
  ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2,
  Zap, Clock,
} from 'lucide-react';
import Header from '../layouts/Header';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import DealModal from '../components/DealModal';
import { whatsappConversations } from '../data/mockData';

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  active: { label: 'Ativo', bg: 'var(--tint-green)', color: '#16a34a', border: '#bbf7d0' },
  lead: { label: 'Lead', bg: 'var(--tint-blue)', color: '#2563eb', border: '#bfdbfe' },
  inactive: { label: 'Inativo', bg: 'var(--tint-slate)', color: '#64748b', border: 'var(--border-primary)' },
};

const stageConfig: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: '#64748b' },
  contato_feito: { label: 'Contato Feito', color: '#3b82f6' },
  proposta_enviada: { label: 'Proposta Enviada', color: '#f59e0b' },
  negociacao: { label: 'Negociacao', color: '#8b5cf6' },
  fechado_ganho: { label: 'Fechado (Ganho)', color: '#16a34a' },
  fechado_perdido: { label: 'Fechado (Perdido)', color: '#ef4444' },
};

const timelineIcons: Record<string, { icon: typeof Mail; bg: string; color: string }> = {
  email_sent: { icon: ArrowUpRight, bg: 'var(--tint-blue)', color: '#3b82f6' },
  email_received: { icon: ArrowDownLeft, bg: 'var(--tint-green)', color: '#22c55e' },
  note: { icon: FileText, bg: 'var(--tint-amber)', color: '#f59e0b' },
  call: { icon: Phone, bg: 'var(--tint-green)', color: '#22c55e' },
  meeting: { icon: Calendar, bg: 'var(--tint-purple)', color: '#8b5cf6' },
  whatsapp: { icon: MessageCircle, bg: 'var(--tint-green)', color: '#22c55e' },
  status_change: { icon: Zap, bg: 'var(--tint-red)', color: '#ef4444' },
  task_done: { icon: CheckCircle2, bg: 'var(--tint-green)', color: '#16a34a' },
  deal_created: { icon: DollarSign, bg: 'var(--tint-blue)', color: '#3b82f6' },
  deal_stage_change: { icon: ArrowUpRight, bg: 'var(--tint-purple)', color: '#8b5cf6' },
};

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'timeline' | 'deals' | 'notes'>('timeline');
  const [noteText, setNoteText] = useState('');
  const [showDealModal, setShowDealModal] = useState(false);
  useTheme();
  const { contacts, deals, addNote, getTimelineForContact } = useData();
  const { user } = useAuth();
  const contact = contacts.find((c) => c.id === id);
  const [timeline, setTimeline] = useState<Array<{ id: string; type: string; title: string; description: string; date: string; meta?: string }>>([]);

  useEffect(() => {
    if (!contact) return;
    let cancelled = false;
    getTimelineForContact(contact.id).then((data) => {
      if (!cancelled) setTimeline(data || []);
    }).catch(() => {
      if (!cancelled) setTimeline([]);
    });
    return () => { cancelled = true; };
  }, [contact?.id, getTimelineForContact]);

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-slate-500 dark:text-slate-400">Contato não encontrado</p>
      </div>
    );
  }

  const contactDeals = deals.filter((d) => d.contactId === contact.id);
  const totalValue = contactDeals.reduce((s, d) => s + d.value, 0);
  const status = statusConfig[contact.status];
  const hasWhatsApp = whatsappConversations.some(w => w.contactId === contact.id);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    addNote(contact.id, noteText.trim(), user?.name || 'Você');
    setNoteText('');
  };

  const tabs = [
    { id: 'timeline' as const, label: 'Timeline 360°', count: timeline.length },
    { id: 'deals' as const, label: 'Deals', count: contactDeals.length },
    { id: 'notes' as const, label: 'Anotações', count: contact.notes.length },
  ];

  return (
    <div>
      <Header title="Detalhe do Contato" />

      <div className="p-8">
        <button
          onClick={() => navigate('/contacts')}
          className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-500 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para contatos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <img src={contact.avatar} alt={contact.name} className="w-20 h-20 rounded-full mb-4" style={{ backgroundColor: '#dbeafe' }} />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{contact.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{contact.role}</p>
                <span className="mt-2 px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: status.bg, color: status.color, border: `1px solid ${status.border}` }}>
                  {status.label}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate">{contact.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">{contact.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">{contact.company}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">{contact.role}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">Último contato: {contact.lastContact}</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tags</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {contact.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 text-xs rounded-md font-medium">{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Ações Rápidas</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-all">
                  <Mail className="w-4 h-4" /> Enviar E-mail
                </button>
                {hasWhatsApp && (
                  <button
                    onClick={() => navigate('/channels')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 hover:text-green-600 transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> Abrir Canais
                  </button>
                )}
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-all">
                  <Phone className="w-4 h-4" /> Registrar Ligação
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 hover:text-violet-600 transition-all">
                  <Calendar className="w-4 h-4" /> Agendar Reunião
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Valor Total</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">R$ {totalValue.toLocaleString('pt-BR')}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Deals Ativos</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{contactDeals.filter(d => d.stage !== 'fechado_ganho' && d.stage !== 'fechado_perdido').length}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-violet-500" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Interações</span>
                </div>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{timeline.length}</p>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-6 py-3 text-sm font-medium transition-all relative"
                    style={{
                      color: activeTab === tab.id ? '#2563eb' : 'var(--text-tertiary)',
                      borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent',
                    }}
                  >
                    {tab.label}
                    <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{tab.count}</span>
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Timeline 360° */}
                {activeTab === 'timeline' && (
                  <div className="relative">
                    <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-4">
                      {timeline.map((event) => {
                        const config = timelineIcons[event.type] || timelineIcons.note;
                        const Icon = config.icon;
                        return (
                          <div key={event.id} className="flex gap-4 relative">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10"
                              style={{ backgroundColor: config.bg, color: config.color }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{event.title}</p>
                                <span className="text-xs text-slate-400 dark:text-slate-500">{event.date}</span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{event.description}</p>
                              {event.meta && Object.entries(event.meta).map(([key, val]) => (
                                <span key={key} className="inline-block mt-1 px-2 py-0.5 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs rounded">
                                  {val}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Deals */}
                {activeTab === 'deals' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{contactDeals.length} deals encontrados</span>
                      <button onClick={() => setShowDealModal(true)} className="text-xs text-blue-500 hover:text-blue-600 font-medium">+ Novo Deal</button>
                    </div>
                    {contactDeals.length > 0 ? (
                      <div className="space-y-3">
                        {contactDeals.map((deal) => {
                          const stage = stageConfig[deal.stage];
                          return (
                            <div key={deal.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                              <div>
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{deal.title}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs font-medium" style={{ color: stage.color }}>{stage.label}</span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500">Prob: {deal.probability}%</span>
                                  <span className="text-xs text-slate-400 dark:text-slate-500">Fecha: {deal.expectedClose}</span>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">R$ {deal.value.toLocaleString('pt-BR')}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum deal encontrado</p>
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Crie um novo deal para este contato</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                {activeTab === 'notes' && (
                  <div>
                    <div className="flex gap-3 mb-5">
                      <input
                        type="text"
                        placeholder="Adicionar uma anotação..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                        className="flex-1 px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-500"
                      />
                      <button onClick={handleAddNote} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    {contact.notes.length > 0 ? (
                      <div className="space-y-3">
                        {contact.notes.map((note) => (
                          <div key={note.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg" style={{ borderLeft: '3px solid #93c5fd' }}>
                            <p className="text-sm text-slate-700 dark:text-slate-200">{note.content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-slate-400 dark:text-slate-500">{note.author}</span>
                              <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">{note.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma anotação ainda</p>
                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Adicione a primeira anotação acima</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <DealModal open={showDealModal} onClose={() => setShowDealModal(false)} defaultContactId={contact.id} />
    </div>
  );
}
