import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  GripVertical,
  Mail,
  Users,
  Zap,
  ChevronRight,
  Star,
  Quote,
  ChevronLeft,
} from 'lucide-react';

const brandGradient = 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)';
const darkBg = '#1a1a2e';
const darkerBg = '#12121f';

const features = [
  {
    icon: GripVertical,
    title: 'Pipeline Visual (Kanban)',
    description: 'Arraste e organize seus deals em um pipeline visual intuitivo',
  },
  {
    icon: Zap,
    title: 'Automações Inteligentes',
    description: 'Crie regras que trabalham por você. Acompanhe leads automaticamente',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Completos',
    description: 'Dashboards interativos com métricas que importam para seu negócio',
  },
  {
    icon: Mail,
    title: 'E-mail Integrado',
    description: 'Envie e receba e-mails diretamente do CRM, sem trocar de ferramenta',
  },
  {
    icon: Users,
    title: 'Gestão de Equipe',
    description: 'Controle permissões, atribua leads e acompanhe a performance de cada vendedor',
  },
  {
    icon: Code2,
    title: 'API & Integrações',
    description: 'Conecte suas ferramentas favoritas via API REST completa',
  },
];

const testimonials = [
  {
    name: 'Ana Rodrigues',
    role: 'Diretora Comercial',
    company: 'TechSol Brasil',
    avatar: 'AR',
    text: 'O PulseCRM transformou nosso processo de vendas. Em 3 meses, aumentamos nossa taxa de conversão em 40%. A automação de follow-ups é simplesmente incrível.',
    rating: 5,
  },
  {
    name: 'Carlos Mendes',
    role: 'CEO',
    company: 'Inova Digital',
    avatar: 'CM',
    text: 'Testamos 5 CRMs antes de encontrar o Pulse. A interface é a mais intuitiva que já vi e o suporte é excepcional. Recomendo para qualquer equipe de vendas.',
    rating: 5,
  },
  {
    name: 'Juliana Costa',
    role: 'Gerente de Vendas',
    company: 'StartUp Growth',
    avatar: 'JC',
    text: 'Nossa equipe de 15 vendedores adotou o PulseCRM em uma semana. O pipeline visual e os relatórios nos dão visibilidade total do funil.',
    rating: 5,
  },
  {
    name: 'Roberto Almeida',
    role: 'Fundador',
    company: 'ConnectaHub',
    avatar: 'RA',
    text: 'A integração via API foi perfeita com nossas ferramentas existentes. O PulseCRM se encaixou no nosso fluxo sem nenhuma fricção.',
    rating: 5,
  },
  {
    name: 'Fernanda Lima',
    role: 'Head de Operações',
    company: 'Vendas Express',
    avatar: 'FL',
    text: 'Reduzimos o tempo de resposta aos leads em 60% com as automações do Pulse. O ROI se pagou já no primeiro mês de uso.',
    rating: 5,
  },
  {
    name: 'Marcos Oliveira',
    role: 'Diretor de Vendas',
    company: 'Nexus Corp',
    avatar: 'MO',
    text: 'O melhor CRM que já utilizamos. A gestão de equipe e os dashboards em tempo real mudaram completamente nossa tomada de decisão.',
    rating: 5,
  },
];

const partners = [
  { name: 'TechSol Brasil', sector: 'Tecnologia' },
  { name: 'Inova Digital', sector: 'Marketing Digital' },
  { name: 'StartUp Growth', sector: 'Aceleradora' },
  { name: 'ConnectaHub', sector: 'SaaS' },
  { name: 'Vendas Express', sector: 'E-commerce' },
  { name: 'Nexus Corp', sector: 'Consultoria' },
  { name: 'DataFlow', sector: 'Analytics' },
  { name: 'CloudBase', sector: 'Infraestrutura' },
  { name: 'SmartSales', sector: 'Vendas B2B' },
  { name: 'AgileTeam', sector: 'Gestão' },
  { name: 'FinPro', sector: 'Fintech' },
  { name: 'LogiTech', sector: 'Logística' },
];

const plans = [
  {
    name: 'Starter',
    price: 'R$49',
    period: '/mês',
    description: 'Para profissionais autônomos e pequenas equipes',
    features: [
      'Até 1.000 contatos',
      '1 pipeline de vendas',
      'E-mail integrado',
      'Relatórios básicos',
      'Suporte por e-mail',
    ],
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 'R$99',
    period: '/mês',
    description: 'Para equipes em crescimento que precisam de mais poder',
    features: [
      'Até 10.000 contatos',
      'Pipelines ilimitados',
      'Automações inteligentes',
      'Relatórios avançados',
      'Gestão de equipe',
      'Integrações via API',
      'Suporte prioritário',
    ],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'R$199',
    period: '/mês',
    description: 'Para grandes operações com necessidades avançadas',
    features: [
      'Contatos ilimitados',
      'Tudo do Professional',
      'SSO / SAML',
      'SLA garantido de 99,9%',
      'Gerente de conta dedicado',
      'Treinamento personalizado',
      'Suporte 24/7',
    ],
    highlighted: false,
  },
];

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

/* ── Testimonials Carousel Component ── */
function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const total = testimonials.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#4ade80' }}>
            Depoimentos
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            O que nossos clientes dizem
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400">
            Empresas de todos os tamanhos confiam no PulseCRM para impulsionar suas vendas.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Cards container */}
          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {testimonials.map((t) => (
                <div key={t.name} className="w-full flex-shrink-0 px-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <Quote className="w-8 h-8 mb-6" style={{ color: 'rgba(74, 222, 128, 0.3)' }} />
                    <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed mb-8">
                      "{t.text}"
                    </p>
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ background: brandGradient }}
                      >
                        {t.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{t.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t.role} — {t.company}
                        </p>
                      </div>
                      {/* Stars */}
                      <div className="ml-auto hidden sm:flex gap-0.5">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-6 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center transition-all hover:scale-110"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-6 w-10 h-10 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex items-center justify-center transition-all hover:scale-110"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="w-2.5 h-2.5 rounded-full transition-all duration-300"
                style={{
                  background: i === current ? brandGradient : 'rgba(156, 163, 175, 0.4)',
                  transform: i === current ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Partners Carousel Component ── */
function PartnersCarousel() {
  const duplicated = [...partners, ...partners];

  return (
    <section className="py-16 sm:py-20 bg-white dark:bg-gray-950 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: '#4ade80' }}>
            Parceiros
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
            Empresas que confiam no PulseCRM
          </h2>
        </div>

        {/* Infinite marquee */}
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-r from-white dark:from-gray-950 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-20 z-10 pointer-events-none bg-gradient-to-l from-white dark:from-gray-950 to-transparent" />

          <div className="flex animate-marquee gap-8" style={{ width: 'max-content' }}>
            {duplicated.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                className="flex-shrink-0 flex items-center gap-3 px-6 py-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
              >
                {/* Logo placeholder */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: brandGradient }}
                >
                  {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{p.name}</p>
                  <p className="text-xs text-gray-400 whitespace-nowrap">{p.sector}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ scrollBehavior: 'smooth' }} className="min-h-screen bg-white dark:bg-gray-950">
      {/* ========== NAVIGATION ========== */}
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: 'rgba(26, 26, 46, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('hero')}>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: brandGradient }}
              >
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">PulseCRM</span>
            </div>

            {/* Nav links */}
            <div className="hidden sm:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('recursos')}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
              >
                Recursos
              </button>
              <button
                onClick={() => scrollToSection('precos')}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.65)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
              >
                Preços
              </button>
              <button
                onClick={() => navigate('/login?view=register')}
                className="text-sm font-semibold text-white px-5 py-2 rounded-lg transition-all hover:opacity-90"
                style={{ background: brandGradient }}
              >
                Começar grátis
              </button>
            </div>

            {/* Mobile CTA */}
            <div className="sm:hidden">
              <button
                onClick={() => navigate('/login?view=register')}
                className="text-sm font-semibold text-white px-4 py-2 rounded-lg"
                style={{ background: brandGradient }}
              >
                Começar grátis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section
        id="hero"
        className="relative overflow-hidden"
        style={{ backgroundColor: darkBg }}
      >
        {/* Background decorative elements */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(74, 222, 128, 0.08), transparent),' +
              'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(34, 211, 238, 0.05), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
              style={{
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                border: '1px solid rgba(74, 222, 128, 0.2)',
                color: '#4ade80',
              }}
            >
              <Star className="w-3.5 h-3.5" />
              Plataforma CRM #1 para equipes de vendas
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
              style={{ color: '#ffffff', lineHeight: 1.1 }}
            >
              O CRM que{' '}
              <span
                style={{
                  background: brandGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                acelera suas vendas
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-10"
              style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}
            >
              Gerencie contatos, pipeline, automações e muito mais em uma plataforma inteligente e intuitiva.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/login?view=register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: brandGradient }}
              >
                Começar gratuitamente
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSection('precos')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-sm font-medium rounded-xl transition-all hover:opacity-80"
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                }}
              >
                Ver planos
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Social proof */}
            <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10">
              {[
                { value: '2.500+', label: 'Empresas ativas' },
                { value: '150k+', label: 'Deals fechados' },
                { value: '99,9%', label: 'Uptime garantido' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div
                    className="text-xl sm:text-2xl font-bold"
                    style={{
                      background: brandGradient,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0 60L1440 60L1440 30C1440 30 1200 0 720 0C240 0 0 30 0 30L0 60Z"
              className="fill-white dark:fill-gray-950"
            />
          </svg>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="recursos" className="py-20 sm:py-28 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#4ade80' }}
            >
              Recursos
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
              Tudo que você precisa para vender mais
            </h2>
            <p className="text-base text-gray-500 dark:text-gray-400">
              Ferramentas poderosas para cada etapa do seu processo de vendas, do primeiro contato ao fechamento.
            </p>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl p-7 transition-all duration-300 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(34, 211, 238, 0.15))',
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: '#4ade80' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS CAROUSEL ========== */}
      <TestimonialsCarousel />

      {/* ========== PARTNERS CAROUSEL ========== */}
      <PartnersCarousel />

      {/* ========== PRICING SECTION ========== */}
      <section
        id="precos"
        className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: '#4ade80' }}
            >
              Preços
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-4">
              Planos que cabem no seu bolso
            </h2>
            <p className="text-base text-gray-500 dark:text-gray-400">
              Comece gratuitamente por 14 dias. Cancele quando quiser, sem burocracia.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className="relative rounded-2xl p-8 flex flex-col transition-all duration-300"
                style={
                  plan.highlighted
                    ? {
                        background: brandGradient,
                        boxShadow: '0 20px 60px -15px rgba(74, 222, 128, 0.3)',
                        transform: 'scale(1.03)',
                      }
                    : {
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                      }
                }
              >
                {plan.highlighted && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-4 py-1 rounded-full"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      color: '#ffffff',
                    }}
                  >
                    Mais popular
                  </div>
                )}

                <div className="mb-6">
                  <h3
                    className="text-lg font-semibold mb-1"
                    style={{ color: plan.highlighted ? '#ffffff' : '#111827' }}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className="text-sm mb-4"
                    style={{
                      color: plan.highlighted ? 'rgba(255,255,255,0.8)' : '#6b7280',
                    }}
                  >
                    {plan.description}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span
                      className="text-4xl font-extrabold"
                      style={{ color: plan.highlighted ? '#ffffff' : '#111827' }}
                    >
                      {plan.price}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        color: plan.highlighted ? 'rgba(255,255,255,0.7)' : '#9ca3af',
                      }}
                    >
                      {plan.period}
                    </span>
                  </div>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <Check
                        className="w-4 h-4 mt-0.5 shrink-0"
                        style={{
                          color: plan.highlighted ? 'rgba(255,255,255,0.9)' : '#4ade80',
                        }}
                      />
                      <span
                        className="text-sm"
                        style={{
                          color: plan.highlighted ? 'rgba(255,255,255,0.9)' : '#374151',
                        }}
                      >
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/login?view=register')}
                  className="w-full py-3 text-sm font-semibold rounded-xl transition-all hover:opacity-90"
                  style={
                    plan.highlighted
                      ? {
                          backgroundColor: '#ffffff',
                          color: '#059669',
                        }
                      : {
                          background: brandGradient,
                          color: '#ffffff',
                        }
                  }
                >
                  Começar agora
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section
        className="relative py-20 sm:py-28 overflow-hidden"
        style={{ backgroundColor: darkBg }}
      >
        {/* Decorative glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(74, 222, 128, 0.06), transparent)',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2
            className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4"
            style={{ color: '#ffffff' }}
          >
            Comece sua avaliação gratuita
          </h2>
          <p
            className="text-base sm:text-lg mb-10"
            style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}
          >
            Teste todos os recursos por 14 dias, sem compromisso.
          </p>
          <button
            onClick={() => navigate('/login?view=register')}
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: brandGradient }}
          >
            Criar conta grátis
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{ backgroundColor: darkerBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: brandGradient }}
              >
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold text-base tracking-tight">PulseCRM</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6">
              {['Termos', 'Privacidade', 'Contato'].map((link) => (
                <button
                  key={link}
                  className="text-xs transition-colors"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div
            className="mt-8 pt-8"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              &copy; 2024 PulseCRM. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
