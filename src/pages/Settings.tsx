import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Shield, Webhook, FileCode, Upload, Key, Globe, Calendar, MessageCircle, Mail, Bell, Zap, RefreshCw, Pencil, Trash2, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import Header from '../layouts/Header';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../data/types';
import CsvImportModal from '../components/CsvImportModal';

const settingsTabs = [
  { id: 'team', label: 'Equipe', icon: UsersIcon },
  { id: 'integrations', label: 'Integrações', icon: Globe },
  { id: 'api', label: 'API & Webhooks', icon: Webhook },
] as const;

type TabId = (typeof settingsTabs)[number]['id'];

const roleConfig: Record<string, { label: string; bg: string; color: string }> = {
  admin: { label: 'Admin', bg: 'var(--tint-purple)', color: '#7c3aed' },
  manager: { label: 'Manager', bg: 'var(--tint-blue)', color: '#2563eb' },
  seller: { label: 'Seller', bg: 'var(--tint-green)', color: '#16a34a' },
};

const planConfig: Record<string, { label: string; bg: string; color: string }> = {
  trial: { label: 'Teste', bg: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b' },
  starter: { label: 'Starter', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  professional: { label: 'Pro', bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' },
  enterprise: { label: 'Enterprise', bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' },
};

const integrations = [
  {
    id: 'gcal',
    name: 'Google Calendar',
    description: 'Sincronize reuniões e eventos diretamente com seu Google Calendar.',
    icon: Calendar,
    color: '#3b82f6',
    connected: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Envie e receba mensagens do WhatsApp diretamente no CRM.',
    icon: MessageCircle,
    color: '#22c55e',
    connected: true,
  },
  {
    id: 'smtp',
    name: 'SMTP E-mail',
    description: 'Configure seu servidor SMTP para envio de e-mails personalizados.',
    icon: Mail,
    color: '#f59e0b',
    connected: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receba notificações de deals e leads diretamente no Slack.',
    icon: Bell,
    color: '#8b5cf6',
    connected: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte o PulseCRM com mais de 5.000 aplicativos via Zapier.',
    icon: Zap,
    color: '#f97316',
    connected: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Importe e sincronize contatos e deals com o HubSpot.',
    icon: RefreshCw,
    color: '#3b82f6',
    connected: false,
  },
];

const endpoints = [
  { method: 'GET', path: '/api/leads', description: 'Listar todos os leads' },
  { method: 'POST', path: '/api/leads', description: 'Criar novo lead' },
  { method: 'GET', path: '/api/deals', description: 'Listar todos os deals' },
  { method: 'POST', path: '/api/deals', description: 'Criar novo deal' },
  { method: 'POST', path: '/api/webhooks', description: 'Registrar webhook' },
];

const methodColors: Record<string, { bg: string; color: string }> = {
  GET: { bg: 'var(--tint-green)', color: '#16a34a' },
  POST: { bg: 'var(--tint-blue)', color: '#2563eb' },
};

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'seller';
  status: 'active' | 'inactive';
}

const emptyForm: UserFormData = { name: '', email: '', password: '', role: 'seller', status: 'active' };

export default function Settings() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('team');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // User management state
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetError, setResetError] = useState('');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setTeamUsers(data.users);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [token, headers]);

  useEffect(() => {
    if (activeTab === 'team') fetchUsers();
  }, [activeTab, fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData(emptyForm);
    setFormError('');
    setShowPassword(false);
    setShowUserModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: '', role: user.role, status: user.status });
    setFormError('');
    setShowPassword(false);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Nome e e-mail são obrigatórios');
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      setFormError('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const body: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        status: formData.status,
      };
      if (!editingUser) body.password = formData.password;

      const res = await fetch(url, { method, headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Erro ao salvar usuário');
        setSaving(false);
        return;
      }

      setShowUserModal(false);
      fetchUsers();
    } catch {
      setFormError('Erro de conexão com o servidor');
    }
    setSaving(false);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: headers() });
      if (res.ok) {
        setDeleteConfirm(null);
        fetchUsers();
      }
    } catch { /* ignore */ }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    if (newPassword.length < 6) {
      setResetError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    setResetError('');
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}/password`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.error || 'Erro ao redefinir senha');
        return;
      }
      setResetPasswordUser(null);
      setNewPassword('');
    } catch {
      setResetError('Erro de conexão');
    }
  };

  const handleCopyApiKey = () => {
    navigator.clipboard.writeText('pk_live_xxxxxxxxxxxxxxxxxxxxxxxx3f7a');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <Header title="Configurações" subtitle="Gerencie sua equipe, integrações e API" />

      <div className="p-8">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl w-fit mb-8">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'team' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <UsersIcon className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  Membros da Equipe
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {teamUsers.length} membros registrados
                </p>
              </div>
              <button
                onClick={openCreateModal}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#6366f1' }}
              >
                + Adicionar Membro
              </button>
            </div>

            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
              <div className="col-span-3">Membro</div>
              <div className="col-span-1">Cargo</div>
              <div className="col-span-1">Plano</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2 text-right">Deals</div>
              <div className="col-span-1 text-right">Receita</div>
              <div className="col-span-3 text-right">Ações</div>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">Carregando...</div>
            ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {teamUsers.map((u) => {
                const role = roleConfig[u.role];
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="col-span-3 flex items-center gap-3 min-w-0">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-full shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full"
                        style={{ backgroundColor: role?.bg, color: role?.color }}
                      >
                        <Shield className="w-3 h-3" />
                        {role?.label || u.role}
                      </span>
                    </div>

                    <div className="col-span-1">
                      {(() => {
                        const p = planConfig[u.plan] || planConfig.trial;
                        return (
                          <span
                            className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{ backgroundColor: p.bg, color: p.color }}
                          >
                            {p.label}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="col-span-1">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: u.status === 'active' ? '#22c55e' : '#94a3b8',
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: u.status === 'active' ? '#16a34a' : 'var(--text-tertiary)',
                          }}
                        >
                          {u.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{u.deals}</span>
                      <p className="text-xs text-slate-400 dark:text-slate-500">deals</p>
                    </div>

                    <div className="col-span-1 text-right">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        R$ {(u.revenue / 1000).toFixed(0)}k
                      </span>
                    </div>

                    <div className="col-span-3 flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setResetPasswordUser(u); setNewPassword(''); setResetError(''); setShowNewPassword(false); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                        title="Redefinir senha"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {deleteConfirm === u.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="px-2 py-1 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(u.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {activeTab === 'integrations' && (
          <div>
            <div className="mb-6">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                Integrações Disponíveis
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Conecte suas ferramentas favoritas ao PulseCRM
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center"
                    >
                      <integration.icon className="w-6 h-6" style={{ color: integration.color }} />
                    </div>
                    {integration.connected ? (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                        style={{ backgroundColor: 'var(--tint-green)', color: '#16a34a' }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: '#22c55e' }}
                        />
                        Conectado
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                        style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-tertiary)' }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: '#94a3b8' }}
                        />
                        Desconectado
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{integration.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                    {integration.description}
                  </p>

                  {integration.connected ? (
                    <button className="w-full py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      Configurar
                    </button>
                  ) : (
                    <button
                      className="w-full py-2 text-xs font-medium text-white rounded-lg transition-colors"
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      Conectar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Key className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  Credenciais da API
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Use essas credenciais para integrar com a API do PulseCRM
                </p>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    API Endpoint
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-200">
                      https://api.pulsecrm.com/v1
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    API Key
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-200">
                      pk_live_****...****3f7a
                    </div>
                    <button
                      onClick={handleCopyApiKey}
                      className="px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shrink-0"
                      style={{ backgroundColor: copied ? '#16a34a' : '#6366f1' }}
                    >
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://seu-dominio.com/webhook"
                      className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                    <button
                      className="px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shrink-0"
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  Endpoints Disponíveis
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Lista de endpoints disponíveis na API REST
                </p>
              </div>

              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 dark:bg-slate-900 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <div className="col-span-2">Método</div>
                <div className="col-span-4">Endpoint</div>
                <div className="col-span-6">Descrição</div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {endpoints.map((ep, idx) => {
                  const mColor = methodColors[ep.method];
                  return (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="col-span-2">
                        <span
                          className="inline-block px-2.5 py-1 text-xs font-bold rounded"
                          style={{ backgroundColor: mColor.bg, color: mColor.color }}
                        >
                          {ep.method}
                        </span>
                      </div>
                      <div className="col-span-4">
                        <code className="text-sm font-mono text-slate-700 dark:text-slate-200">{ep.path}</code>
                      </div>
                      <div className="col-span-6">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{ep.description}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  Importar Dados
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Importe contatos e leads via arquivo CSV
                </p>
              </div>

              <div className="p-6">
                <div
                  className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  style={{ borderColor: 'var(--border-primary)' }}
                  onClick={() => setShowImport(true)}
                >
                  <div
                    className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
                    style={{ backgroundColor: 'var(--surface-tertiary)' }}
                  >
                    <Upload className="w-6 h-6" style={{ color: '#94a3b8' }} />
                  </div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                    Arraste seu arquivo CSV aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Suporta arquivos .csv com até 10.000 registros (max. 5MB)
                  </p>
                  <button
                    className="mt-4 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                    style={{ backgroundColor: '#6366f1' }}
                  >
                    Selecionar Arquivo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <CsvImportModal open={showImport} onClose={() => setShowImport(false)} />

      {/* User Create/Edit Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowUserModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {editingUser ? 'Editar Membro' : 'Novo Membro'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">E-mail *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Senha *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cargo</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserFormData['role'] })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="seller">Seller</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as UserFormData['status'] })}
                    className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#6366f1' }}
              >
                {saving ? 'Salvando...' : editingUser ? 'Salvar Alterações' : 'Criar Membro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setResetPasswordUser(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Redefinir Senha</h3>
              <button onClick={() => setResetPasswordUser(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nova senha para <span className="font-medium text-slate-700 dark:text-slate-200">{resetPasswordUser.name}</span>
              </p>

              {resetError && (
                <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  {resetError}
                </div>
              )}

              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  className="w-full px-4 py-2.5 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                style={{ backgroundColor: '#f59e0b' }}
              >
                Redefinir Senha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
