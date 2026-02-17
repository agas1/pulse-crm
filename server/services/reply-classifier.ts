import db from '../db.js';
import crypto from 'crypto';
import { recordScoreEvent } from './lead-scoring.js';

type Classification = 'interested' | 'not_interested' | 'meeting_request' | 'proposal_request' | 'out_of_office' | 'unsubscribe' | 'other';

interface ClassificationResult {
  classification: Classification;
  confidence: number;
  reasoning: string;
}

interface ClassificationContext {
  leadName?: string;
  company?: string;
  stepChannel?: string;
}

export async function classifyReply(
  replyText: string,
  context: ClassificationContext
): Promise<ClassificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return ruleBasedClassification(replyText);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Voce e um especialista em vendas B2B outbound. Classifique esta resposta de um prospect.

Resposta:
"${replyText.slice(0, 500)}"

Contexto:
- Nome: ${context.leadName || 'Desconhecido'}
- Empresa: ${context.company || 'Desconhecida'}
- Canal: ${context.stepChannel || 'email'}

CATEGORIAS (escolha UMA):
1. interested - Quer saber mais, faz perguntas
2. not_interested - Rejeicao explicita
3. meeting_request - Quer agendar reuniao/call/demo
4. proposal_request - Pede orcamento/proposta/pricing
5. out_of_office - Resposta automatica de ausencia
6. unsubscribe - Quer parar de receber mensagens
7. other - Nao se encaixa

Responda APENAS em JSON:
{"classification":"categoria","confidence":0.95,"reasoning":"explicacao curta"}`
        }],
      }),
    });

    if (!response.ok) {
      console.error('[Reply Classifier] API error:', response.status);
      return ruleBasedClassification(replyText);
    }

    const data = await response.json() as any;
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return ruleBasedClassification(replyText);

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      classification: parsed.classification as Classification,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      reasoning: parsed.reasoning || '',
    };
  } catch (err) {
    console.error('[Reply Classifier] Error:', err);
    return ruleBasedClassification(replyText);
  }
}

function ruleBasedClassification(text: string): ClassificationResult {
  const lower = text.toLowerCase();

  if (/\b(out of office|ausente|ferias|vacation|automatic reply|resposta autom)/i.test(lower))
    return { classification: 'out_of_office', confidence: 0.9, reasoning: 'Auto-reply keywords detected' };
  if (/\b(unsubscribe|descadastrar|remov|parar de receber|nao quero mais|cancelar inscri)/i.test(lower))
    return { classification: 'unsubscribe', confidence: 0.85, reasoning: 'Unsubscribe keywords detected' };
  if (/\b(nao tenho interesse|sem interesse|nao preciso|nao e para|nao faz sentido|nao obrigad)/i.test(lower))
    return { classification: 'not_interested', confidence: 0.8, reasoning: 'Rejection keywords detected' };
  if (/\b(agendar|marcar|reuniao|call|demo|conversar|podemos falar|bate.?papo|horario)/i.test(lower))
    return { classification: 'meeting_request', confidence: 0.75, reasoning: 'Meeting request keywords detected' };
  if (/\b(proposta|orcamento|preco|quanto custa|pricing|valores|investimento|planos)/i.test(lower))
    return { classification: 'proposal_request', confidence: 0.75, reasoning: 'Proposal request keywords detected' };
  if (/\b(interesse|interessad|legal|bacana|conte mais|saber mais|como funciona|me fale)/i.test(lower))
    return { classification: 'interested', confidence: 0.7, reasoning: 'Interest keywords detected' };

  return { classification: 'other', confidence: 0.5, reasoning: 'No clear intent detected' };
}

export async function executeClassificationActions(
  classification: Classification,
  result: ClassificationResult,
  enrollmentId: string,
  stepExecutionId: string | null,
  leadId: string | null,
  contactId: string | null,
  replyText: string,
  userId: string
): Promise<string[]> {
  const actions: string[] = [];
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Store classification record
  db.prepare(`
    INSERT INTO reply_classifications (id, enrollment_id, step_execution_id, lead_id, contact_id, reply_text, classification, confidence, ai_reasoning, actions_taken)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]')
  `).run(crypto.randomUUID(), enrollmentId, stepExecutionId, leadId, contactId, replyText.slice(0, 2000), classification, result.confidence, result.reasoning);

  let name = 'Prospect';
  let company = '';
  if (leadId) {
    const lead = db.prepare('SELECT name, company FROM leads WHERE id = ?').get(leadId) as any;
    if (lead) { name = lead.name; company = lead.company; }
  } else if (contactId) {
    const contact = db.prepare('SELECT name, company FROM contacts WHERE id = ?').get(contactId) as any;
    if (contact) { name = contact.name; company = contact.company; }
  }

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const in2days = new Date(Date.now() + 172800000).toISOString().split('T')[0];
  const in7days = new Date(Date.now() + 604800000).toISOString().split('T')[0];

  switch (classification) {
    case 'interested':
      db.prepare(`INSERT INTO tasks (id, title, description, due_date, priority, status, type, assigned_to, automated) VALUES (?, ?, ?, ?, 'high', 'pending', 'follow_up', ?, 1)`)
        .run(crypto.randomUUID(), `Follow-up: ${name} demonstrou interesse`, `${name} (${company}) respondeu com interesse. Reply: "${replyText.slice(0, 200)}"`, tomorrow, userId);
      actions.push('task_created:follow_up');
      if (leadId) {
        db.prepare("UPDATE leads SET status = 'contacted', updated_at = datetime('now') WHERE id = ? AND status = 'new'").run(leadId);
        actions.push('lead_status:contacted');
        recordScoreEvent(leadId, 'reply_interested', 15, { classification });
      }
      break;

    case 'not_interested':
      if (leadId) {
        db.prepare("UPDATE leads SET status = 'disqualified', updated_at = datetime('now') WHERE id = ?").run(leadId);
        actions.push('lead_status:disqualified');
      }
      db.prepare(`INSERT INTO activities (id, type, description, contact_name, contact_id, date) VALUES (?, 'note', ?, ?, ?, ?)`)
        .run(crypto.randomUUID(), `Resposta negativa: ${name} nao tem interesse`, name, contactId, now);
      actions.push('activity_logged');
      break;

    case 'meeting_request':
      db.prepare(`INSERT INTO tasks (id, title, description, due_date, priority, status, type, assigned_to, automated) VALUES (?, ?, ?, ?, 'high', 'pending', 'meeting', ?, 1)`)
        .run(crypto.randomUUID(), `REUNIAO: ${name} quer agendar`, `${name} (${company}) pediu reuniao. Reply: "${replyText.slice(0, 200)}"`, today, userId);
      actions.push('task_created:meeting');
      if (contactId) {
        db.prepare("UPDATE deals SET stage = 'contato_feito', updated_at = datetime('now') WHERE contact_id = ? AND stage = 'lead'").run(contactId);
        actions.push('deal_stage:contato_feito');
      }
      if (leadId) recordScoreEvent(leadId, 'reply_meeting_request', 30, { classification });
      break;

    case 'proposal_request':
      db.prepare(`INSERT INTO tasks (id, title, description, due_date, priority, status, type, assigned_to, automated) VALUES (?, ?, ?, ?, 'high', 'pending', 'other', ?, 1)`)
        .run(crypto.randomUUID(), `PROPOSTA: ${name} pediu orcamento`, `${name} (${company}) pediu proposta. Reply: "${replyText.slice(0, 200)}"`, in2days, userId);
      actions.push('task_created:proposal');
      if (contactId) {
        db.prepare("UPDATE deals SET stage = 'proposta_enviada', updated_at = datetime('now') WHERE contact_id = ? AND stage IN ('lead','contato_feito')").run(contactId);
        actions.push('deal_stage:proposta_enviada');
      }
      if (leadId) recordScoreEvent(leadId, 'reply_proposal_request', 25, { classification });
      break;

    case 'out_of_office':
      db.prepare(`INSERT INTO tasks (id, title, description, due_date, priority, status, type, assigned_to, automated) VALUES (?, ?, ?, ?, 'medium', 'pending', 'follow_up', ?, 1)`)
        .run(crypto.randomUUID(), `Retry: ${name} esta ausente`, `${name} (${company}) fora do escritorio. Tentar em 7 dias.`, in7days, userId);
      actions.push('task_created:retry_7days');
      break;

    case 'unsubscribe': {
      const leadData = leadId ? db.prepare('SELECT email, phone FROM leads WHERE id = ?').get(leadId) as any : null;
      const contactData = contactId ? db.prepare('SELECT email, phone FROM contacts WHERE id = ?').get(contactId) as any : null;
      const email = leadData?.email || contactData?.email || '';
      const phone = leadData?.phone || contactData?.phone || '';
      if (email || phone) {
        try {
          db.prepare(`INSERT INTO unsubscribe_list (id, email, phone, reason, source, enrollment_id) VALUES (?, ?, ?, 'Solicitou descadastro via resposta', 'reply_classification', ?)`)
            .run(crypto.randomUUID(), email, phone, enrollmentId);
          actions.push('unsubscribe_list:added');
        } catch { /* unique constraint */ }
      }
      db.prepare("UPDATE cadence_enrollments SET status = 'unsubscribed' WHERE id = ?").run(enrollmentId);
      actions.push('enrollment:unsubscribed');
      break;
    }

    case 'other':
      db.prepare(`INSERT INTO tasks (id, title, description, due_date, priority, status, type, assigned_to, automated) VALUES (?, ?, ?, ?, 'medium', 'pending', 'other', ?, 1)`)
        .run(crypto.randomUUID(), `Revisar resposta: ${name}`, `${name} (${company}) respondeu. IA nao classificou com certeza. Reply: "${replyText.slice(0, 200)}"`, tomorrow, userId);
      actions.push('task_created:review');
      break;
  }

  console.log(`[Reply Classifier] ${classification} (${result.confidence}) → actions: ${actions.join(', ')}`);
  return actions;
}
