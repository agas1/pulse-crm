import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Shield, Webhook, FileCode, Upload, Key, Globe, Calendar, MessageCircle, Mail, Bell, Zap, RefreshCw, Pencil, Trash2, X, Eye, EyeOff, KeyRound, Instagram, CheckCircle, XCircle, Loader2, ToggleLeft, ToggleRight, ShieldCheck } from 'lucide-react';
import Header from '../layouts/Header';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../data/types';
import CsvImportModal from '../components/CsvImportModal';

const settingsTabs = [
  { id: 'team', label: 'Equipe', icon: UsersIcon },
  { id: 'integrations', label: 'Integrações', icon: Globe },
  { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
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

  // Channel config state
  const [channelConfigs, setChannelConfigs] = useState<Array<{
    channel: string;
    config: Record<string, unknown>;
    enabled: boolean;
    simulationMode: boolean;
  }>>([]);
  const [channelLoading, setChannelLoading] = useState(false);
  const [editingChannel, setEditingChannel] = useState<string | null>(null);
  const [channelForm, setChannelForm] = useState<Record<string, unknown>>({});
  const [channelEnabled, setChannelEnabled] = useState(false);
  const [channelSimulation, setChannelSimulation] = useState(true);
  const [channelSaving, setChannelSaving] = useState(false);
  const [channelError, setChannelError] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Compliance state
  const [complianceConfig, setComplianceConfig] = useState<{
    maxEmailsPerHourPerDomain: number;
    maxEmailsPerDay: number;
    softBounceRetryCount: number;
    enabled: boolean;
  }>({ maxEmailsPerHourPerDomain: 30, maxEmailsPerDay: 200, softBounceRetryCount: 1, enabled: true });
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceSaving, setComplianceSaving] = useState(false);
  const [blocklist, setBlocklist] = useState<Array<{
    id: string; email: string; phone: string; reason: string; source: string; unsubscribedAt: string;
  }>>([]);
  const [blocklistLoading, setBlocklistLoading] = useState(false);
  const [newBlockEmail, setNewBlockEmail] = useState('');
  const [newBlockPhone, setNewBlockPhone] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

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

  const fetchChannelConfigs = useCallback(async () => {
    setChannelLoading(true);
    try {
      const res = await fetch('/api/channel-configs', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setChannelConfigs(data.configs);
      }
    } catch { /* ignore */ }
    setChannelLoading(false);
  }, [headers]);

  const fetchComplianceConfig = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const res = await fetch('/api/compliance/config', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setComplianceConfig(data.config);
      }
    } catch { /* ignore */ }
    setComplianceLoading(false);
  }, [headers]);

  const fetchBlocklist = useCallback(async () => {
    setBlocklistLoading(true);
    try {
      const res = await fetch('/api/compliance/unsubscribe-list', { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setBlocklist(data.records);
      }
    } catch { /* ignore */ }
    setBlocklistLoading(false);
  }, [headers]);

  const handleSaveCompliance = async () => {
    setComplianceSaving(true);
    try {
      await fetch('/api/compliance/config', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(complianceConfig),
      });
    } catch { /* ignore */ }
    setComplianceSaving(false);
  };

  const handleAddToBlocklist = async () => {
    if (!newBlockEmail.trim() && !newBlockPhone.trim()) return;
    try {
      const res = await fetch('/api/compliance/unsubscribe-list', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          email: newBlockEmail.trim(),
          phone: newBlockPhone.trim(),
          reason: newBlockReason.trim() || 'Manual',
        }),
      });
      if (res.ok) {
        setNewBlockEmail('');
        setNewBlockPhone('');
        setNewBlockReason('');
        fetchBlocklist();
      }
    } catch { /* ignore */ }
  };

  const handleRemoveFromBlocklist = async (id: string) => {
    try {
      const res = await fetch(`/api/compliance/unsubscribe-list/${id}`, {
        method: 'DELETE',
        headers: headers(),
      });
      if (res.ok) {
        setBlocklist((prev) => prev.filter((b) => b.id !== id));
      }
    } catch { /* ignore */ }
  };

  const openChannelForm = (channel: string) => {
    const existing = channelConfigs.find(c => c.channel === channel);
    if (existing) {
      setChannelForm(existing.config as Record<string, unknown>);
      setChannelEnabled(existing.enabled);
      setChannelSimulation(existing.simulationMode);
    } else {
      setChannelForm({});
      setChannelEnabled(false);
      setChannelSimulation(true);
    }
    setChannelError('');
    setTestResult(null);
    setEditingChannel(channel);
  };

  const handleSaveChannel = async () => {
    if (!editingChannel) return;
    setChannelSaving(true);
    setChannelError('');
    try {
      const res = await fetch(`/api/channel-configs/${editingChannel}`, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          config: channelForm,
          enabled: channelEnabled,
          simulationMode: channelSimulation,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChannelError(data.error || 'Erro ao salvar configuração');
        setChannelSaving(false);
        return;
      }
      setEditingChannel(null);
      fetchChannelConfigs();
    } catch {
      setChannelError('Erro de conexão com o servidor');
    }
    setChannelSaving(false);
  };

  const handleTestChannel = async () => {
    if (!editingChannel) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/channel-configs/${editingChannel}/test`, {
        method: 'POST',
        headers: headers(),
      });
      const data = await res.json();
      setTestResult({ success: data.success, message: data.message });
    } catch {
      setTestResult({ success: false, message: 'Erro de conexão com o servidor' });
    }
    setTesting(false);
  };

  useEffect(() => {
    if (activeTab === 'team') fetchUsers();
    if (activeTab === 'integrations') fetchChannelConfigs();
    if (activeTab === 'compliance') { fetchComplianceConfig(); fetchBlocklist(); }
  }, [activeTab, fetchUsers, fetchChannelConfigs, fetchComplianceConfig, fetchBlocklist]);

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
                Canais de Comunicação
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Configure seus canais de e-mail, WhatsApp e Instagram
              </p>
            </div>

            {channelLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">Carregando configurações...</div>
            ) : (
              <>
                {/* Channel Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
                  {([
                    { channel: 'smtp', name: 'SMTP E-mail', description: 'Configure seu servidor SMTP para envio de e-mails personalizados.', icon: Mail, color: '#f59e0b' },
                    { channel: 'whatsapp', name: 'WhatsApp Business API', description: 'Envie e receba mensagens do WhatsApp diretamente no CRM.', icon: MessageCircle, color: '#22c55e' },
                    { channel: 'instagram', name: 'Instagram Direct', description: 'Gerencie mensagens do Instagram Direct no CRM.', icon: Instagram, color: '#e1306c' },
                  ] as const).map((ch) => {
                    const cfg = channelConfigs.find(c => c.channel === ch.channel);
                    const isConnected = cfg?.enabled && !cfg?.simulationMode;
                    const isSimulation = cfg?.enabled && cfg?.simulationMode;
                    const Icon = ch.icon;

                    return (
                      <div
                        key={ch.channel}
                        className={`bg-white dark:bg-slate-800 rounded-xl border p-5 hover:shadow-md transition-all flex flex-col ${
                          editingChannel === ch.channel
                            ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                            <Icon className="w-6 h-6" style={{ color: ch.color }} />
                          </div>
                          {isConnected ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                              style={{ backgroundColor: 'var(--tint-green)', color: '#16a34a' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
                              Conectado
                            </span>
                          ) : isSimulation ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                              style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                              Simulação
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                              style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-tertiary)' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#94a3b8' }} />
                              Desconectado
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{ch.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 flex-1">
                          {ch.description}
                        </p>

                        {/* Config preview */}
                        {cfg && Object.keys(cfg.config).length > 0 && (
                          <div className="mb-3 space-y-1">
                            {Object.entries(cfg.config).slice(0, 3).map(([key, val]) => (
                              <div key={key} className="flex items-center justify-between">
                                <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{key}</span>
                                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate ml-2 max-w-[140px]">
                                  {String(val)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={() => editingChannel === ch.channel ? setEditingChannel(null) : openChannelForm(ch.channel)}
                          className={`w-full py-2 text-xs font-medium rounded-lg transition-colors ${
                            editingChannel === ch.channel
                              ? 'text-white bg-blue-500 hover:bg-blue-600'
                              : 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          {editingChannel === ch.channel ? 'Fechar' : 'Configurar'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Channel Config Form */}
                {editingChannel && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                    <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                        Configurar {editingChannel === 'smtp' ? 'SMTP E-mail' : editingChannel === 'whatsapp' ? 'WhatsApp' : 'Instagram'}
                      </h3>
                      <button
                        onClick={() => setEditingChannel(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-6 space-y-4">
                      {channelError && (
                        <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                          {channelError}
                        </div>
                      )}

                      {testResult && (
                        <div className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 ${
                          testResult.success
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                        }`}>
                          {testResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                          {testResult.message}
                        </div>
                      )}

                      {/* SMTP Fields */}
                      {editingChannel === 'smtp' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Host</label>
                            <input
                              type="text"
                              value={(channelForm.host as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, host: e.target.value })}
                              placeholder="smtp.gmail.com"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Porta</label>
                            <input
                              type="number"
                              value={(channelForm.port as number) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, port: parseInt(e.target.value) || '' })}
                              placeholder="587"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Usuário</label>
                            <input
                              type="text"
                              value={(channelForm.user as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, user: e.target.value })}
                              placeholder="seu-email@gmail.com"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
                            <input
                              type="password"
                              value={(channelForm.pass as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, pass: e.target.value })}
                              placeholder="••••••••"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Nome do Remetente</label>
                            <input
                              type="text"
                              value={(channelForm.fromName as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, fromName: e.target.value })}
                              placeholder="PulseCRM"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">E-mail do Remetente</label>
                            <input
                              type="email"
                              value={(channelForm.fromEmail as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, fromEmail: e.target.value })}
                              placeholder="noreply@suaempresa.com"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* WhatsApp Fields */}
                      {editingChannel === 'whatsapp' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Phone Number ID</label>
                            <input
                              type="text"
                              value={(channelForm.phoneNumberId as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, phoneNumberId: e.target.value })}
                              placeholder="Seu Phone Number ID do Meta Business"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Access Token</label>
                            <input
                              type="password"
                              value={(channelForm.accessToken as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, accessToken: e.target.value })}
                              placeholder="••••••••"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Verify Token</label>
                            <input
                              type="text"
                              value={(channelForm.verifyToken as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, verifyToken: e.target.value })}
                              placeholder="Token de verificação do webhook"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Instagram Fields */}
                      {editingChannel === 'instagram' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">IG Business Account ID</label>
                            <input
                              type="text"
                              value={(channelForm.igBusinessAccountId as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, igBusinessAccountId: e.target.value })}
                              placeholder="ID da conta business do Instagram"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Page Access Token</label>
                            <input
                              type="password"
                              value={(channelForm.pageAccessToken as string) || ''}
                              onChange={(e) => setChannelForm({ ...channelForm, pageAccessToken: e.target.value })}
                              placeholder="••••••••"
                              className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Toggles */}
                      <div className="flex items-center gap-6 pt-2">
                        <button
                          type="button"
                          onClick={() => setChannelEnabled(!channelEnabled)}
                          className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                        >
                          {channelEnabled ? (
                            <ToggleRight className="w-8 h-8 text-blue-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          )}
                          Habilitado
                        </button>

                        <button
                          type="button"
                          onClick={() => setChannelSimulation(!channelSimulation)}
                          className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                        >
                          {channelSimulation ? (
                            <ToggleRight className="w-8 h-8 text-amber-500" />
                          ) : (
                            <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                          )}
                          Modo Simulação
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <button
                        onClick={handleTestChannel}
                        disabled={testing}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {testing ? 'Testando...' : 'Testar Conexão'}
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setEditingChannel(null)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveChannel}
                          disabled={channelSaving}
                          className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#6366f1' }}
                        >
                          {channelSaving ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Coming Soon Integrations */}
                <div className="mb-4 mt-2">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Em breve</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {([
                    { id: 'gcal', name: 'Google Calendar', description: 'Sincronize reuniões e eventos diretamente com seu Google Calendar.', icon: Calendar, color: '#3b82f6' },
                    { id: 'slack', name: 'Slack', description: 'Receba notificações de deals e leads diretamente no Slack.', icon: Bell, color: '#8b5cf6' },
                    { id: 'zapier', name: 'Zapier', description: 'Conecte o PulseCRM com mais de 5.000 aplicativos via Zapier.', icon: Zap, color: '#f97316' },
                    { id: 'hubspot', name: 'HubSpot', description: 'Importe e sincronize contatos e deals com o HubSpot.', icon: RefreshCw, color: '#3b82f6' },
                  ] as const).map((integration) => (
                    <div
                      key={integration.id}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 opacity-60 flex flex-col"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 flex items-center justify-center">
                          <integration.icon className="w-6 h-6" style={{ color: integration.color }} />
                        </div>
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full"
                          style={{ backgroundColor: 'var(--surface-tertiary)', color: 'var(--text-tertiary)' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#94a3b8' }} />
                          Em breve
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{integration.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 flex-1">
                        {integration.description}
                      </p>

                      <button
                        disabled
                        className="w-full py-2 text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-not-allowed"
                      >
                        Em breve
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* Compliance Config */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                  Configuração de Compliance
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Controle de taxa de envio, limites e opt-out
                </p>
              </div>

              {complianceLoading ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">Carregando...</div>
              ) : (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Max e-mails/hora por domínio
                      </label>
                      <input
                        type="number"
                        value={complianceConfig.maxEmailsPerHourPerDomain}
                        onChange={(e) => setComplianceConfig({ ...complianceConfig, maxEmailsPerHourPerDomain: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Max e-mails/dia (total)
                      </label>
                      <input
                        type="number"
                        value={complianceConfig.maxEmailsPerDay}
                        onChange={(e) => setComplianceConfig({ ...complianceConfig, maxEmailsPerDay: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Retentativas soft bounce
                      </label>
                      <input
                        type="number"
                        value={complianceConfig.softBounceRetryCount}
                        onChange={(e) => setComplianceConfig({ ...complianceConfig, softBounceRetryCount: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setComplianceConfig({ ...complianceConfig, enabled: !complianceConfig.enabled })}
                      className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200"
                    >
                      {complianceConfig.enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                      Compliance {complianceConfig.enabled ? 'Habilitado' : 'Desabilitado'}
                    </button>

                    <button
                      onClick={handleSaveCompliance}
                      disabled={complianceSaving}
                      className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#6366f1' }}
                    >
                      {complianceSaving ? 'Salvando...' : 'Salvar Configuração'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Blocklist */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-400" />
                  Blocklist (Opt-out)
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Contatos que optaram por não receber mais comunicações
                </p>
              </div>

              <div className="p-6">
                {/* Add to blocklist form */}
                <div className="flex items-end gap-3 mb-6">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">E-mail</label>
                    <input
                      type="email"
                      value={newBlockEmail}
                      onChange={(e) => setNewBlockEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Telefone</label>
                    <input
                      type="text"
                      value={newBlockPhone}
                      onChange={(e) => setNewBlockPhone(e.target.value)}
                      placeholder="(11) 99999-0000"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Motivo</label>
                    <input
                      type="text"
                      value={newBlockReason}
                      onChange={(e) => setNewBlockReason(e.target.value)}
                      placeholder="Ex: solicitou remoção"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={handleAddToBlocklist}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors shrink-0"
                  >
                    + Adicionar
                  </button>
                </div>

                {/* Blocklist table */}
                {blocklistLoading ? (
                  <div className="py-8 text-center text-sm text-slate-400">Carregando blocklist...</div>
                ) : blocklist.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                    Nenhum contato na blocklist.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">E-mail</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Telefone</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Motivo</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Origem</th>
                          <th className="text-left px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Data</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {blocklist.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">{item.email || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">{item.phone || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{item.reason || '-'}</td>
                            <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{item.source || '-'}</td>
                            <td className="px-3 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                              {item.unsubscribedAt ? new Date(item.unsubscribedAt).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                onClick={() => handleRemoveFromBlocklist(item.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
