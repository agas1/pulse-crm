import { useState, type FormEvent } from 'react';
import { useLocation, Navigate, useSearchParams } from 'react-router-dom';
import { Activity, Mail, Lock, AlertCircle, Eye, EyeOff, User, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type View = 'login' | 'register' | 'forgot' | 'reset' | 'reset-success';

export default function Login() {
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get('view') === 'register' ? 'register' : 'login') as View;
  const [view, setView] = useState<View>(initialView);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot/Reset fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [devCode, setDevCode] = useState('');

  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const clearState = () => {
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const goToLogin = () => {
    clearState();
    setView('login');
  };

  const goToRegister = () => {
    clearState();
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setShowRegPassword(false);
    setView('register');
  };

  const goToForgot = () => {
    clearState();
    setForgotEmail('');
    setDevCode('');
    setView('forgot');
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim()) { setError('Informe seu e-mail'); return; }
    if (!password.trim()) { setError('Informe sua senha'); return; }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Erro ao fazer login');
      }
    } catch {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!regName.trim()) { setError('Informe seu nome'); return; }
    if (!regEmail.trim()) { setError('Informe seu e-mail'); return; }
    if (regPassword.length < 6) { setError('Senha deve ter pelo menos 6 caracteres'); return; }
    if (regPassword !== regConfirmPassword) { setError('As senhas não coincidem'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName.trim(), email: regEmail.trim(), password: regPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao criar conta');
        setLoading(false);
        return;
      }

      // Redirect to login with success message — user must authenticate
      setEmail(regEmail);
      setPassword('');
      setView('login');
      setSuccess('Conta criada com sucesso! Faça login para continuar.');
    } catch {
      setError('Erro de conexão com o servidor');
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotEmail.trim()) { setError('Informe seu e-mail'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao enviar código');
        setLoading(false);
        return;
      }

      // Save dev code if available (dev mode)
      if (data._devCode) {
        setDevCode(data._devCode);
      }

      setResetCode('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowNewPassword(false);
      setView('reset');
      setSuccess('Código enviado! Verifique seu e-mail.');
    } catch {
      setError('Erro de conexão com o servidor');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!resetCode.trim()) { setError('Informe o código de verificação'); return; }
    if (newPassword.length < 6) { setError('Nova senha deve ter pelo menos 6 caracteres'); return; }
    if (newPassword !== confirmNewPassword) { setError('As senhas não coincidem'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim(), code: resetCode.trim(), newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir senha');
        setLoading(false);
        return;
      }

      setView('reset-success');
    } catch {
      setError('Erro de conexão com o servidor');
    }
    setLoading(false);
  };

  const inputClass = 'w-full py-3 text-sm text-white rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-cyan-400/50';
  const inputStyle = { backgroundColor: 'rgba(255,255,255,0.08)' };
  const labelStyle = { color: 'rgba(255,255,255,0.6)' };
  const iconStyle = { color: 'rgba(255,255,255,0.3)' };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
          >
            <Activity className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-2xl tracking-tight">PulseCRM</span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-10"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* ====== LOGIN VIEW ====== */}
          {view === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-white text-center mb-1.5">
                Bem-vindo de volta
              </h2>
              <p className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Entre com suas credenciais
              </p>

              <form onSubmit={handleLogin} className="space-y-5">
                {success && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#86efac' }}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {success}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium" style={labelStyle}>Senha</label>
                    <button
                      type="button"
                      onClick={goToForgot}
                      className="text-xs font-medium transition-colors hover:underline"
                      style={{ color: '#4ade80' }}
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Sua senha"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={iconStyle}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Não tem uma conta?{' '}
                  <button
                    onClick={goToRegister}
                    className="font-medium transition-colors hover:underline"
                    style={{ color: '#4ade80' }}
                  >
                    Criar conta
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ====== REGISTER VIEW ====== */}
          {view === 'register' && (
            <>
              <button
                onClick={goToLogin}
                className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>

              <h2 className="text-xl font-semibold text-white text-center mb-1.5">
                Criar conta
              </h2>
              <p className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Preencha seus dados para começar
              </p>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Nome completo</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Seu nome"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={iconStyle}
                    >
                      {showRegPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Confirmar senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
                >
                  {loading ? 'Criando conta...' : 'Criar conta'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Já tem uma conta?{' '}
                  <button
                    onClick={goToLogin}
                    className="font-medium transition-colors hover:underline"
                    style={{ color: '#4ade80' }}
                  >
                    Fazer login
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ====== FORGOT PASSWORD VIEW ====== */}
          {view === 'forgot' && (
            <>
              <button
                onClick={goToLogin}
                className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao login
              </button>

              <div className="flex justify-center mb-5">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                >
                  <KeyRound className="w-7 h-7" style={{ color: '#4ade80' }} />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white text-center mb-1.5">
                Esqueceu a senha?
              </h2>
              <p className="text-sm text-center mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Informe seu e-mail e enviaremos um código de recuperação
              </p>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>E-mail</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
                >
                  {loading ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>
            </>
          )}

          {/* ====== RESET PASSWORD VIEW ====== */}
          {view === 'reset' && (
            <>
              <button
                onClick={goToForgot}
                className="flex items-center gap-1.5 text-sm mb-6 transition-colors hover:opacity-80"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>

              <h2 className="text-xl font-semibold text-white text-center mb-1.5">
                Redefinir senha
              </h2>
              <p className="text-sm text-center mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Insira o código enviado para <span className="font-medium text-white">{forgotEmail}</span>
              </p>

              {success && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm mb-5"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)', color: '#86efac' }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              {/* Dev hint - show code in development */}
              {devCode && (
                <div
                  className="px-4 py-3 rounded-lg text-xs mb-5"
                  style={{ backgroundColor: 'rgba(250, 204, 21, 0.1)', border: '1px solid rgba(250, 204, 21, 0.2)', color: '#fde047' }}
                >
                  <p className="font-medium mb-1">Modo desenvolvimento</p>
                  <p>Código de verificação: <span className="font-bold text-sm tracking-widest">{devCode}</span></p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Código de verificação</label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className={`${inputClass} text-center tracking-[0.5em] text-lg font-bold`}
                    style={{ ...inputStyle, paddingLeft: '14px', paddingRight: '14px' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Nova senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2"
                      style={iconStyle}
                    >
                      {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={labelStyle}>Confirmar nova senha</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2" style={iconStyle} />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className={inputClass}
                      style={{ ...inputStyle, paddingLeft: '42px', paddingRight: '14px' }}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 mt-2"
                  style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
                >
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}

          {/* ====== RESET SUCCESS VIEW ====== */}
          {view === 'reset-success' && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-5">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}
                >
                  <CheckCircle2 className="w-8 h-8" style={{ color: '#4ade80' }} />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-white mb-2">
                Senha redefinida!
              </h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
              </p>

              <button
                onClick={goToLogin}
                className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
              >
                Ir para o login
              </button>
            </div>
          )}
        </div>

        {/* Dev hint - only on login view */}
        {view === 'login' && (
          <div
            className="mt-8 rounded-xl p-5 text-xs"
            style={{
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            <p className="font-medium mb-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Contas de teste:
            </p>
            <div className="space-y-1.5">
              <p>admin@pulsecrm.com / 123456 (Admin)</p>
              <p>camila@pulsecrm.com / 123456 (Manager)</p>
              <p>marina@pulsecrm.com / 123456 (Seller)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
