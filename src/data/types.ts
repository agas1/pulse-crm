export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  avatar: string;
  status: 'active' | 'inactive' | 'lead';
  value: number;
  lastContact: string;
  notes: Note[];
  tags: string[];
  assignedTo: string;
}

export interface Note {
  id: string;
  content: string;
  date: string;
  author: string;
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  contactName: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number;
  createdAt: string;
  expectedClose: string;
  assignedTo: string;
}

export type DealStage = 'lead' | 'contato_feito' | 'proposta_enviada' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido';

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'whatsapp' | 'status_change' | 'task_done';
  description: string;
  contactName: string;
  contactId: string;
  date: string;
  meta?: string;
}

export interface EmailMessage {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  direction: 'sent' | 'received';
  starred: boolean;
}

export interface WhatsAppConversation {
  id: string;
  contactId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  status: 'active' | 'closed' | 'waiting';
  lastMessage: string;
  lastMessageDate: string;
  unread: number;
  messages: WhatsAppMessage[];
}

export interface WhatsAppMessage {
  id: string;
  content: string;
  date: string;
  direction: 'sent' | 'received';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  contactId?: string;
  contactName?: string;
  dueDate: string;
  dueTime?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  type: 'follow_up' | 'call' | 'meeting' | 'email' | 'other';
  assignedTo: string;
  createdAt: string;
  automated?: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  condition: string;
  action: string;
  enabled: boolean;
  executions: number;
  lastTriggered?: string;
}

export type UserPlan = 'trial' | 'starter' | 'professional' | 'enterprise';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'manager' | 'seller';
  plan: UserPlan;
  status: 'active' | 'inactive';
  deals: number;
  revenue: number;
  conversionRate: number;
}

export interface TimelineEvent {
  id: string;
  type: 'email_sent' | 'email_received' | 'note' | 'status_change' | 'task_done' | 'whatsapp' | 'call' | 'meeting' | 'deal_created' | 'deal_stage_change';
  title: string;
  description: string;
  date: string;
  meta?: Record<string, string>;
}
