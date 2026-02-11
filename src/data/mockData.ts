import type { Contact, Deal, Activity, EmailMessage, WhatsAppConversation, Task, AutomationRule, User, TimelineEvent } from './types';

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`;

export const mockCredentials: Record<string, string> = {
  'admin@pulsecrm.com': '123456',
  'marina@pulsecrm.com': '123456',
  'pedro@pulsecrm.com': '123456',
  'camila@pulsecrm.com': '123456',
  'thiago@pulsecrm.com': '123456',
};

export const users: User[] = [
  { id: 'u1', name: 'Você (Admin)', email: 'admin@pulsecrm.com', avatar: avatarUrl('Admin'), role: 'admin', plan: 'professional', status: 'active', deals: 12, revenue: 450000, conversionRate: 32 },
  { id: 'u2', name: 'Marina Rocha', email: 'marina@pulsecrm.com', avatar: avatarUrl('Marina Rocha'), role: 'seller', plan: 'professional', status: 'active', deals: 8, revenue: 280000, conversionRate: 28 },
  { id: 'u3', name: 'Pedro Henrique', email: 'pedro@pulsecrm.com', avatar: avatarUrl('Pedro Henrique'), role: 'seller', plan: 'professional', status: 'active', deals: 15, revenue: 520000, conversionRate: 38 },
  { id: 'u4', name: 'Camila Duarte', email: 'camila@pulsecrm.com', avatar: avatarUrl('Camila Duarte'), role: 'manager', plan: 'professional', status: 'active', deals: 6, revenue: 180000, conversionRate: 25 },
  { id: 'u5', name: 'Thiago Lima', email: 'thiago@pulsecrm.com', avatar: avatarUrl('Thiago Lima'), role: 'seller', plan: 'professional', status: 'inactive', deals: 3, revenue: 95000, conversionRate: 15 },
];

export const contacts: Contact[] = [
  {
    id: '1', name: 'Ana Carolina Silva', email: 'ana.silva@techcorp.com', phone: '(11) 99876-5432',
    company: 'TechCorp Solutions', role: 'Diretora de TI', avatar: avatarUrl('Ana Silva'),
    status: 'active', value: 85000, lastContact: '2025-01-28', assignedTo: 'u1',
    tags: ['Enterprise', 'TI', 'Decisor'],
    notes: [
      { id: 'n1', content: 'Interessada na solução completa. Agendada demo para próxima semana.', date: '2025-01-28', author: 'Você' },
      { id: 'n2', content: 'Enviado proposta comercial com desconto de 15% para fechamento em janeiro.', date: '2025-01-20', author: 'Você' },
    ],
  },
  {
    id: '2', name: 'Ricardo Mendes', email: 'ricardo@innovatech.io', phone: '(21) 98765-4321',
    company: 'InnovaTech', role: 'CEO', avatar: avatarUrl('Ricardo Mendes'),
    status: 'active', value: 120000, lastContact: '2025-01-27', assignedTo: 'u3',
    tags: ['Startup', 'CEO', 'Premium'],
    notes: [
      { id: 'n3', content: 'Reunião muito produtiva. Quer integrar com sistema atual deles.', date: '2025-01-27', author: 'Pedro Henrique' },
    ],
  },
  {
    id: '3', name: 'Juliana Costa', email: 'juliana.costa@globalmarket.com', phone: '(31) 97654-3210',
    company: 'GlobalMarket', role: 'Gerente Comercial', avatar: avatarUrl('Juliana Costa'),
    status: 'lead', value: 45000, lastContact: '2025-01-25', assignedTo: 'u2',
    tags: ['Varejo', 'Gerente'],
    notes: [
      { id: 'n4', content: 'Primeiro contato feito via LinkedIn. Demonstrou interesse.', date: '2025-01-25', author: 'Marina Rocha' },
    ],
  },
  {
    id: '4', name: 'Fernando Oliveira', email: 'fernando@dataflow.com.br', phone: '(41) 96543-2109',
    company: 'DataFlow Analytics', role: 'CTO', avatar: avatarUrl('Fernando Oliveira'),
    status: 'active', value: 200000, lastContact: '2025-01-26', assignedTo: 'u1',
    tags: ['Enterprise', 'Tech', 'CTO'],
    notes: [
      { id: 'n5', content: 'Negociação em fase final. Aguardando aprovação do board.', date: '2025-01-26', author: 'Você' },
      { id: 'n6', content: 'Apresentação técnica realizada com sucesso. Time de dev aprovou.', date: '2025-01-18', author: 'Você' },
    ],
  },
  {
    id: '5', name: 'Mariana Santos', email: 'mariana@creativelab.design', phone: '(51) 95432-1098',
    company: 'Creative Lab', role: 'Head de Design', avatar: avatarUrl('Mariana Santos'),
    status: 'lead', value: 32000, lastContact: '2025-01-24', assignedTo: 'u2',
    tags: ['Design', 'Startup'],
    notes: [
      { id: 'n7', content: 'Indicação do Ricardo (InnovaTech). Agendar call de apresentação.', date: '2025-01-24', author: 'Marina Rocha' },
    ],
  },
  {
    id: '6', name: 'Carlos Eduardo Pinto', email: 'carlos@megastore.com.br', phone: '(61) 94321-0987',
    company: 'MegaStore Brasil', role: 'Diretor Comercial', avatar: avatarUrl('Carlos Pinto'),
    status: 'active', value: 150000, lastContact: '2025-01-29', assignedTo: 'u3',
    tags: ['Varejo', 'Enterprise', 'Decisor'],
    notes: [
      { id: 'n8', content: 'Contrato assinado! Início da implementação em fevereiro.', date: '2025-01-29', author: 'Pedro Henrique' },
    ],
  },
  {
    id: '7', name: 'Patrícia Almeida', email: 'patricia@healthplus.med', phone: '(71) 93210-9876',
    company: 'HealthPlus', role: 'COO', avatar: avatarUrl('Patricia Almeida'),
    status: 'inactive', value: 0, lastContact: '2024-12-15', assignedTo: 'u4',
    tags: ['Saúde', 'Perdido'],
    notes: [
      { id: 'n9', content: 'Projeto adiado para o próximo semestre por questões orçamentárias.', date: '2024-12-15', author: 'Camila Duarte' },
    ],
  },
  {
    id: '8', name: 'Lucas Ferreira', email: 'lucas@fintechbr.io', phone: '(11) 92109-8765',
    company: 'FintechBR', role: 'Product Manager', avatar: avatarUrl('Lucas Ferreira'),
    status: 'lead', value: 65000, lastContact: '2025-01-23', assignedTo: 'u1',
    tags: ['Fintech', 'PM'],
    notes: [
      { id: 'n10', content: 'Veio pelo webinar. Precisa de solução de automação de vendas.', date: '2025-01-23', author: 'Você' },
    ],
  },
];

export const deals: Deal[] = [
  { id: 'd1', title: 'Plataforma Enterprise TechCorp', contactId: '1', contactName: 'Ana Carolina Silva', company: 'TechCorp Solutions', value: 85000, stage: 'proposal', probability: 60, createdAt: '2025-01-10', expectedClose: '2025-02-28', assignedTo: 'u1' },
  { id: 'd2', title: 'Integração InnovaTech', contactId: '2', contactName: 'Ricardo Mendes', company: 'InnovaTech', value: 120000, stage: 'negotiation', probability: 80, createdAt: '2025-01-05', expectedClose: '2025-02-15', assignedTo: 'u3' },
  { id: 'd3', title: 'CRM GlobalMarket', contactId: '3', contactName: 'Juliana Costa', company: 'GlobalMarket', value: 45000, stage: 'lead', probability: 20, createdAt: '2025-01-25', expectedClose: '2025-03-30', assignedTo: 'u2' },
  { id: 'd4', title: 'Analytics Suite DataFlow', contactId: '4', contactName: 'Fernando Oliveira', company: 'DataFlow Analytics', value: 200000, stage: 'negotiation', probability: 90, createdAt: '2024-12-20', expectedClose: '2025-02-10', assignedTo: 'u1' },
  { id: 'd5', title: 'Design Tools Creative Lab', contactId: '5', contactName: 'Mariana Santos', company: 'Creative Lab', value: 32000, stage: 'lead', probability: 15, createdAt: '2025-01-24', expectedClose: '2025-04-15', assignedTo: 'u2' },
  { id: 'd6', title: 'MegaStore Full Package', contactId: '6', contactName: 'Carlos Eduardo Pinto', company: 'MegaStore Brasil', value: 150000, stage: 'closed', probability: 100, createdAt: '2024-11-15', expectedClose: '2025-01-29', assignedTo: 'u3' },
  { id: 'd7', title: 'Automação FintechBR', contactId: '8', contactName: 'Lucas Ferreira', company: 'FintechBR', value: 65000, stage: 'qualified', probability: 35, createdAt: '2025-01-23', expectedClose: '2025-03-20', assignedTo: 'u1' },
  { id: 'd8', title: 'Expansion Pack TechCorp', contactId: '1', contactName: 'Ana Carolina Silva', company: 'TechCorp Solutions', value: 42000, stage: 'qualified', probability: 40, createdAt: '2025-01-28', expectedClose: '2025-03-15', assignedTo: 'u1' },
];

export const activities: Activity[] = [
  { id: 'a1', type: 'email', description: 'Proposta enviada para revisão', contactName: 'Ana Carolina Silva', contactId: '1', date: '2025-01-29 14:30' },
  { id: 'a2', type: 'call', description: 'Call de alinhamento sobre integração', contactName: 'Ricardo Mendes', contactId: '2', date: '2025-01-29 11:00' },
  { id: 'a3', type: 'meeting', description: 'Assinatura de contrato', contactName: 'Carlos Eduardo Pinto', contactId: '6', date: '2025-01-29 09:00' },
  { id: 'a4', type: 'note', description: 'Atualização sobre aprovação do board', contactName: 'Fernando Oliveira', contactId: '4', date: '2025-01-28 16:45' },
  { id: 'a5', type: 'whatsapp', description: 'Mensagem de follow-up enviada', contactName: 'Lucas Ferreira', contactId: '8', date: '2025-01-28 10:20' },
  { id: 'a6', type: 'call', description: 'Primeiro contato via LinkedIn', contactName: 'Juliana Costa', contactId: '3', date: '2025-01-27 15:00' },
  { id: 'a7', type: 'meeting', description: 'Demo da plataforma', contactName: 'Ana Carolina Silva', contactId: '1', date: '2025-01-27 10:00' },
  { id: 'a8', type: 'status_change', description: 'Status alterado para Negociação', contactName: 'Ricardo Mendes', contactId: '2', date: '2025-01-26 14:00', meta: 'Proposta → Negociação' },
  { id: 'a9', type: 'task_done', description: 'Tarefa concluída: Enviar proposta', contactName: 'Fernando Oliveira', contactId: '4', date: '2025-01-26 11:00' },
  { id: 'a10', type: 'email', description: 'Apresentação Creative Lab enviada', contactName: 'Mariana Santos', contactId: '5', date: '2025-01-25 14:00' },
];

export const emails: EmailMessage[] = [
  { id: 'e1', contactId: '1', contactName: 'Ana Carolina Silva', contactEmail: 'ana.silva@techcorp.com', subject: 'Re: Proposta Comercial PulseCRM', preview: 'Olá! Analisei a proposta e tenho algumas considerações...', body: 'Olá!\n\nAnalisei a proposta e tenho algumas considerações sobre os módulos incluídos. Podemos agendar uma call para discutir os pontos?\n\nAbraço,\nAna Carolina', date: '2025-01-29 14:30', read: false, direction: 'received', starred: true },
  { id: 'e2', contactId: '1', contactName: 'Ana Carolina Silva', contactEmail: 'ana.silva@techcorp.com', subject: 'Proposta Comercial PulseCRM - TechCorp', preview: 'Segue em anexo a proposta comercial atualizada...', body: 'Olá Ana,\n\nSegue em anexo a proposta comercial atualizada com os termos que discutimos na reunião.\n\nFicamos à disposição.\n\nAtt,\nEquipe PulseCRM', date: '2025-01-28 10:00', read: true, direction: 'sent', starred: false },
  { id: 'e3', contactId: '4', contactName: 'Fernando Oliveira', contactEmail: 'fernando@dataflow.com.br', subject: 'Aprovação do Board - DataFlow', preview: 'Boa notícia! O board aprovou o orçamento...', body: 'Olá equipe,\n\nBoa notícia! O board aprovou o orçamento para a implementação. Vamos agendar o kickoff?\n\nAbs,\nFernando', date: '2025-01-28 16:45', read: false, direction: 'received', starred: true },
  { id: 'e4', contactId: '2', contactName: 'Ricardo Mendes', contactEmail: 'ricardo@innovatech.io', subject: 'Documentação técnica da API', preview: 'Ricardo, conforme combinado segue a doc técnica...', body: 'Ricardo,\n\nConforme combinado na call, segue a documentação técnica da nossa API para integração.\n\nQualquer dúvida estamos à disposição.\n\nAtt,\nPedro Henrique', date: '2025-01-27 15:30', read: true, direction: 'sent', starred: false },
  { id: 'e5', contactId: '5', contactName: 'Mariana Santos', contactEmail: 'mariana@creativelab.design', subject: 'Apresentação PulseCRM', preview: 'Olá Mariana! O Ricardo Mendes nos indicou...', body: 'Olá Mariana!\n\nO Ricardo Mendes da InnovaTech nos indicou. Temos uma plataforma que pode ajudar muito o Creative Lab.\n\nPodemos agendar uma apresentação?\n\nAtt,\nMarina Rocha', date: '2025-01-25 14:00', read: true, direction: 'sent', starred: false },
  { id: 'e6', contactId: '8', contactName: 'Lucas Ferreira', contactEmail: 'lucas@fintechbr.io', subject: 'Re: Webinar - Automação de Vendas', preview: 'Muito interessante o webinar! Gostaria de saber mais...', body: 'Olá!\n\nMuito interessante o webinar! Gostaria de saber mais sobre a automação de vendas, especificamente para fintech.\n\nPodemos conversar?\n\nLucas', date: '2025-01-23 16:00', read: true, direction: 'received', starred: false },
  { id: 'e7', contactId: '3', contactName: 'Juliana Costa', contactEmail: 'juliana.costa@globalmarket.com', subject: 'Interesse em CRM para Varejo', preview: 'Olá, vi o perfil de vocês no LinkedIn...', body: 'Olá,\n\nVi o perfil de vocês no LinkedIn e me interessei pela solução. Trabalho na GlobalMarket e estamos buscando um CRM.\n\nPodemos conversar?\n\nJuliana', date: '2025-01-25 09:30', read: true, direction: 'received', starred: false },
];

export const whatsappConversations: WhatsAppConversation[] = [
  {
    id: 'w1', contactId: '1', contactName: 'Ana Carolina Silva', contactPhone: '(11) 99876-5432',
    contactAvatar: avatarUrl('Ana Silva'), status: 'active', lastMessage: 'Perfeito, vamos agendar!',
    lastMessageDate: '2025-01-29 15:20', unread: 1,
    messages: [
      { id: 'wm1', content: 'Olá Ana! Tudo bem? Vi que você recebeu a proposta.', date: '2025-01-29 14:50', direction: 'sent' },
      { id: 'wm2', content: 'Oi! Sim, estou analisando. Achei interessante o pacote Enterprise.', date: '2025-01-29 15:05', direction: 'received' },
      { id: 'wm3', content: 'Fico feliz! Posso te apresentar os detalhes em uma call rápida?', date: '2025-01-29 15:10', direction: 'sent' },
      { id: 'wm4', content: 'Perfeito, vamos agendar!', date: '2025-01-29 15:20', direction: 'received' },
    ],
  },
  {
    id: 'w2', contactId: '2', contactName: 'Ricardo Mendes', contactPhone: '(21) 98765-4321',
    contactAvatar: avatarUrl('Ricardo Mendes'), status: 'active', lastMessage: 'Vou verificar com meu time técnico',
    lastMessageDate: '2025-01-28 11:30', unread: 0,
    messages: [
      { id: 'wm5', content: 'Ricardo, enviamos a documentação técnica por e-mail.', date: '2025-01-28 10:00', direction: 'sent' },
      { id: 'wm6', content: 'Recebi! Obrigado pela agilidade.', date: '2025-01-28 10:15', direction: 'received' },
      { id: 'wm7', content: 'Qualquer dúvida estamos aqui. Precisa de suporte para a integração?', date: '2025-01-28 10:20', direction: 'sent' },
      { id: 'wm8', content: 'Vou verificar com meu time técnico', date: '2025-01-28 11:30', direction: 'received' },
    ],
  },
  {
    id: 'w3', contactId: '8', contactName: 'Lucas Ferreira', contactPhone: '(11) 92109-8765',
    contactAvatar: avatarUrl('Lucas Ferreira'), status: 'waiting', lastMessage: 'Olá Lucas! Vi que participou do nosso webinar...',
    lastMessageDate: '2025-01-28 10:20', unread: 0,
    messages: [
      { id: 'wm9', content: 'Olá Lucas! Vi que participou do nosso webinar sobre automação de vendas. O que achou?', date: '2025-01-28 10:20', direction: 'sent' },
    ],
  },
  {
    id: 'w4', contactId: '6', contactName: 'Carlos Eduardo Pinto', contactPhone: '(61) 94321-0987',
    contactAvatar: avatarUrl('Carlos Pinto'), status: 'closed', lastMessage: 'Obrigado! Estamos ansiosos para começar.',
    lastMessageDate: '2025-01-29 09:30', unread: 0,
    messages: [
      { id: 'wm10', content: 'Carlos, parabéns pela assinatura! Vamos iniciar a implementação em fevereiro.', date: '2025-01-29 09:15', direction: 'sent' },
      { id: 'wm11', content: 'Obrigado! Estamos ansiosos para começar.', date: '2025-01-29 09:30', direction: 'received' },
    ],
  },
];

export const instagramConversations: WhatsAppConversation[] = [
  {
    id: 'ig1', contactId: '3', contactName: 'Juliana Costa', contactPhone: '@juliana.costa',
    contactAvatar: avatarUrl('Juliana Costa'), status: 'active', lastMessage: 'Adorei o conteúdo! Como funciona o plano Enterprise?',
    lastMessageDate: '2025-01-29 16:45', unread: 2,
    messages: [
      { id: 'igm1', content: 'Oi! Vi que vocês postaram sobre automação de vendas. Muito interessante!', date: '2025-01-29 16:10', direction: 'received' },
      { id: 'igm2', content: 'Obrigado, Juliana! Fico feliz que gostou. Temos soluções específicas para varejo, posso te contar mais?', date: '2025-01-29 16:15', direction: 'sent' },
      { id: 'igm3', content: 'Sim! Temos 50 lojas e preciso de algo escalável.', date: '2025-01-29 16:30', direction: 'received' },
      { id: 'igm4', content: 'Adorei o conteúdo! Como funciona o plano Enterprise?', date: '2025-01-29 16:45', direction: 'received' },
    ],
  },
  {
    id: 'ig2', contactId: '5', contactName: 'Mariana Santos', contactPhone: '@mariana.santos.design',
    contactAvatar: avatarUrl('Mariana Santos'), status: 'active', lastMessage: 'Vou dar uma olhada no site de vocês!',
    lastMessageDate: '2025-01-28 18:00', unread: 0,
    messages: [
      { id: 'igm5', content: 'Oi Mariana! Seus projetos de design são incríveis. Já conhece nosso CRM?', date: '2025-01-28 17:30', direction: 'sent' },
      { id: 'igm6', content: 'Oi! Obrigada 😊 Na verdade estamos precisando organizar nossos clientes', date: '2025-01-28 17:45', direction: 'received' },
      { id: 'igm7', content: 'Temos planos para agências criativas com funcionalidades visuais. Posso enviar uma apresentação?', date: '2025-01-28 17:50', direction: 'sent' },
      { id: 'igm8', content: 'Vou dar uma olhada no site de vocês!', date: '2025-01-28 18:00', direction: 'received' },
    ],
  },
  {
    id: 'ig3', contactId: '9', contactName: 'Gabriel Souza', contactPhone: '@gabriel.souza.tech',
    contactAvatar: avatarUrl('Gabriel Souza'), status: 'waiting', lastMessage: 'Mandei um DM perguntando sobre integração com Shopify',
    lastMessageDate: '2025-01-27 20:10', unread: 0,
    messages: [
      { id: 'igm9', content: 'Olá! Vi no story de vocês que tem integração com Shopify. É real?', date: '2025-01-27 20:10', direction: 'received' },
    ],
  },
];

export const tasks: Task[] = [
  { id: 't1', title: 'Follow-up proposta TechCorp', description: 'Ligar para Ana Carolina sobre a proposta enviada', contactId: '1', contactName: 'Ana Carolina Silva', dueDate: '2025-01-30', dueTime: '10:00', priority: 'high', status: 'pending', type: 'follow_up', assignedTo: 'u1', createdAt: '2025-01-28' },
  { id: 't2', title: 'Reunião kickoff DataFlow', description: 'Agendar reunião de kickoff com o time do Fernando', contactId: '4', contactName: 'Fernando Oliveira', dueDate: '2025-02-03', dueTime: '14:00', priority: 'high', status: 'pending', type: 'meeting', assignedTo: 'u1', createdAt: '2025-01-28' },
  { id: 't3', title: 'Enviar case studies para GlobalMarket', description: 'Preparar e enviar cases de varejo', contactId: '3', contactName: 'Juliana Costa', dueDate: '2025-01-31', dueTime: '09:00', priority: 'medium', status: 'in_progress', type: 'email', assignedTo: 'u2', createdAt: '2025-01-26' },
  { id: 't4', title: 'Call com Creative Lab', description: 'Primeira apresentação da plataforma', contactId: '5', contactName: 'Mariana Santos', dueDate: '2025-02-01', dueTime: '15:00', priority: 'medium', status: 'pending', type: 'call', assignedTo: 'u2', createdAt: '2025-01-25' },
  { id: 't5', title: 'Preparar demo customizada InnovaTech', description: 'Criar ambiente demo com integrações relevantes', contactId: '2', contactName: 'Ricardo Mendes', dueDate: '2025-02-02', priority: 'high', status: 'in_progress', type: 'other', assignedTo: 'u3', createdAt: '2025-01-27' },
  { id: 't6', title: 'Follow-up FintechBR', description: 'Gerado automaticamente: lead sem resposta há 5 dias', contactId: '8', contactName: 'Lucas Ferreira', dueDate: '2025-01-30', priority: 'medium', status: 'pending', type: 'follow_up', assignedTo: 'u1', createdAt: '2025-01-28', automated: true },
  { id: 't7', title: 'Atualizar CRM MegaStore', description: 'Marcar deal como implementação iniciada', contactId: '6', contactName: 'Carlos Eduardo Pinto', dueDate: '2025-02-01', priority: 'low', status: 'completed', type: 'other', assignedTo: 'u3', createdAt: '2025-01-29' },
  { id: 't8', title: 'Enviar NDA para Patrícia', description: 'Gerado automaticamente: reativar contato inativo', contactId: '7', contactName: 'Patrícia Almeida', dueDate: '2025-02-05', priority: 'low', status: 'pending', type: 'email', assignedTo: 'u4', createdAt: '2025-01-29', automated: true },
];

export const automationRules: AutomationRule[] = [
  { id: 'ar1', name: 'Novo Lead → Criar Tarefa', description: 'Quando um novo lead é cadastrado, cria automaticamente uma tarefa de follow-up para o vendedor responsável', trigger: 'Novo lead cadastrado', condition: 'Status = Lead', action: 'Criar tarefa "Follow-up inicial" (prazo: 2 dias)', enabled: true, executions: 47, lastTriggered: '2025-01-28 14:30' },
  { id: 'ar2', name: 'Lead Inativo → Alerta', description: 'Quando um lead fica sem interação por mais de 5 dias, gera um alerta visual e cria tarefa automática', trigger: 'Lead sem interação > 5 dias', condition: 'Status ≠ Fechado', action: 'Alerta visual + Criar tarefa "Reativar contato"', enabled: true, executions: 23, lastTriggered: '2025-01-27 08:00' },
  { id: 'ar3', name: 'Mudança de Estágio → E-mail', description: 'Quando um deal muda para Proposta, envia automaticamente um e-mail template com a proposta comercial', trigger: 'Deal mudou de estágio', condition: 'Novo estágio = Proposta', action: 'Enviar e-mail template "Proposta Comercial"', enabled: true, executions: 15, lastTriggered: '2025-01-26 11:00' },
  { id: 'ar4', name: 'Deal Fechado → Onboarding', description: 'Quando um deal é marcado como Fechado, cria automaticamente tarefas de onboarding para o cliente', trigger: 'Deal estágio = Fechado', condition: 'Valor > R$ 50.000', action: 'Criar 3 tarefas de onboarding + Notificar gestor', enabled: true, executions: 8, lastTriggered: '2025-01-29 09:00' },
  { id: 'ar5', name: 'Follow-up Pós Demo', description: 'Após uma reunião de demo, cria tarefa de follow-up para 3 dias depois', trigger: 'Tarefa tipo "Demo" concluída', condition: 'Deal em Qualificado ou Proposta', action: 'Criar tarefa "Follow-up pós demo" (prazo: 3 dias)', enabled: true, executions: 12, lastTriggered: '2025-01-27 16:00' },
  { id: 'ar6', name: 'Reativação de Inativos', description: 'A cada 30 dias, verifica contatos inativos e cria tarefa para tentar reativação', trigger: 'Ciclo mensal (dia 1)', condition: 'Status = Inativo, última interação > 30 dias', action: 'Criar tarefa "Tentativa de reativação"', enabled: false, executions: 3, lastTriggered: '2025-01-01 08:00' },
];

export const getTimelineForContact = (contactId: string): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const contact = contacts.find(c => c.id === contactId);
  if (!contact) return events;

  emails.filter(e => e.contactId === contactId).forEach(e => {
    events.push({ id: `tl-${e.id}`, type: e.direction === 'sent' ? 'email_sent' : 'email_received', title: e.direction === 'sent' ? 'E-mail enviado' : 'E-mail recebido', description: e.subject, date: e.date, meta: { preview: e.preview } });
  });

  contact.notes.forEach(n => {
    events.push({ id: `tl-${n.id}`, type: 'note', title: 'Anotação adicionada', description: n.content, date: n.date + ' 12:00', meta: { author: n.author } });
  });

  activities.filter(a => a.contactId === contactId).forEach(a => {
    if (a.type === 'call') events.push({ id: `tl-${a.id}`, type: 'call', title: 'Ligação realizada', description: a.description, date: a.date });
    if (a.type === 'meeting') events.push({ id: `tl-${a.id}`, type: 'meeting', title: 'Reunião', description: a.description, date: a.date });
    if (a.type === 'whatsapp') events.push({ id: `tl-${a.id}`, type: 'whatsapp', title: 'WhatsApp', description: a.description, date: a.date });
    if (a.type === 'status_change') events.push({ id: `tl-${a.id}`, type: 'status_change', title: 'Mudança de status', description: a.description, date: a.date, meta: { change: a.meta || '' } });
    if (a.type === 'task_done') events.push({ id: `tl-${a.id}`, type: 'task_done', title: 'Tarefa concluída', description: a.description, date: a.date });
  });

  deals.filter(d => d.contactId === contactId).forEach(d => {
    events.push({ id: `tl-deal-${d.id}`, type: 'deal_created', title: 'Deal criado', description: d.title, date: d.createdAt + ' 09:00', meta: { value: `R$ ${d.value.toLocaleString('pt-BR')}` } });
  });

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const monthlyRevenue = [
  { month: 'Ago', value: 45000 },
  { month: 'Set', value: 62000 },
  { month: 'Out', value: 58000 },
  { month: 'Nov', value: 78000 },
  { month: 'Dez', value: 95000 },
  { month: 'Jan', value: 150000 },
];

export const dealsByStage = [
  { name: 'Lead', value: 2, color: '#94a3b8' },
  { name: 'Qualificado', value: 2, color: '#60a5fa' },
  { name: 'Proposta', value: 1, color: '#f59e0b' },
  { name: 'Negociação', value: 2, color: '#8b5cf6' },
  { name: 'Fechado', value: 1, color: '#22c55e' },
];

export const conversionData = [
  { month: 'Ago', leads: 20, converted: 5 },
  { month: 'Set', leads: 28, converted: 8 },
  { month: 'Out', leads: 25, converted: 6 },
  { month: 'Nov', leads: 32, converted: 10 },
  { month: 'Dez', leads: 30, converted: 12 },
  { month: 'Jan', leads: 35, converted: 15 },
];

export const revenueByUser = [
  { name: 'Pedro H.', revenue: 520000, deals: 15, rate: 38 },
  { name: 'Você', revenue: 450000, deals: 12, rate: 32 },
  { name: 'Marina R.', revenue: 280000, deals: 8, rate: 28 },
  { name: 'Camila D.', revenue: 180000, deals: 6, rate: 25 },
];

export const avgClosingTime = [
  { stage: 'Lead→Qualif.', days: 5 },
  { stage: 'Qualif.→Prop.', days: 8 },
  { stage: 'Prop.→Negoc.', days: 12 },
  { stage: 'Negoc.→Fechado', days: 7 },
  { stage: 'Total Médio', days: 32 },
];
