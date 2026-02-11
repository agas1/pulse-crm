import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Settings,
  Activity,
  Mail,
  MessageCircle,
  CheckSquare,
  Zap,
  BarChart3,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contatos' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/emails', icon: Mail, label: 'E-mail' },
  { to: '/channels', icon: MessageCircle, label: 'Canais' },
  { to: '/automations', icon: Zap, label: 'Automações' },
  { to: '/reports', icon: BarChart3, label: 'Relatórios' },
  { to: '/activities', icon: Activity, label: 'Atividades' },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col items-center z-50"
      style={{
        width: '72px',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      {/* Logo */}
      <div className="pt-5 pb-4 flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
          }}
        >
          <Activity className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 h-px mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="group relative w-12 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
              style={{
                backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: active ? '#60a5fa' : '#64748b',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-0 w-[3px] rounded-r-full"
                  style={{
                    height: '20px',
                    backgroundColor: '#3b82f6',
                    top: '50%',
                    transform: 'translateY(-50%) translateX(-8px)',
                  }}
                />
              )}
              <item.icon className="w-[18px] h-[18px]" />
              {/* Tooltip */}
              <span
                className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap pointer-events-none"
                style={{
                  backgroundColor: '#1e293b',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="w-8 h-px my-2" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

      {/* Bottom: Settings + Avatar */}
      <div className="pb-5 flex flex-col items-center gap-2">
        <NavLink
          to="/settings"
          className="group relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200"
          style={{
            backgroundColor: isActive('/settings') ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: isActive('/settings') ? '#60a5fa' : '#64748b',
          }}
          onMouseEnter={(e) => {
            if (!isActive('/settings')) {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.color = '#e2e8f0';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive('/settings')) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }
          }}
        >
          <Settings className="w-[18px] h-[18px]" />
          <span
            className="absolute left-full ml-3 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap pointer-events-none"
            style={{
              backgroundColor: '#1e293b',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Configurações
          </span>
        </NavLink>

        {/* User Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-all hover:ring-2 hover:ring-blue-400/50"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          }}
        >
          VC
        </div>
      </div>
    </aside>
  );
}
