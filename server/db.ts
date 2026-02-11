import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'pulse-crm.db');

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
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT CHECK(type IN ('email','call','meeting','note','whatsapp','status_change','task_done')) NOT NULL,
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
  CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    trigger_event TEXT NOT NULL,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    executions INTEGER DEFAULT 0,
    last_triggered TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ──────────────────────────────────────
// INDEXES
// ──────────────────────────────────────

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_contacts_assigned ON contacts(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
  CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
  CREATE INDEX IF NOT EXISTS idx_deals_assigned ON deals(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
  CREATE INDEX IF NOT EXISTS idx_activities_contact ON activities(contact_id);
  CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_emails_contact ON emails(contact_id);
  CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
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

    // ── Contacts ──
    const insertContact = db.prepare(`
      INSERT INTO contacts (id, name, email, phone, company, role, avatar, status, value, last_contact, tags, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const av = (seed: string) => `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=3b82f6,2563eb,1d4ed8,6366f1,8b5cf6&fontFamily=Inter&fontSize=40`;

    insertContact.run('c1', 'Ana Carolina Silva', 'ana.silva@techcorp.com', '(11) 99876-5432', 'TechCorp Solutions', 'Diretora de TI', av('Ana Silva'), 'active', 85000, '2025-01-28', '["Enterprise","TI","Decisor"]', 'u1');
    insertContact.run('c2', 'Ricardo Mendes', 'ricardo@innovatech.io', '(21) 98765-4321', 'InnovaTech', 'CEO', av('Ricardo Mendes'), 'active', 120000, '2025-01-27', '["Startup","CEO","Premium"]', 'u3');
    insertContact.run('c3', 'Juliana Costa', 'juliana.costa@globalmarket.com', '(31) 97654-3210', 'GlobalMarket', 'Gerente Comercial', av('Juliana Costa'), 'lead', 45000, '2025-01-25', '["Varejo","Gerente"]', 'u2');
    insertContact.run('c4', 'Fernando Oliveira', 'fernando@dataflow.com.br', '(41) 96543-2109', 'DataFlow Analytics', 'CTO', av('Fernando Oliveira'), 'active', 200000, '2025-01-26', '["Enterprise","Tech","CTO"]', 'u1');
    insertContact.run('c5', 'Mariana Santos', 'mariana@creativelab.design', '(51) 95432-1098', 'Creative Lab', 'Head de Design', av('Mariana Santos'), 'lead', 32000, '2025-01-24', '["Design","Startup"]', 'u2');
    insertContact.run('c6', 'Carlos Eduardo Pinto', 'carlos@megastore.com.br', '(61) 94321-0987', 'MegaStore Brasil', 'Diretor Comercial', av('Carlos Pinto'), 'active', 150000, '2025-01-29', '["Varejo","Enterprise","Decisor"]', 'u3');
    insertContact.run('c7', 'Patricia Almeida', 'patricia@healthplus.med', '(71) 93210-9876', 'HealthPlus', 'COO', av('Patricia Almeida'), 'inactive', 0, '2024-12-15', '["Saude","Perdido"]', 'u4');
    insertContact.run('c8', 'Lucas Ferreira', 'lucas@fintechbr.io', '(11) 92109-8765', 'FintechBR', 'Product Manager', av('Lucas Ferreira'), 'lead', 65000, '2025-01-23', '["Fintech","PM"]', 'u1');

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

    // ── Automation Rules ──
    const insertRule = db.prepare(`
      INSERT INTO automation_rules (id, name, description, trigger_event, condition, action, enabled, executions, last_triggered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertRule.run('ar1', 'Novo Lead → Criar Tarefa', 'Quando um novo lead e cadastrado, cria automaticamente uma tarefa de follow-up para o vendedor responsavel', 'Novo lead cadastrado', 'Status = Lead', 'Criar tarefa "Follow-up inicial" (prazo: 2 dias)', 1, 47, '2025-01-28 14:30');
    insertRule.run('ar2', 'Lead Inativo → Alerta', 'Quando um lead fica sem interacao por mais de 5 dias, gera um alerta visual e cria tarefa automatica', 'Lead sem interacao > 5 dias', 'Status ≠ Fechado', 'Alerta visual + Criar tarefa "Reativar contato"', 1, 23, '2025-01-27 08:00');
    insertRule.run('ar3', 'Mudanca de Estagio → E-mail', 'Quando um deal muda para Proposta, envia automaticamente um e-mail template com a proposta comercial', 'Deal mudou de estagio', 'Novo estagio = Proposta', 'Enviar e-mail template "Proposta Comercial"', 1, 15, '2025-01-26 11:00');
    insertRule.run('ar4', 'Deal Fechado → Onboarding', 'Quando um deal e marcado como Fechado, cria automaticamente tarefas de onboarding para o cliente', 'Deal estagio = Fechado', 'Valor > R$ 50.000', 'Criar 3 tarefas de onboarding + Notificar gestor', 1, 8, '2025-01-29 09:00');
    insertRule.run('ar5', 'Follow-up Pos Demo', 'Apos uma reuniao de demo, cria tarefa de follow-up para 3 dias depois', 'Tarefa tipo "Demo" concluida', 'Deal em Qualificado ou Proposta', 'Criar tarefa "Follow-up pos demo" (prazo: 3 dias)', 1, 12, '2025-01-27 16:00');
    insertRule.run('ar6', 'Reativacao de Inativos', 'A cada 30 dias, verifica contatos inativos e cria tarefa para tentar reativacao', 'Ciclo mensal (dia 1)', 'Status = Inativo, ultima interacao > 30 dias', 'Criar tarefa "Tentativa de reativacao"', 0, 3, '2025-01-01 08:00');
  });

  seedAll();
  console.log('✅ Database seeded with users, contacts, deals, tasks, activities, emails, and automation rules');
}

export default db;
