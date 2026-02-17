import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'pulse-crm.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ──────────────────────────────────────
// TABLES
// ──────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    role TEXT CHECK(role IN ('admin','manager','seller')) NOT NULL DEFAULT 'seller',
    plan TEXT CHECK(plan IN ('trial','starter','professional','enterprise')) NOT NULL DEFAULT 'trial',
    status TEXT CHECK(status IN ('active','inactive')) NOT NULL DEFAULT 'active',
    deals INTEGER DEFAULT 0,
    revenue REAL DEFAULT 0,
    conversion_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT DEFAULT '',
    website TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    address TEXT DEFAULT '',
    employee_count INTEGER DEFAULT 0,
    annual_revenue REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    company TEXT DEFAULT '',
    role TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    status TEXT CHECK(status IN ('active','inactive','lead')) NOT NULL DEFAULT 'lead',
    value REAL DEFAULT 0,
    last_contact TEXT DEFAULT (date('now')),
    tags TEXT DEFAULT '[]',
    assigned_to TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT NOT NULL,
    date TEXT DEFAULT (date('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    company TEXT DEFAULT '',
    value REAL DEFAULT 0,
    stage TEXT CHECK(stage IN ('lead','contato_feito','proposta_enviada','negociacao','fechado_ganho','fechado_perdido')) NOT NULL DEFAULT 'lead',
    probability INTEGER DEFAULT 20,
    expected_close TEXT,
    assigned_to TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    next_activity_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    company TEXT DEFAULT '',
    source TEXT DEFAULT '',
    score TEXT CHECK(score IN ('hot','warm','cold')) DEFAULT 'warm',
    notes TEXT DEFAULT '',
    status TEXT CHECK(status IN ('new','contacted','qualified','disqualified')) DEFAULT 'new',
    assigned_to TEXT REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
    job_title TEXT DEFAULT '',
    company_size TEXT CHECK(company_size IN ('','1-10','11-50','51-200','201-1000','1000+')) DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('email','call','meeting','note','whatsapp','status_change','task_done','lead_converted')) NOT NULL,
    description TEXT NOT NULL,
    contact_name TEXT DEFAULT '',
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    deal_id TEXT REFERENCES deals(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    meta TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    contact_name TEXT DEFAULT '',
    due_date TEXT NOT NULL,
    due_time TEXT,
    priority TEXT CHECK(priority IN ('low','medium','high')) NOT NULL DEFAULT 'medium',
    status TEXT CHECK(status IN ('pending','in_progress','completed')) NOT NULL DEFAULT 'pending',
    type TEXT CHECK(type IN ('follow_up','call','meeting','email','other')) NOT NULL DEFAULT 'other',
    assigned_to TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    automated INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    contact_name TEXT DEFAULT '',
    contact_email TEXT DEFAULT '',
    subject TEXT NOT NULL,
    preview TEXT DEFAULT '',
    body TEXT DEFAULT '',
    date TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    direction TEXT CHECK(direction IN ('sent','received')) NOT NULL,
    starred INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS scheduled_activities (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('call','meeting','email','follow_up','task','demo')) NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    deal_id TEXT REFERENCES deals(id) ON DELETE CASCADE,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_to TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date TEXT NOT NULL,
    due_time TEXT,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    trigger_event TEXT NOT NULL,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    trigger_type TEXT DEFAULT '',
    trigger_config TEXT DEFAULT '{}',
    condition_type TEXT DEFAULT 'always',
    condition_config TEXT DEFAULT '{}',
    action_type TEXT DEFAULT '',
    action_config TEXT DEFAULT '{}',
    enabled INTEGER DEFAULT 1,
    executions INTEGER DEFAULT 0,
    last_triggered TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS automation_logs (
    id TEXT PRIMARY KEY,
    rule_id TEXT REFERENCES automation_rules(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    action_type TEXT NOT NULL,
    result TEXT DEFAULT 'success',
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ──────────────────────────────────────
// CADENCE ENGINE TABLES
// ──────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS cadences (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT CHECK(status IN ('draft','active','paused','archived')) NOT NULL DEFAULT 'draft',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_enrolled INTEGER DEFAULT 0,
    total_completed INTEGER DEFAULT 0,
    total_replied INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cadence_steps (
    id TEXT PRIMARY KEY,
    cadence_id TEXT NOT NULL REFERENCES cadences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    delay_days INTEGER NOT NULL DEFAULT 0,
    delay_hours INTEGER NOT NULL DEFAULT 0,
    channel TEXT CHECK(channel IN ('email','whatsapp','call','task','linkedin_manual')) NOT NULL,
    template_subject TEXT DEFAULT '',
    template_body TEXT DEFAULT '',
    condition_skip TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cadence_enrollments (
    id TEXT PRIMARY KEY,
    cadence_id TEXT NOT NULL REFERENCES cadences(id) ON DELETE CASCADE,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    enrolled_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    status TEXT CHECK(status IN ('active','paused','completed','replied','bounced','unsubscribed')) NOT NULL DEFAULT 'active',
    started_at TEXT DEFAULT (datetime('now')),
    paused_at TEXT,
    completed_at TEXT,
    last_step_at TEXT,
    next_step_due TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS cadence_step_executions (
    id TEXT PRIMARY KEY,
    enrollment_id TEXT NOT NULL REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL REFERENCES cadence_steps(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    channel TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending','sent','delivered','opened','replied','bounced','failed')) NOT NULL DEFAULT 'pending',
    sent_at TEXT,
    opened_at TEXT,
    replied_at TEXT,
    error TEXT DEFAULT '',
    external_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS channel_configs (
    id TEXT PRIMARY KEY,
    channel TEXT CHECK(channel IN ('smtp','whatsapp','instagram')) NOT NULL UNIQUE,
    config TEXT NOT NULL DEFAULT '{}',
    enabled INTEGER DEFAULT 0,
    simulation_mode INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ──────────────────────────────────────
// SDR INTELLIGENCE TABLES
// ──────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS lead_scores (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    numeric_score INTEGER NOT NULL DEFAULT 0 CHECK(numeric_score >= 0 AND numeric_score <= 100),
    score_breakdown TEXT NOT NULL DEFAULT '{}',
    derived_label TEXT CHECK(derived_label IN ('hot','warm','cold')) DEFAULT 'cold',
    last_interaction_at TEXT,
    last_calculated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS lead_score_events (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    points_delta INTEGER NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS reply_classifications (
    id TEXT PRIMARY KEY,
    enrollment_id TEXT NOT NULL REFERENCES cadence_enrollments(id) ON DELETE CASCADE,
    step_execution_id TEXT REFERENCES cadence_step_executions(id) ON DELETE SET NULL,
    lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
    contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL,
    reply_text TEXT NOT NULL,
    classification TEXT CHECK(classification IN ('interested','not_interested','meeting_request','proposal_request','out_of_office','unsubscribe','other')) NOT NULL,
    confidence REAL DEFAULT 0.0,
    ai_reasoning TEXT DEFAULT '',
    actions_taken TEXT DEFAULT '[]',
    reviewed INTEGER DEFAULT 0,
    classified_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS unsubscribe_list (
    id TEXT PRIMARY KEY,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    reason TEXT DEFAULT '',
    source TEXT DEFAULT '',
    enrollment_id TEXT REFERENCES cadence_enrollments(id) ON DELETE SET NULL,
    unsubscribed_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS send_log (
    id TEXT PRIMARY KEY,
    email_domain TEXT NOT NULL,
    sent_at TEXT DEFAULT (datetime('now')),
    execution_id TEXT REFERENCES cadence_step_executions(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bounce_log (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    bounce_type TEXT CHECK(bounce_type IN ('hard','soft')) NOT NULL,
    reason TEXT DEFAULT '',
    execution_id TEXT REFERENCES cadence_step_executions(id) ON DELETE SET NULL,
    bounced_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS compliance_config (
    id TEXT PRIMARY KEY DEFAULT 'config',
    max_emails_per_hour_per_domain INTEGER DEFAULT 30,
    max_emails_per_day INTEGER DEFAULT 200,
    soft_bounce_retry_count INTEGER DEFAULT 1,
    enabled INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ──────────────────────────────────────
// INDEXES
// ──────────────────────────────────────

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
  CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
  CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
  CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
  CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  CREATE INDEX IF NOT EXISTS idx_deals_org ON deals(organization_id);
  CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
  CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_emails_contact ON emails(contact_id);
  CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
  CREATE INDEX IF NOT EXISTS idx_sched_deal ON scheduled_activities(deal_id);
  CREATE INDEX IF NOT EXISTS idx_sched_assigned ON scheduled_activities(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_sched_due ON scheduled_activities(due_date);
  CREATE INDEX IF NOT EXISTS idx_sched_completed ON scheduled_activities(completed);
  CREATE INDEX IF NOT EXISTS idx_autolog_rule ON automation_logs(rule_id);
  CREATE INDEX IF NOT EXISTS idx_autolog_date ON automation_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_cadence_steps_cadence ON cadence_steps(cadence_id);
  CREATE INDEX IF NOT EXISTS idx_cadence_steps_order ON cadence_steps(cadence_id, step_order);
  CREATE INDEX IF NOT EXISTS idx_enrollments_cadence ON cadence_enrollments(cadence_id);
  CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON cadence_enrollments(lead_id);
  CREATE INDEX IF NOT EXISTS idx_enrollments_contact ON cadence_enrollments(contact_id);
  CREATE INDEX IF NOT EXISTS idx_enrollments_status ON cadence_enrollments(status);
  CREATE INDEX IF NOT EXISTS idx_enrollments_next_due ON cadence_enrollments(status, next_step_due);
  CREATE INDEX IF NOT EXISTS idx_step_exec_enrollment ON cadence_step_executions(enrollment_id);
  CREATE INDEX IF NOT EXISTS idx_step_exec_status ON cadence_step_executions(status);
  CREATE INDEX IF NOT EXISTS idx_channel_configs_channel ON channel_configs(channel);

  CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
  CREATE INDEX IF NOT EXISTS idx_lead_scores_numeric ON lead_scores(numeric_score DESC);
  CREATE INDEX IF NOT EXISTS idx_lead_score_events_lead ON lead_score_events(lead_id);
  CREATE INDEX IF NOT EXISTS idx_reply_class_enrollment ON reply_classifications(enrollment_id);
  CREATE INDEX IF NOT EXISTS idx_reply_class_lead ON reply_classifications(lead_id);
  CREATE INDEX IF NOT EXISTS idx_reply_class_classification ON reply_classifications(classification);
  CREATE INDEX IF NOT EXISTS idx_send_log_domain_time ON send_log(email_domain, sent_at);
  CREATE INDEX IF NOT EXISTS idx_bounce_email ON bounce_log(email);
`);

// ──────────────────────────────────────
// SEED DATA
// ──────────────────────────────────────

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

if (userCount.count === 0) {
  console.log('🌱 Seeding database...');

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const seedAll = db.transaction(() => {
    // ── Users ──
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password, avatar, role, plan, status, deals, revenue, conversion_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run('u1', 'Admin PulseCRM', 'admin@pulsecrm.com', hash('123456'), '', 'admin', 'professional', 'active', 12, 450000, 32);
    insertUser.run('u2', 'Marina Rocha', 'marina@pulsecrm.com', hash('123456'), '', 'seller', 'professional', 'active', 8, 280000, 28);
    insertUser.run('u3', 'Pedro Henrique', 'pedro@pulsecrm.com', hash('123456'), '', 'seller', 'professional', 'active', 15, 520000, 38);
    insertUser.run('u4', 'Camila Duarte', 'camila@pulsecrm.com', hash('123456'), '', 'manager', 'professional', 'active', 6, 180000, 25);
    insertUser.run('u5', 'Thiago Lima', 'thiago@pulsecrm.com', hash('123456'), '', 'seller', 'professional', 'inactive', 3, 95000, 15);

    // ── Organizations ──
    const insertOrg = db.prepare(`
      INSERT INTO organizations (id, name, industry, website, phone, employee_count, annual_revenue)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertOrg.run('org1', 'TechCorp Solutions', 'Tecnologia', 'https://techcorp.com', '(11)3000-0001', 250, 15000000);
    insertOrg.run('org2', 'InnovaTech', 'SaaS', 'https://innovatech.io', '(11)3000-0002', 80, 5000000);
    insertOrg.run('org3', 'GlobalMarket', 'E-commerce', 'https://globalmarket.com.br', '(21)3000-0003', 500, 30000000);
    insertOrg.run('org4', 'DataFlow Analytics', 'Analytics', 'https://dataflow.com', '(11)3000-0004', 45, 3000000);
    insertOrg.run('org5', 'Creative Lab', 'Design', 'https://creativelab.co', '(31)3000-0005', 20, 1200000);
    insertOrg.run('org6', 'MegaStore Brasil', 'Varejo', 'https://megastore.com.br', '(61)3000-0006', 1200, 80000000);
    insertOrg.run('org7', 'HealthPlus', 'Saude', 'https://healthplus.med', '(71)3000-0007', 150, 8000000);
    insertOrg.run('org8', 'FintechBR', 'Fintech', 'https://fintechbr.io', '(11)3000-0008', 60, 4000000);

    // ── Contacts ──
    const insertContact = db.prepare(`
      INSERT INTO contacts (id, name, email, phone, company, role, avatar, status, value, last_contact, tags, assigned_to, organization_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const av = (seed: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`;

    insertContact.run('c1', 'Ana Carolina Silva', 'ana.silva@techcorp.com', '(11) 99876-5432', 'TechCorp Solutions', 'Diretora de TI', av('Ana Silva'), 'active', 85000, '2025-01-28', '["Enterprise","TI","Decisor"]', 'u1', 'org1');
    insertContact.run('c2', 'Ricardo Mendes', 'ricardo@innovatech.io', '(21) 98765-4321', 'InnovaTech', 'CEO', av('Ricardo Mendes'), 'active', 120000, '2025-01-27', '["Startup","CEO","Premium"]', 'u3', 'org2');
    insertContact.run('c3', 'Juliana Costa', 'juliana.costa@globalmarket.com', '(31) 97654-3210', 'GlobalMarket', 'Gerente Comercial', av('Juliana Costa'), 'lead', 45000, '2025-01-25', '["Varejo","Gerente"]', 'u2', 'org3');
    insertContact.run('c4', 'Fernando Oliveira', 'fernando@dataflow.com.br', '(41) 96543-2109', 'DataFlow Analytics', 'CTO', av('Fernando Oliveira'), 'active', 200000, '2025-01-26', '["Enterprise","Tech","CTO"]', 'u1', 'org4');
    insertContact.run('c5', 'Mariana Santos', 'mariana@creativelab.design', '(51) 95432-1098', 'Creative Lab', 'Head de Design', av('Mariana Santos'), 'lead', 32000, '2025-01-24', '["Design","Startup"]', 'u2', 'org5');
    insertContact.run('c6', 'Carlos Eduardo Pinto', 'carlos@megastore.com.br', '(61) 94321-0987', 'MegaStore Brasil', 'Diretor Comercial', av('Carlos Pinto'), 'active', 150000, '2025-01-29', '["Varejo","Enterprise","Decisor"]', 'u3', 'org6');
    insertContact.run('c7', 'Patricia Almeida', 'patricia@healthplus.med', '(71) 93210-9876', 'HealthPlus', 'COO', av('Patricia Almeida'), 'inactive', 0, '2024-12-15', '["Saude","Perdido"]', 'u4', 'org7');
    insertContact.run('c8', 'Lucas Ferreira', 'lucas@fintechbr.io', '(11) 92109-8765', 'FintechBR', 'Product Manager', av('Lucas Ferreira'), 'lead', 65000, '2025-01-23', '["Fintech","PM"]', 'u1', 'org8');

    // ── Notes ──
    const insertNote = db.prepare(`
      INSERT INTO notes (id, contact_id, content, author, date) VALUES (?, ?, ?, ?, ?)
    `);
    insertNote.run('n1', 'c1', 'Interessada na solucao completa. Agendada demo para proxima semana.', 'Admin PulseCRM', '2025-01-28');
    insertNote.run('n2', 'c1', 'Enviado proposta comercial com desconto de 15% para fechamento em janeiro.', 'Admin PulseCRM', '2025-01-20');
    insertNote.run('n3', 'c2', 'Reuniao muito produtiva. Quer integrar com sistema atual deles.', 'Pedro Henrique', '2025-01-27');
    insertNote.run('n4', 'c3', 'Primeiro contato feito via LinkedIn. Demonstrou interesse.', 'Marina Rocha', '2025-01-25');
    insertNote.run('n5', 'c4', 'Negociacao em fase final. Aguardando aprovacao do board.', 'Admin PulseCRM', '2025-01-26');
    insertNote.run('n6', 'c4', 'Apresentacao tecnica realizada com sucesso. Time de dev aprovou.', 'Admin PulseCRM', '2025-01-18');
    insertNote.run('n7', 'c5', 'Indicacao do Ricardo (InnovaTech). Agendar call de apresentacao.', 'Marina Rocha', '2025-01-24');
    insertNote.run('n8', 'c6', 'Contrato assinado! Inicio da implementacao em fevereiro.', 'Pedro Henrique', '2025-01-29');
    insertNote.run('n9', 'c7', 'Projeto adiado para o proximo semestre por questoes orcamentarias.', 'Camila Duarte', '2024-12-15');
    insertNote.run('n10', 'c8', 'Veio pelo webinar. Precisa de solucao de automacao de vendas.', 'Admin PulseCRM', '2025-01-23');

    // ── Deals (stages remapped to Portuguese) ──
    const insertDeal = db.prepare(`
      INSERT INTO deals (id, title, contact_id, contact_name, company, value, stage, probability, expected_close, assigned_to, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertDeal.run('d1', 'Plataforma Enterprise TechCorp', 'c1', 'Ana Carolina Silva', 'TechCorp Solutions', 85000, 'proposta_enviada', 60, '2025-02-28', 'u1', '2025-01-10');
    insertDeal.run('d2', 'Integracao InnovaTech', 'c2', 'Ricardo Mendes', 'InnovaTech', 120000, 'negociacao', 80, '2025-02-15', 'u3', '2025-01-05');
    insertDeal.run('d3', 'CRM GlobalMarket', 'c3', 'Juliana Costa', 'GlobalMarket', 45000, 'lead', 20, '2025-03-30', 'u2', '2025-01-25');
    insertDeal.run('d4', 'Analytics Suite DataFlow', 'c4', 'Fernando Oliveira', 'DataFlow Analytics', 200000, 'negociacao', 90, '2025-02-10', 'u1', '2024-12-20');
    insertDeal.run('d5', 'Design Tools Creative Lab', 'c5', 'Mariana Santos', 'Creative Lab', 32000, 'lead', 15, '2025-04-15', 'u2', '2025-01-24');
    insertDeal.run('d6', 'MegaStore Full Package', 'c6', 'Carlos Eduardo Pinto', 'MegaStore Brasil', 150000, 'fechado_ganho', 100, '2025-01-29', 'u3', '2024-11-15');
    insertDeal.run('d7', 'Automacao FintechBR', 'c8', 'Lucas Ferreira', 'FintechBR', 65000, 'contato_feito', 35, '2025-03-20', 'u1', '2025-01-23');
    insertDeal.run('d8', 'Expansion Pack TechCorp', 'c1', 'Ana Carolina Silva', 'TechCorp Solutions', 42000, 'contato_feito', 40, '2025-03-15', 'u1', '2025-01-28');

    // ── Activities ──
    const insertActivity = db.prepare(`
      INSERT INTO activities (id, type, description, contact_name, contact_id, date, meta) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertActivity.run('a1', 'email', 'Proposta enviada para revisao', 'Ana Carolina Silva', 'c1', '2025-01-29 14:30', null);
    insertActivity.run('a2', 'call', 'Call de alinhamento sobre integracao', 'Ricardo Mendes', 'c2', '2025-01-29 11:00', null);
    insertActivity.run('a3', 'meeting', 'Assinatura de contrato', 'Carlos Eduardo Pinto', 'c6', '2025-01-29 09:00', null);
    insertActivity.run('a4', 'note', 'Atualizacao sobre aprovacao do board', 'Fernando Oliveira', 'c4', '2025-01-28 16:45', null);
    insertActivity.run('a5', 'whatsapp', 'Mensagem de follow-up enviada', 'Lucas Ferreira', 'c8', '2025-01-28 10:20', null);
    insertActivity.run('a6', 'call', 'Primeiro contato via LinkedIn', 'Juliana Costa', 'c3', '2025-01-27 15:00', null);
    insertActivity.run('a7', 'meeting', 'Demo da plataforma', 'Ana Carolina Silva', 'c1', '2025-01-27 10:00', null);
    insertActivity.run('a8', 'status_change', 'Status alterado para Negociacao', 'Ricardo Mendes', 'c2', '2025-01-26 14:00', 'Proposta → Negociacao');
    insertActivity.run('a9', 'task_done', 'Tarefa concluida: Enviar proposta', 'Fernando Oliveira', 'c4', '2025-01-26 11:00', null);
    insertActivity.run('a10', 'email', 'Apresentacao Creative Lab enviada', 'Mariana Santos', 'c5', '2025-01-25 14:00', null);

    // ── Tasks ──
    const insertTask = db.prepare(`
      INSERT INTO tasks (id, title, description, contact_id, contact_name, due_date, due_time, priority, status, type, assigned_to, automated, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTask.run('t1', 'Follow-up proposta TechCorp', 'Ligar para Ana Carolina sobre a proposta enviada', 'c1', 'Ana Carolina Silva', '2025-01-30', '10:00', 'high', 'pending', 'follow_up', 'u1', 0, '2025-01-28');
    insertTask.run('t2', 'Reuniao kickoff DataFlow', 'Agendar reuniao de kickoff com o time do Fernando', 'c4', 'Fernando Oliveira', '2025-02-03', '14:00', 'high', 'pending', 'meeting', 'u1', 0, '2025-01-28');
    insertTask.run('t3', 'Enviar case studies para GlobalMarket', 'Preparar e enviar cases de varejo', 'c3', 'Juliana Costa', '2025-01-31', '09:00', 'medium', 'in_progress', 'email', 'u2', 0, '2025-01-26');
    insertTask.run('t4', 'Call com Creative Lab', 'Primeira apresentacao da plataforma', 'c5', 'Mariana Santos', '2025-02-01', '15:00', 'medium', 'pending', 'call', 'u2', 0, '2025-01-25');
    insertTask.run('t5', 'Preparar demo customizada InnovaTech', 'Criar ambiente demo com integracoes relevantes', 'c2', 'Ricardo Mendes', '2025-02-02', null, 'high', 'in_progress', 'other', 'u3', 0, '2025-01-27');
    insertTask.run('t6', 'Follow-up FintechBR', 'Gerado automaticamente: lead sem resposta ha 5 dias', 'c8', 'Lucas Ferreira', '2025-01-30', null, 'medium', 'pending', 'follow_up', 'u1', 1, '2025-01-28');
    insertTask.run('t7', 'Atualizar CRM MegaStore', 'Marcar deal como implementacao iniciada', 'c6', 'Carlos Eduardo Pinto', '2025-02-01', null, 'low', 'completed', 'other', 'u3', 0, '2025-01-29');
    insertTask.run('t8', 'Enviar NDA para Patricia', 'Gerado automaticamente: reativar contato inativo', 'c7', 'Patricia Almeida', '2025-02-05', null, 'low', 'pending', 'email', 'u4', 1, '2025-01-29');

    // ── Emails ──
    const insertEmail = db.prepare(`
      INSERT INTO emails (id, contact_id, contact_name, contact_email, subject, preview, body, date, read, direction, starred)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEmail.run('e1', 'c1', 'Ana Carolina Silva', 'ana.silva@techcorp.com', 'Re: Proposta Comercial PulseCRM', 'Ola! Analisei a proposta e tenho algumas consideracoes...', 'Ola!\n\nAnalisei a proposta e tenho algumas consideracoes sobre os modulos incluidos. Podemos agendar uma call para discutir os pontos?\n\nAbraco,\nAna Carolina', '2025-01-29 14:30', 0, 'received', 1);
    insertEmail.run('e2', 'c1', 'Ana Carolina Silva', 'ana.silva@techcorp.com', 'Proposta Comercial PulseCRM - TechCorp', 'Segue em anexo a proposta comercial atualizada...', 'Ola Ana,\n\nSegue em anexo a proposta comercial atualizada com os termos que discutimos na reuniao.\n\nFicamos a disposicao.\n\nAtt,\nEquipe PulseCRM', '2025-01-28 10:00', 1, 'sent', 0);
    insertEmail.run('e3', 'c4', 'Fernando Oliveira', 'fernando@dataflow.com.br', 'Aprovacao do Board - DataFlow', 'Boa noticia! O board aprovou o orcamento...', 'Ola equipe,\n\nBoa noticia! O board aprovou o orcamento para a implementacao. Vamos agendar o kickoff?\n\nAbs,\nFernando', '2025-01-28 16:45', 0, 'received', 1);
    insertEmail.run('e4', 'c2', 'Ricardo Mendes', 'ricardo@innovatech.io', 'Documentacao tecnica da API', 'Ricardo, conforme combinado segue a doc tecnica...', 'Ricardo,\n\nConforme combinado na call, segue a documentacao tecnica da nossa API para integracao.\n\nQualquer duvida estamos a disposicao.\n\nAtt,\nPedro Henrique', '2025-01-27 15:30', 1, 'sent', 0);
    insertEmail.run('e5', 'c5', 'Mariana Santos', 'mariana@creativelab.design', 'Apresentacao PulseCRM', 'Ola Mariana! O Ricardo Mendes nos indicou...', 'Ola Mariana!\n\nO Ricardo Mendes da InnovaTech nos indicou. Temos uma plataforma que pode ajudar muito o Creative Lab.\n\nPodemos agendar uma apresentacao?\n\nAtt,\nMarina Rocha', '2025-01-25 14:00', 1, 'sent', 0);
    insertEmail.run('e6', 'c8', 'Lucas Ferreira', 'lucas@fintechbr.io', 'Re: Webinar - Automacao de Vendas', 'Muito interessante o webinar! Gostaria de saber mais...', 'Ola!\n\nMuito interessante o webinar! Gostaria de saber mais sobre a automacao de vendas, especificamente para fintech.\n\nPodemos conversar?\n\nLucas', '2025-01-23 16:00', 1, 'received', 0);
    insertEmail.run('e7', 'c3', 'Juliana Costa', 'juliana.costa@globalmarket.com', 'Interesse em CRM para Varejo', 'Ola, vi o perfil de voces no LinkedIn...', 'Ola,\n\nVi o perfil de voces no LinkedIn e me interessei pela solucao. Trabalho na GlobalMarket e estamos buscando um CRM.\n\nPodemos conversar?\n\nJuliana', '2025-01-25 09:30', 1, 'received', 0);

    // ── Automation Rules (with structured trigger/condition/action) ──
    const insertRule = db.prepare(`
      INSERT INTO automation_rules (id, name, description, trigger_event, condition, action, trigger_type, trigger_config, condition_type, condition_config, action_type, action_config, enabled, executions, last_triggered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRule.run('ar1', 'Novo Lead → Criar Tarefa', 'Quando um novo lead e cadastrado, cria automaticamente uma tarefa de follow-up', 'Novo lead cadastrado', 'Status = Lead', 'Criar tarefa follow-up', 'lead_created', '{}', 'always', '{}', 'create_task', '{"title":"Follow-up com novo lead","dueDays":2,"priority":"high","type":"follow_up"}', 1, 47, '2025-01-28 14:30');
    insertRule.run('ar2', 'Lead Inativo → Alerta', 'Quando um lead fica sem interacao por mais de 5 dias, cria tarefa automatica', 'Lead sem interacao > 5 dias', 'Status != Fechado', 'Criar tarefa reativar', 'inactivity_days', '{"days":5,"entity":"contact"}', 'always', '{}', 'create_task', '{"title":"Reativar contato inativo","dueDays":1,"priority":"medium","type":"follow_up"}', 1, 23, '2025-01-27 08:00');
    insertRule.run('ar3', 'Proposta Enviada → Follow-up', 'Quando um deal muda para Proposta Enviada, cria tarefa de follow-up em 3 dias', 'Deal mudou de estagio', 'Estagio = Proposta', 'Criar tarefa follow-up', 'deal_stage_changed', '{"toStage":"proposta_enviada"}', 'always', '{}', 'create_task', '{"title":"Follow-up proposta enviada","dueDays":3,"priority":"high","type":"follow_up"}', 1, 15, '2025-01-26 11:00');
    insertRule.run('ar4', 'Deal Fechado → Onboarding', 'Quando um deal e marcado como Fechado Ganho, cria tarefa de onboarding', 'Deal fechado ganho', 'Valor > 50000', 'Criar tarefa onboarding', 'deal_stage_changed', '{"toStage":"fechado_ganho"}', 'value_greater_than', '{"entity":"deal","field":"value","value":50000}', 'create_task', '{"title":"Onboarding do cliente","dueDays":5,"priority":"high","type":"meeting"}', 1, 8, '2025-01-29 09:00');
    insertRule.run('ar5', 'Tarefa Concluida → Atividade', 'Quando uma tarefa e concluida, registra atividade automaticamente', 'Tarefa concluida', 'Sempre', 'Criar atividade', 'task_completed', '{}', 'always', '{}', 'create_activity', '{"type":"task_done","description":"Tarefa concluida automaticamente"}', 1, 12, '2025-01-27 16:00');
    insertRule.run('ar6', 'Lead Convertido → Atividade', 'Quando um lead e convertido, registra atividade de conversao', 'Lead convertido', 'Sempre', 'Criar atividade', 'lead_converted', '{}', 'always', '{}', 'create_activity', '{"type":"lead_converted","description":"Lead convertido em contato e deal"}', 0, 3, '2025-01-01 08:00');

    // ── Leads (with job_title and company_size) ──
    const insertLead = db.prepare(`
      INSERT INTO leads (id, name, email, phone, company, source, score, notes, status, assigned_to, organization_id, job_title, company_size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertLead.run('l1', 'Roberto Nascimento', 'roberto@startup.io', '(11)98765-0010', 'StartupXYZ', 'website', 'hot', 'Veio pelo site, pediu demo', 'new', 'u1', null, 'CEO', '11-50');
    insertLead.run('l2', 'Daniela Souza', 'daniela@corp.com', '(21)98765-0020', 'CorpBrasil', 'facebook', 'warm', 'Campanha Facebook Ads', 'contacted', 'u2', null, 'Gerente Comercial', '201-1000');
    insertLead.run('l3', 'Marcos Tavares', 'marcos@tech.net', '(31)98765-0030', 'TechNet Solutions', 'referral', 'cold', 'Indicacao do Ricardo Mendes', 'new', 'u3', null, 'Desenvolvedor', '11-50');
    insertLead.run('l4', 'Isabela Martins', 'isabela@digital.co', '(41)98765-0040', 'Digital Co', 'manual', 'warm', 'Conheceu no evento de tecnologia', 'qualified', 'u1', null, 'Diretora de Marketing', '51-200');
    insertLead.run('l5', 'Gustavo Pereira', 'gustavo@indie.dev', '', 'IndieDev', 'website', 'hot', 'Baixou whitepaper de automacao', 'new', 'u2', null, 'CTO', '1-10');

    // ── Scheduled Activities ──
    const insertSched = db.prepare(`
      INSERT INTO scheduled_activities (id, type, title, description, deal_id, contact_id, assigned_to, due_date, due_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertSched.run('sa1', 'call', 'Ligar para alinhar proposta', 'Discutir termos da proposta comercial', 'd1', 'c1', 'u1', '2025-02-03', '10:00');
    insertSched.run('sa2', 'meeting', 'Reuniao de fechamento', 'Reuniao final para assinatura do contrato', 'd2', 'c2', 'u3', '2025-02-05', '14:00');
    insertSched.run('sa3', 'email', 'Enviar material complementar', 'Cases de sucesso do setor de varejo', 'd3', 'c3', 'u2', '2025-02-10', null);
    insertSched.run('sa4', 'demo', 'Demo do produto', 'Apresentacao tecnica para time de desenvolvimento', 'd4', 'c4', 'u1', '2025-01-30', '15:00');
    insertSched.run('sa5', 'follow_up', 'Follow-up pos-proposta', 'Verificar interesse apos envio da proposta', 'd5', 'c5', 'u2', '2025-02-15', '09:00');

    // Update next_activity_date on deals
    db.prepare(`
      UPDATE deals SET next_activity_date = (
        SELECT MIN(due_date) FROM scheduled_activities
        WHERE scheduled_activities.deal_id = deals.id AND completed = 0
      )
    `).run();

    // ── Channel Configs (simulation mode by default) ──
    const insertChannelConfig = db.prepare(`
      INSERT INTO channel_configs (id, channel, config, enabled, simulation_mode)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertChannelConfig.run('cc1', 'smtp', '{"host":"","port":587,"secure":false,"user":"","pass":"","fromName":"PulseCRM","fromEmail":"noreply@pulsecrm.com"}', 0, 1);
    insertChannelConfig.run('cc2', 'whatsapp', '{"phoneNumberId":"","accessToken":"","verifyToken":"pulse_verify_123","businessId":""}', 0, 1);
    insertChannelConfig.run('cc3', 'instagram', '{"igBusinessAccountId":"","pageAccessToken":"","pageId":"","appSecret":""}', 0, 1);

    // ── Cadences ──
    const insertCadence = db.prepare(`
      INSERT INTO cadences (id, name, description, status, created_by, total_enrolled, total_completed, total_replied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCadence.run('cad1', 'Outbound SaaS - Cold Email + WhatsApp', 'Sequencia de 5 toques para leads SaaS frios. Email inicial, follow-up, WhatsApp, ligacao e break-up.', 'active', 'u1', 2, 0, 0);
    insertCadence.run('cad2', 'Re-engajamento Inativo', 'Reativar contatos sem interacao ha 30 dias com abordagem mais direta.', 'draft', 'u1', 0, 0, 0);

    // ── Cadence Steps ──
    const insertStep = db.prepare(`
      INSERT INTO cadence_steps (id, cadence_id, step_order, delay_days, delay_hours, channel, template_subject, template_body)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Cadence 1: 5 steps
    insertStep.run('cs1', 'cad1', 1, 0, 0, 'email',
      'Ola {nome}, posso ajudar a {empresa}?',
      'Ola {nome},\n\nVi que voce atua como {cargo} na {empresa}. Estamos ajudando empresas do seu setor a automatizar o processo de vendas e gerar mais reunioes qualificadas.\n\nTeria 15 minutos essa semana para uma conversa rapida?\n\nAbracos');
    insertStep.run('cs2', 'cad1', 2, 2, 0, 'email',
      'Re: {empresa} + PulseCRM',
      'Ola {nome},\n\nSo passando para garantir que voce viu meu email anterior. Sei que a rotina e corrida.\n\nEm resumo: ajudamos empresas como a {empresa} a gerar 3x mais reunioes com automacao inteligente.\n\nVale uma conversa?');
    insertStep.run('cs3', 'cad1', 3, 3, 0, 'whatsapp',
      '',
      'Ola {nome}! Sou da PulseCRM. Enviei um email sobre uma solucao de automacao para a {empresa}. Posso te contar mais em 2 minutos? 🚀');
    insertStep.run('cs4', 'cad1', 4, 5, 0, 'call',
      '',
      'Ligar para {nome} ({empresa}) - 3a tentativa de contato. Mencionar automacao de vendas e cases do setor.');
    insertStep.run('cs5', 'cad1', 5, 7, 0, 'email',
      'Ultimo follow-up - {empresa}',
      '{nome}, este e meu ultimo contato.\n\nSe automatizar vendas nao faz sentido para a {empresa} agora, sem problema. Mas se quiser conversar no futuro, e so responder este email.\n\nSucesso!');

    // Cadence 2: 3 steps (draft)
    insertStep.run('cs6', 'cad2', 1, 0, 0, 'email',
      'Faz tempo que nao conversamos, {nome}',
      'Ola {nome},\n\nFaz um tempo que conversamos sobre a {empresa}. Desde entao, lancamos novas funcionalidades que podem ser relevantes para voce.\n\nTeria interesse em retomar a conversa?');
    insertStep.run('cs7', 'cad2', 2, 3, 0, 'whatsapp',
      '',
      '{nome}, tudo bem? Enviei um email recentemente sobre novidades da PulseCRM. Viu?');
    insertStep.run('cs8', 'cad2', 3, 5, 0, 'email',
      'Novidades PulseCRM para {empresa}',
      '{nome}, quero compartilhar algo rapido:\n\nNossos clientes estao gerando em media 40% mais reunioes com a nova automacao de cadencias.\n\nSe quiser ver como funciona, e so responder.');

    // ── Cadence Enrollments ──
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextDue1 = new Date(Date.now() + 30000).toISOString().replace('T', ' ').slice(0, 19); // 30s from now (for quick demo)
    const nextDue2 = new Date(Date.now() + 172800000).toISOString().replace('T', ' ').slice(0, 19); // 2 days
    const insertEnrollment = db.prepare(`
      INSERT INTO cadence_enrollments (id, cadence_id, lead_id, contact_id, enrolled_by, current_step, status, started_at, next_step_due)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertEnrollment.run('ce1', 'cad1', 'l1', null, 'u1', 1, 'active', now, nextDue1);
    insertEnrollment.run('ce2', 'cad1', 'l5', null, 'u1', 1, 'active', now, nextDue2);

    // ── Compliance Config ──
    db.prepare(`
      INSERT INTO compliance_config (id, max_emails_per_hour_per_domain, max_emails_per_day, soft_bounce_retry_count, enabled)
      VALUES ('config', 30, 200, 1, 1)
    `).run();

    // ── Lead Scores (initial scores based on source + ICP) ──
    const insertScore = db.prepare(`
      INSERT INTO lead_scores (id, lead_id, numeric_score, score_breakdown, derived_label, last_interaction_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    // l1: Roberto - CEO (10) + website (10) + company 11-50 (3) = 23 → cold
    insertScore.run('ls1', 'l1', 23, '{"opens":0,"clicks":0,"replies":0,"responseSpeed":0,"source":10,"icp":10,"companySize":3,"decay":0,"total":23}', 'cold', null);
    // l2: Daniela - Gerente (3) + facebook (5) + company 201-1000 (8) = 16 → cold
    insertScore.run('ls2', 'l2', 16, '{"opens":0,"clicks":0,"replies":0,"responseSpeed":0,"source":5,"icp":3,"companySize":8,"decay":0,"total":16}', 'cold', null);
    // l3: Marcos - Dev (0) + referral (15) + company 11-50 (3) = 18 → cold
    insertScore.run('ls3', 'l3', 18, '{"opens":0,"clicks":0,"replies":0,"responseSpeed":0,"source":15,"icp":0,"companySize":3,"decay":0,"total":18}', 'cold', null);
    // l4: Isabela - Diretora (7) + manual (5) + company 51-200 (5) = 17 → cold
    insertScore.run('ls4', 'l4', 17, '{"opens":0,"clicks":0,"replies":0,"responseSpeed":0,"source":5,"icp":7,"companySize":5,"decay":0,"total":17}', 'cold', null);
    // l5: Gustavo - CTO (10) + website (10) + company 1-10 (0) = 20 → cold
    insertScore.run('ls5', 'l5', 20, '{"opens":0,"clicks":0,"replies":0,"responseSpeed":0,"source":10,"icp":10,"companySize":0,"decay":0,"total":20}', 'cold', null);
  });

  seedAll();
  console.log('✅ Database seeded with users, organizations, contacts, deals, leads, tasks, activities, emails, scheduled activities, automation rules, cadences, and channel configs');
}

export default db;
