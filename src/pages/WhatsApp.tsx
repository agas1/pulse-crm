import { useState } from 'react';
import { MessageCircle, Send, Phone, Search, Clock, CheckCheck } from 'lucide-react';
import Header from '../layouts/Header';
import { whatsappConversations } from '../data/mockData';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Ativo', color: '#16a34a', bg: 'var(--tint-green)' },
  waiting: { label: 'Aguardando', color: '#d97706', bg: 'var(--tint-amber)' },
  closed: { label: 'Encerrado', color: '#64748b', bg: 'var(--tint-slate)' },
};

const statusDotColor: Record<string, string> = {
  active: '#22c55e',
  waiting: '#eab308',
  closed: '#94a3b8',
};

function formatTime(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length >= 2) return parts[1];
  return dateStr;
}

function formatDate(dateStr: string) {
  const parts = dateStr.split(' ');
  if (parts.length >= 1) {
    const [, month, day] = parts[0].split('-');
    return `${day}/${month}`;
  }
  return dateStr;
}

export default function WhatsApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const filtered = whatsappConversations.filter((c) =>
    c.contactName.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPhone.includes(search) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const selected = whatsappConversations.find((c) => c.id === selectedId) || null;

  const handleSend = () => {
    if (!messageInput.trim()) return;
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="WhatsApp" subtitle="Conversas e mensagens" />

      <div className="flex flex-1 min-h-0">
        {/* Left Panel - Conversation List */}
        <div className="w-96 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar conversas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma conversa encontrada</p>
              </div>
            ) : (
              filtered.map((conversation) => {
                const isSelected = selectedId === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className="w-full text-left px-4 py-3.5 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--surface-tertiary)' : undefined,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <img
                          src={conversation.contactAvatar}
                          alt={conversation.contactName}
                          className="w-11 h-11 rounded-full object-cover"
                        />
                        <span
                          className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800"
                          style={{ backgroundColor: statusDotColor[conversation.status] }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {conversation.contactName}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0 ml-2">
                            {formatDate(conversation.lastMessageDate)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate pr-2">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unread > 0 && (
                            <span
                              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: '#22c55e' }}
                            >
                              {conversation.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel - Chat View */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
          {selected ? (
            <>
              <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src={selected.contactAvatar}
                    alt={selected.contactName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selected.contactName}</h3>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">{selected.contactPhone}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: statusConfig[selected.status].bg,
                          color: statusConfig[selected.status].color,
                        }}
                      >
                        {statusConfig[selected.status].label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                    <Phone className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="max-w-3xl mx-auto space-y-3">
                  {selected.messages.map((message) => {
                    const isSent = message.direction === 'sent';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className="max-w-md rounded-2xl px-4 py-2.5 shadow-sm"
                          style={
                            isSent
                              ? { backgroundColor: '#3b82f6', color: '#ffffff' }
                              : {
                                  backgroundColor: 'var(--surface-primary)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-primary)',
                                }
                          }
                        >
                          <p className="text-sm leading-relaxed">{message.content}</p>
                          <div
                            className={`flex items-center gap-1 mt-1 ${
                              isSent ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            <Clock
                              className="w-3 h-3"
                              style={{ color: isSent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: isSent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}
                            >
                              {formatTime(message.date)}
                            </span>
                            {isSent && (
                              <CheckCheck
                                className="w-3.5 h-3.5 ml-0.5"
                                style={{ color: 'rgba(255,255,255,0.7)' }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-6 py-4 shrink-0">
                <div className="max-w-3xl mx-auto flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite uma mensagem..."
                      rows={1}
                      className="w-full resize-none px-4 py-3 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all dark:text-slate-100 dark:placeholder-slate-500"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={!messageInput.trim()}
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white transition-colors disabled:opacity-40"
                    style={{ backgroundColor: '#3b82f6' }}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ backgroundColor: 'var(--tint-blue)' }}
                >
                  <MessageCircle className="w-10 h-10" style={{ color: '#3b82f6' }} />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Selecione uma conversa
                </h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs">
                  Escolha uma conversa na lista ao lado para visualizar as mensagens e continuar o atendimento.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
