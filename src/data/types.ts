export interface Organization {
  id: string;
  name: string;
  industry: string;
  website: string;
  phone: string;
  address: string;
  employeeCount: number;
  annualRevenue: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

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
  organizationId?: string;
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
  organizationId?: string;
  nextActivityDate?: string;
}

export type DealStage = 'lead' | 'contato_feito' | 'proposta_enviada' | 'negociacao' | 'fechado_ganho' | 'fechado_perdido';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  score: 'hot' | 'warm' | 'cold';
  notes: string;
  status: 'new' | 'contacted' | 'qualified' | 'disqualified';
  assignedTo: string;
  organizationId?: string;
  jobTitle?: string;
  companySize?: string;
  numericScore?: number;
  scoreDerivedLabel?: 'hot' | 'warm' | 'cold';
  scoreBreakdown?: ScoreBreakdown;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreBreakdown {
  opens: number;
  clicks: number;
  replies: number;
  responseSpeed: number;
  source: number;
  icp: number;
  companySize: number;
  decay: number;
  total: number;
}

export type ReplyClassificationType = 'interested' | 'not_interested' | 'meeting_request' | 'proposal_request' | 'out_of_office' | 'unsubscribe' | 'other';

export interface ReplyClassificationRecord {
  id: string;
  enrollmentId: string;
  leadId?: string;
  contactId?: string;
  replyText: string;
  classification: ReplyClassificationType;
  confidence: number;
  aiReasoning: string;
  actionsTaken: string[];
  reviewed: boolean;
  classifiedAt: string;
}

export interface UnsubscribeRecord {
  id: string;
  email: string;
  phone: string;
  reason: string;
  source: string;
  unsubscribedAt: string;
}

export interface ComplianceConfig {
  maxEmailsPerHourPerDomain: number;
  maxEmailsPerDay: number;
  softBounceRetryCount: number;
  enabled: boolean;
}

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'whatsapp' | 'status_change' | 'task_done' | 'lead_converted';
  description: string;
  contactName: string;
  contactId: string;
  date: string;
  meta?: string;
}

export interface ScheduledActivity {
  id: string;
  type: 'call' | 'meeting' | 'email' | 'follow_up' | 'task' | 'demo';
  title: string;
  description: string;
  dealId?: string;
  contactId?: string;
  assignedTo: string;
  dueDate: string;
  dueTime?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
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
  triggerType: string;
  triggerConfig: Record<string, unknown>;
  conditionType: string;
  conditionConfig: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  enabled: boolean;
  executions: number;
  lastTriggered?: string;
}

export interface AutomationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  triggerType: string;
  actionType: string;
  result: string;
  details: string;
  createdAt: string;
}

// ──────────────────────────────────────
// CADENCE ENGINE TYPES
// ──────────────────────────────────────

export type CadenceStatus = 'draft' | 'active' | 'paused' | 'archived';
export type CadenceChannel = 'email' | 'whatsapp' | 'call' | 'task' | 'linkedin_manual';
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'replied' | 'bounced' | 'unsubscribed';
export type StepExecutionStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'failed';

export interface Cadence {
  id: string;
  name: string;
  description: string;
  status: CadenceStatus;
  createdBy: string;
  totalEnrolled: number;
  totalCompleted: number;
  totalReplied: number;
  steps?: CadenceStep[];
  stepCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CadenceStep {
  id: string;
  cadenceId: string;
  stepOrder: number;
  delayDays: number;
  delayHours: number;
  channel: CadenceChannel;
  templateSubject: string;
  templateBody: string;
  conditionSkip: Record<string, unknown>;
  createdAt: string;
}

export interface CadenceEnrollment {
  id: string;
  cadenceId: string;
  leadId?: string;
  contactId?: string;
  enrolledBy: string;
  currentStep: number;
  status: EnrollmentStatus;
  startedAt: string;
  pausedAt?: string;
  completedAt?: string;
  lastStepAt?: string;
  nextStepDue?: string;
  metadata: Record<string, unknown>;
  leadName?: string;
  leadEmail?: string;
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
}

export interface CadenceStepExecution {
  id: string;
  enrollmentId: string;
  stepId: string;
  stepOrder: number;
  channel: CadenceChannel;
  status: StepExecutionStatus;
  sentAt?: string;
  openedAt?: string;
  repliedAt?: string;
  error: string;
  externalId: string;
  createdAt: string;
}

export interface ChannelConfig {
  id: string;
  channel: 'smtp' | 'whatsapp' | 'instagram';
  config: Record<string, unknown>;
  enabled: boolean;
  simulationMode: boolean;
  createdAt: string;
  updatedAt: string;
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
  type: 'email_sent' | 'email_received' | 'note' | 'status_change' | 'task_done' | 'whatsapp' | 'call' | 'meeting' | 'deal_created' | 'deal_stage_change' | 'lead_converted';
  title: string;
  description: string;
  date: string;
  meta?: Record<string, string>;
}
