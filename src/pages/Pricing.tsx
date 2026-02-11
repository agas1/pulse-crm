import { Check, Crown, AlertTriangle, Star, Building2, Rocket } from 'lucide-react';
import Header from '../layouts/Header';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { UserPlan } from '../data/types';

interface PlanInfo {
  id: UserPlan;
  name: string;
  price: string;
  period: string;
  description: string;
  icon: typeof Rocket;
  color: string;
  features: string[];
  highlighted?: boolean;
}

const plans: PlanInfo[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'R$ 49',
    period: '/m\u00EAs por usu\u00E1rio',
    description: 'Ideal para equipes pequenas que est\u00E3o come\u00E7ando',
    icon: Rocket,
    color: '#22c55e',
    features: [
      'At\u00E9 5 usu\u00E1rios',
      '1.000 contatos',
      'Pipeline b\u00E1sico',
      'E-mail integrado',
      'Suporte por e-mail',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 'R$ 99',
    period: '/m\u00EAs por usu\u00E1rio',
    description: 'Para equipes em crescimento que precisam de mais recursos',
    icon: Star,
    color: '#6366f1',
    features: [
      'At\u00E9 25 usu\u00E1rios',
      '10.000 contatos',
      'Pipeline avan\u00E7ado',
      'Automa\u00E7\u00F5es',
      'Relat\u00F3rios completos',
      'API access',
      'Suporte priorit\u00E1rio',
    ],
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 199',
    period: '/m\u00EAs por usu\u00E1rio',
    description: 'Para grandes opera\u00E7\u00F5es com necessidades avan\u00E7adas',
    icon: Building2,
    color: '#ec4899',
    features: [
      'Usu\u00E1rios ilimitados',
      'Contatos ilimitados',
      'Todas as funcionalidades',
      'Integra\u00E7\u00F5es personalizadas',
      'Gerente de conta dedicado',
      'SLA 99.9%',
      'Suporte 24/7',
    ],
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const currentPlan = user?.plan || 'trial';

  const handleSubscribe = (planName: string) => {
    alert(`Entre em contato: contato@pulsecrm.com\n\nPlano selecionado: ${planName}`);
  };

  return (
    <div>
      <Header title="Planos e Pre\u00E7os" subtitle="Escolha o plano ideal para sua equipe" />

      <div className="p-8 space-y-8">
        {/* Trial Banner */}
        {currentPlan === 'trial' && (
          <div
            className="rounded-xl p-5 border flex items-start gap-4"
            style={{
              backgroundColor: isDark ? 'rgba(251, 191, 36, 0.08)' : 'rgba(251, 191, 36, 0.08)',
              borderColor: isDark ? 'rgba(251, 191, 36, 0.25)' : 'rgba(251, 191, 36, 0.3)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)' }}
            >
              <AlertTriangle className="w-5 h-5" style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <h3
                className="text-sm font-semibold mb-1"
                style={{ color: isDark ? '#fbbf24' : '#b45309' }}
              >
                Plano Atual: Teste gratuito
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: isDark ? '#fcd34d' : '#92400e' }}
              >
                Voc\u00EA est\u00E1 usando o plano Teste gratuito. Todos os recursos est\u00E3o dispon\u00EDveis por
                tempo limitado. Escolha um plano para continuar usando ap\u00F3s o per\u00EDodo de teste.
              </p>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isHighlighted = plan.highlighted;

            return (
              <div
                key={plan.id}
                className="relative rounded-xl border transition-all hover:shadow-lg flex flex-col"
                style={{
                  backgroundColor: isDark ? 'var(--surface-primary)' : '#ffffff',
                  borderColor: isHighlighted
                    ? plan.color
                    : isDark
                      ? 'var(--border-primary)'
                      : '#e2e8f0',
                  borderWidth: isHighlighted ? '2px' : '1px',
                  boxShadow: isHighlighted
                    ? `0 0 0 1px ${plan.color}20, 0 8px 32px ${plan.color}15`
                    : undefined,
                }}
              >
                {/* "Mais Popular" badge */}
                {isHighlighted && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white tracking-wide flex items-center gap-1.5"
                    style={{ backgroundColor: plan.color }}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    Mais Popular
                  </div>
                )}

                <div className="p-6 pb-4 flex-1 flex flex-col">
                  {/* Plan Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${plan.color}15` }}
                    >
                      <plan.icon className="w-5 h-5" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3
                        className="text-lg font-bold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {plan.name}
                      </h3>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span
                        className="text-3xl font-extrabold tracking-tight"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {plan.price}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {plan.period}
                      </span>
                    </div>
                    <p
                      className="text-sm mt-1.5 leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {plan.description}
                    </p>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px w-full mb-5"
                    style={{ backgroundColor: 'var(--border-primary)' }}
                  />

                  {/* Features */}
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${plan.color}15` }}
                        >
                          <Check
                            className="w-3 h-3"
                            style={{ color: plan.color }}
                            strokeWidth={3}
                          />
                        </div>
                        <span
                          className="text-sm"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-lg text-sm font-semibold transition-all cursor-not-allowed"
                      style={{
                        backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9',
                        color: 'var(--text-muted)',
                        border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.15)' : '#e2e8f0'}`,
                      }}
                    >
                      Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.name)}
                      className="w-full py-3 rounded-lg text-sm font-semibold transition-all hover:shadow-md"
                      style={{
                        backgroundColor: isHighlighted ? plan.color : 'transparent',
                        color: isHighlighted ? '#ffffff' : plan.color,
                        border: isHighlighted ? 'none' : `1.5px solid ${plan.color}`,
                      }}
                      onMouseEnter={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.backgroundColor = `${plan.color}10`;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      Contratar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ / Additional Info */}
        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: isDark ? 'var(--surface-primary)' : '#ffffff',
            borderColor: isDark ? 'var(--border-primary)' : '#e2e8f0',
          }}
        >
          <h3
            className="text-base font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            Perguntas frequentes
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Posso trocar de plano depois?
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Sim, voc\u00EA pode fazer upgrade ou downgrade a qualquer momento. A cobran\u00E7a ser\u00E1
                ajustada proporcionalmente.
              </p>
            </div>
            <div>
              <h4
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Qual o per\u00EDodo do teste gratuito?
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                O teste gratuito dura 14 dias com acesso a todos os recursos. Nenhum cart\u00E3o de
                cr\u00E9dito necess\u00E1rio.
              </p>
            </div>
            <div>
              <h4
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Como funciona o pagamento?
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Aceitamos cart\u00E3o de cr\u00E9dito, boleto banc\u00E1rio e PIX. A cobran\u00E7a \u00E9 mensal e pode ser
                cancelada a qualquer momento.
              </p>
            </div>
            <div>
              <h4
                className="text-sm font-medium mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                Preciso de ajuda para escolher?
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Entre em contato com nossa equipe pelo e-mail contato@pulsecrm.com e teremos prazer
                em ajudar.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
