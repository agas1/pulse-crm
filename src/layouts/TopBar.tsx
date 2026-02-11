import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Mail,
  MessageCircle,
  CheckSquare,
  Zap,
  BarChart3,
  Activity,
  Settings,
  Bell,
  Search,
  Plus,
  ChevronDown,
  Moon,
  Sun,
  LogOut,
  Shield,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { navPermissions, effectiveRole } from '../config/permissions';
import type { UserRole } from '../config/permissions';
import type { UserPlan } from '../data/types';

const mainNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contatos' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/emails', icon: Mail, label: 'E-mail' },
  { to: '/channels', icon: MessageCircle, label: 'Canais' },
];

const moreNav = [
  { to: '/automations', icon: Zap, label: 'Automações' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/activities', icon: Activity, label: 'Atividades' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  seller: 'Vendedor',
};

const roleColors: Record<UserRole, { bg: string; color: string }> = {
  admin: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
  manager: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' },
  seller: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
};

const planLabels: Record<UserPlan, string> = {
  trial: 'Teste',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

const planColors: Record<UserPlan, { bg: string; color: string }> = {
  trial: { bg: 'rgba(251, 191, 36, 0.15)', color: '#f59e0b' },
  starter: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
  professional: { bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' },
  enterprise: { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' },
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const userRole: UserRole = user ? effectiveRole(user) : 'seller';

  const visibleMainNav = mainNav.filter(item => {
    const allowed = navPermissions.mainNav[item.to as keyof typeof navPermissions.mainNav];
    return allowed ? (allowed as readonly UserRole[]).includes(userRole) : true;
  });

  const visibleMoreNav = moreNav.filter(item => {
    const allowed = navPermissions.moreNav[item.to as keyof typeof navPermissions.moreNav];
    return allowed ? (allowed as readonly UserRole[]).includes(userRole) : false;
  });

  const isMoreActive = visibleMoreNav.some((item) => isActive(item.to));

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setAvatarOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center h-14 px-4"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* Logo */}
      <NavLink to="/" className="flex items-center gap-2.5 mr-6 shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
        >
          <Activity className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-bold text-sm tracking-tight hidden lg:block">
          PulseCRM
        </span>
      </NavLink>

      {/* Main Navigation */}
      <nav className="flex items-center gap-0.5 flex-1 min-w-0">
        {visibleMainNav.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 shrink-0"
              style={{
                backgroundColor: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.55)',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                }
              }}
            >
              <item.icon className="w-4 h-4" />
              <span className="hidden xl:inline">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More dropdown */}
        {visibleMoreNav.length > 0 && (
          <div ref={moreRef} className="relative shrink-0">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150"
              style={{
                backgroundColor: moreOpen || isMoreActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: moreOpen || isMoreActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
              }}
              onMouseEnter={(e) => {
                if (!moreOpen && !isMoreActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                }
              }}
              onMouseLeave={(e) => {
                if (!moreOpen && !isMoreActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                }
              }}
            >
              <span>Mais</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ transform: moreOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
            </button>

            {moreOpen && (
              <div
                className="absolute top-full left-0 mt-1.5 w-52 rounded-xl overflow-hidden shadow-xl"
                style={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-primary)',
                }}
              >
                <div className="py-1.5">
                  {visibleMoreNav.map((item) => {
                    const active = isActive(item.to);
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{
                          backgroundColor: active ? 'var(--surface-active)' : 'transparent',
                          color: active ? '#2563eb' : 'var(--text-secondary)',
                          fontWeight: active ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (!active) e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <item.icon className="w-4 h-4" style={{ color: active ? '#2563eb' : 'var(--text-muted)' }} />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Right side: Search + Actions */}
      <div className="flex items-center gap-1.5 ml-4 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.35)' }} />
          <input
            type="text"
            placeholder="Buscar..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="py-1.5 text-[13px] text-white placeholder-white/30 rounded-lg border-0 focus:outline-none transition-all"
            style={{
              paddingLeft: '30px',
              paddingRight: '12px',
              backgroundColor: searchFocused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
              width: searchFocused ? '220px' : '160px',
            }}
          />
        </div>

        {/* Quick add */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)' }}
          title="Novo Lead"
        >
          <Plus className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button
          className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute w-2 h-2 rounded-full" style={{ top: '5px', right: '5px', backgroundColor: '#f87171' }} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          title={isDark ? 'Modo claro' : 'Modo escuro'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Avatar + Dropdown */}
        <div ref={avatarRef} className="relative ml-1">
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold transition-all hover:ring-2 hover:ring-white/20"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
          >
            {user ? getInitials(user.name) : '??'}
          </button>

          {avatarOpen && user && (
            <div
              className="absolute top-full right-0 mt-1.5 w-64 rounded-xl overflow-hidden shadow-xl"
              style={{
                backgroundColor: 'var(--surface-primary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              {/* User info */}
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {user.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: roleColors[user.role].bg,
                      color: roleColors[user.role].color,
                    }}
                  >
                    <Shield className="w-3 h-3" />
                    {roleLabels[user.role]}
                  </span>
                  {user.plan && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: planColors[user.plan]?.bg || planColors.trial.bg,
                        color: planColors[user.plan]?.color || planColors.trial.color,
                      }}
                    >
                      {planLabels[user.plan] || 'Teste'}
                    </span>
                  )}
                </div>
              </div>

              {/* Logout */}
              <div className="py-1.5">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <LogOut className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
