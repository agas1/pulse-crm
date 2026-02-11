import { useState } from 'react';
import { Mail, Send, Star, ArrowLeft, Search, Paperclip, Reply } from 'lucide-react';
import Header from '../layouts/Header';
import { useData } from '../contexts/DataContext';

type Tab = 'all' | 'received' | 'sent';

export default function Emails() {
  const { emails, updateEmail, addEmail } = useData();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) || null;

  const filteredEmails = emails
    .filter((e) => {
      if (activeTab === 'received') return e.direction === 'received';
      if (activeTab === 'sent') return e.direction === 'sent';
      return true;
    })
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.contactName.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.preview.toLowerCase().includes(q)
      );
    });

  const toggleStar = (id: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    const email = emails.find((e) => e.id === id);
    if (email) {
      updateEmail(id, { starred: !email.starred });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSendCompose = async () => {
    if (!composeTo.trim() || !composeSubject.trim()) return;
    await addEmail({
      contactId: null as unknown as string,
      contactName: composeTo.split('@')[0],
      contactEmail: composeTo.trim(),
      subject: composeSubject.trim(),
      preview: composeBody.trim().slice(0, 100),
      body: composeBody.trim(),
      date: new Date().toISOString(),
      read: true,
      direction: 'sent' as const,
      starred: false,
    });
    setShowCompose(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'received', label: 'Recebidos' },
    { key: 'sent', label: 'Enviados' },
  ];

  const unreadCount = emails.filter((e) => !e.read && e.direction === 'received').length;

  return (
    <div className="flex flex-col h-full">
      <Header title="E-mails" subtitle={`${unreadCount} mensagens não lidas`} />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Email List */}
        <div className="w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setShowCompose(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              Novo E-mail
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar e-mails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex border-b border-slate-200 dark:border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 px-4 py-2.5 text-sm font-medium transition-colors relative"
                style={{
                  color: activeTab === tab.key ? '#2563eb' : 'var(--text-tertiary)',
                }}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t" style={{ backgroundColor: '#2563eb' }} />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                <Mail className="w-10 h-10 mb-3" />
                <p className="text-sm">Nenhum e-mail encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredEmails.map((email) => {
                  const isSelected = selectedEmailId === email.id;
                  const isStarred = email.starred;
                  return (
                    <div
                      key={email.id}
                      onClick={() => setSelectedEmailId(email.id)}
                      className="flex gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      style={{
                        backgroundColor: isSelected ? 'var(--surface-active)' : undefined,
                        borderRight: isSelected ? '2px solid #2563eb' : undefined,
                      }}
                    >
                      <div className="flex items-start pt-1.5 shrink-0">
                        {!email.read && email.direction === 'received' ? (
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2563eb' }} />
                        ) : (
                          <span className="w-2.5 h-2.5" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className="text-sm truncate"
                            style={{
                              fontWeight: !email.read && email.direction === 'received' ? 600 : 500,
                              color: !email.read && email.direction === 'received' ? 'var(--text-primary)' : 'var(--text-secondary)',
                            }}
                          >
                            {email.contactName}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                            {formatDate(email.date)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {email.direction === 'sent' && (
                            <Send className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                          )}
                          <p
                            className="text-sm truncate"
                            style={{
                              fontWeight: !email.read && email.direction === 'received' ? 600 : 400,
                              color: !email.read && email.direction === 'received' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                            }}
                          >
                            {email.subject}
                          </p>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{email.preview}</p>
                      </div>

                      <button
                        onClick={(ev) => toggleStar(email.id, ev)}
                        className="shrink-0 mt-0.5"
                      >
                        <Star
                          className="w-4 h-4 transition-colors"
                          style={{
                            fill: isStarred ? '#fbbf24' : 'none',
                            color: isStarred ? '#fbbf24' : '#cbd5e1',
                          }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Email Detail */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-900 flex flex-col overflow-hidden">
          {selectedEmail ? (
            <>
              <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-5">
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setSelectedEmailId(null)}
                    className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors lg:hidden"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex-1">
                    {selectedEmail.subject}
                  </h3>
                  <button
                    onClick={(ev) => toggleStar(selectedEmail.id, ev)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <Star
                      className="w-5 h-5"
                      style={{
                        fill: selectedEmail.starred ? '#fbbf24' : 'none',
                        color: selectedEmail.starred ? '#fbbf24' : '#cbd5e1',
                      }}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    {selectedEmail.contactName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {selectedEmail.contactName}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        &lt;{selectedEmail.contactEmail}&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedEmail.direction === 'sent' ? (
                        <span>
                          Para: {selectedEmail.contactName} &lt;{selectedEmail.contactEmail}&gt;
                        </span>
                      ) : (
                        <span>Para: voce@pulsecrm.com</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatFullDate(selectedEmail.date)}
                    </p>
                    <span
                      className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor:
                          selectedEmail.direction === 'received' ? 'var(--tint-blue)' : 'var(--tint-green)',
                        color:
                          selectedEmail.direction === 'received' ? '#3b82f6' : '#16a34a',
                      }}
                    >
                      {selectedEmail.direction === 'received' ? 'Recebido' : 'Enviado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm">
                  <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    {selectedEmail.body}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <Reply className="w-4 h-4" />
                  Responder
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <Send className="w-4 h-4" />
                  Encaminhar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                  <Paperclip className="w-4 h-4" />
                  Anexos
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                style={{ backgroundColor: 'var(--surface-tertiary)' }}
              >
                <Mail className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-1">
                Selecione um e-mail
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Escolha uma mensagem da lista para visualizar
              </p>
            </div>
          )}
        </div>
      </div>

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Novo E-mail</h3>
              <button
                onClick={() => setShowCompose(false)}
                className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Para</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="destinatario@email.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Assunto</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Assunto do e-mail"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Mensagem</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-xl">
              <button className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                <Paperclip className="w-4 h-4" />
                Anexar arquivo
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendCompose}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
