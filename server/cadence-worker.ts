import cron from 'node-cron';
import crypto from 'crypto';
import db from './db.js';
import { isUnsubscribed, checkRateLimit, recordSend } from './services/compliance.js';
import { recordScoreEvent } from './services/lead-scoring.js';

// Template variable replacement
function replaceTemplateVars(template: string, data: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => data[key] || `{${key}}`);
}

// Build template data from lead or contact
function buildTemplateData(row: any): Record<string, string> {
  return {
    nome: row.lead_name || row.contact_name || 'N/A',
    empresa: row.lead_company || row.contact_company || '',
    cargo: row.contact_role || '',
    email: row.lead_email || row.contact_email || '',
    phone: row.lead_phone || row.contact_phone || '',
  };
}

// Get channel config
function getChannelConfig(channel: string): { config: any; simulationMode: boolean } | null {
  const channelMap: Record<string, string> = { email: 'smtp', whatsapp: 'whatsapp' };
  const dbChannel = channelMap[channel] || channel;
  const row = db.prepare('SELECT * FROM channel_configs WHERE channel = ?').get(dbChannel) as any;
  if (!row) return null;
  return { config: JSON.parse(row.config || '{}'), simulationMode: Boolean(row.simulation_mode) };
}

// Simulate email send (for simulation mode and when no real client is configured)
function simulateEmailSend(to: string, subject: string, body: string, contactId: string | null, contactName: string): { status: string; externalId: string; error: string } {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const emailId = crypto.randomUUID();

  // Insert into emails table so it shows up in the Emails page
  db.prepare(`
    INSERT INTO emails (id, contact_id, contact_name, contact_email, subject, preview, body, date, read, direction, starred)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'sent', 0)
  `).run(emailId, contactId, contactName, to, subject, body.slice(0, 100), body, now);

  console.log(`[Cadence Worker] SIM email → ${to}: "${subject}"`);
  return { status: 'delivered', externalId: `sim_${emailId}`, error: '' };
}

// Simulate WhatsApp send
function simulateWhatsAppSend(to: string, message: string): { status: string; externalId: string; error: string } {
  console.log(`[Cadence Worker] SIM whatsapp → ${to}: "${message.slice(0, 50)}..."`);
  return { status: 'delivered', externalId: `sim_wa_${crypto.randomUUID()}`, error: '' };
}

// Create task for manual steps (call, task, linkedin_manual)
function createTaskForStep(enrollment: any, step: any, templateData: Record<string, string>): { status: string; externalId: string; error: string } {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const dueDate = new Date().toISOString().split('T')[0];
  const taskId = crypto.randomUUID();

  const channelLabels: Record<string, string> = {
    call: 'Ligar para',
    task: 'Tarefa:',
    linkedin_manual: 'LinkedIn: enviar mensagem para',
  };

  const title = `${channelLabels[step.channel] || 'Contatar'} ${templateData.nome}`;
  const description = step.template_body
    ? replaceTemplateVars(step.template_body, templateData)
    : `Cadencia passo ${step.step_order} - ${step.channel}`;

  db.prepare(`
    INSERT INTO tasks (id, title, description, contact_id, contact_name, due_date, priority, status, type, assigned_to, automated, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'high', 'pending', ?, ?, 1, ?, ?)
  `).run(
    taskId, title, description,
    enrollment.contact_id || null,
    templateData.nome,
    dueDate,
    step.channel === 'call' ? 'call' : step.channel === 'linkedin_manual' ? 'other' : 'follow_up',
    enrollment.enrolled_by,
    now, now
  );

  return { status: 'sent', externalId: taskId, error: '' };
}

// Execute a single step
function executeStep(enrollment: any, step: any, templateData: Record<string, string>): { status: string; externalId: string; error: string } {
  switch (step.channel) {
    case 'email': {
      const subject = replaceTemplateVars(step.template_subject, templateData);
      const body = replaceTemplateVars(step.template_body, templateData);
      const email = templateData.email;

      if (!email) {
        return { status: 'failed', externalId: '', error: 'Lead/contato sem email' };
      }

      // For now, always simulate. Real email will be added when EmailClient is integrated.
      const channelConfig = getChannelConfig('email');
      if (!channelConfig || channelConfig.simulationMode) {
        return simulateEmailSend(email, subject, body, enrollment.contact_id, templateData.nome);
      }

      // Real mode placeholder - will be replaced with EmailClient call
      return simulateEmailSend(email, subject, body, enrollment.contact_id, templateData.nome);
    }

    case 'whatsapp': {
      const message = replaceTemplateVars(step.template_body, templateData);
      const phone = templateData.phone;

      if (!phone) {
        return { status: 'failed', externalId: '', error: 'Lead/contato sem telefone' };
      }

      const channelConfig = getChannelConfig('whatsapp');
      if (!channelConfig || channelConfig.simulationMode) {
        return simulateWhatsAppSend(phone, message);
      }

      // Real mode placeholder
      return simulateWhatsAppSend(phone, message);
    }

    case 'call':
    case 'task':
    case 'linkedin_manual':
      return createTaskForStep(enrollment, step, templateData);

    default:
      return { status: 'failed', externalId: '', error: `Canal desconhecido: ${step.channel}` };
  }
}

// Main processing function - called every tick
function processDueEnrollments(): void {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // Query enrollments that are due
  const dueEnrollments = db.prepare(`
    SELECT e.*,
           l.name as lead_name, l.email as lead_email, l.phone as lead_phone, l.company as lead_company,
           c.name as contact_name, c.email as contact_email, c.phone as contact_phone, c.company as contact_company, c.role as contact_role
    FROM cadence_enrollments e
    LEFT JOIN leads l ON e.lead_id = l.id
    LEFT JOIN contacts c ON e.contact_id = c.id
    WHERE e.status = 'active' AND e.next_step_due <= ?
    LIMIT 50
  `).all(now) as any[];

  if (dueEnrollments.length === 0) return;

  console.log(`[Cadence Worker] Processing ${dueEnrollments.length} due enrollment(s)...`);

  for (const enrollment of dueEnrollments) {
    try {
      // 1. Get current step
      const step = db.prepare(
        'SELECT * FROM cadence_steps WHERE cadence_id = ? AND step_order = ?'
      ).get(enrollment.cadence_id, enrollment.current_step) as any;

      if (!step) {
        // No more steps → mark completed
        db.prepare(
          "UPDATE cadence_enrollments SET status = 'completed', completed_at = ?, next_step_due = NULL WHERE id = ?"
        ).run(now, enrollment.id);
        db.prepare(
          'UPDATE cadences SET total_completed = total_completed + 1 WHERE id = ?'
        ).run(enrollment.cadence_id);
        console.log(`[Cadence Worker] Enrollment ${enrollment.id} completed (no more steps)`);
        continue;
      }

      // 2. Build template data
      const templateData = buildTemplateData(enrollment);

      // 2.5 Compliance checks (email/whatsapp only)
      if (step.channel === 'email' || step.channel === 'whatsapp') {
        const email = templateData.email;
        const phone = templateData.phone;

        if (isUnsubscribed(email, phone)) {
          console.log(`[Cadence Worker] SKIPPED ${enrollment.id}: unsubscribed (${email || phone})`);
          const execId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO cadence_step_executions (id, enrollment_id, step_id, step_order, channel, status, sent_at, error, external_id, created_at)
            VALUES (?, ?, ?, ?, ?, 'failed', ?, 'Unsubscribed', '', ?)
          `).run(execId, enrollment.id, step.id, step.step_order, step.channel, now, now);
          // Skip to next step or complete
          const nextStep2 = db.prepare('SELECT * FROM cadence_steps WHERE cadence_id = ? AND step_order = ?').get(enrollment.cadence_id, enrollment.current_step + 1) as any;
          if (nextStep2) {
            const nd = new Date(); nd.setDate(nd.getDate() + nextStep2.delay_days); nd.setHours(nd.getHours() + nextStep2.delay_hours);
            db.prepare('UPDATE cadence_enrollments SET current_step = ?, last_step_at = ?, next_step_due = ? WHERE id = ?').run(enrollment.current_step + 1, now, nd.toISOString().replace('T', ' ').slice(0, 19), enrollment.id);
          } else {
            db.prepare("UPDATE cadence_enrollments SET status = 'completed', completed_at = ?, last_step_at = ?, next_step_due = NULL WHERE id = ?").run(now, now, enrollment.id);
          }
          continue;
        }

        if (step.channel === 'email' && email) {
          const domain = email.split('@')[1] || '';
          if (domain && !checkRateLimit(domain)) {
            // Delay by 1 hour
            const delayed = new Date(Date.now() + 3600000).toISOString().replace('T', ' ').slice(0, 19);
            db.prepare('UPDATE cadence_enrollments SET next_step_due = ? WHERE id = ?').run(delayed, enrollment.id);
            console.log(`[Cadence Worker] RATE LIMITED ${enrollment.id}: ${domain} → delayed 1h`);
            continue;
          }
        }
      }

      // 3. Execute step
      const result = executeStep(enrollment, step, templateData);

      // 4. Record execution
      const execId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO cadence_step_executions (id, enrollment_id, step_id, step_order, channel, status, sent_at, error, external_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(execId, enrollment.id, step.id, step.step_order, step.channel, result.status, now, result.error, result.externalId, now);

      // 4.5 Post-send: record send for rate limiting + score event
      if (step.channel === 'email' && result.status !== 'failed') {
        const email = templateData.email;
        const domain = email ? email.split('@')[1] || '' : '';
        if (domain) recordSend(domain, execId);
      }
      if (enrollment.lead_id && result.status !== 'failed') {
        try { recordScoreEvent(enrollment.lead_id, 'email_sent', 0, { channel: step.channel, stepOrder: step.step_order }); } catch { /* ignore */ }
      }

      // 5. Calculate next step
      const nextStep = db.prepare(
        'SELECT * FROM cadence_steps WHERE cadence_id = ? AND step_order = ?'
      ).get(enrollment.cadence_id, enrollment.current_step + 1) as any;

      if (nextStep) {
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + nextStep.delay_days);
        nextDue.setHours(nextDue.getHours() + nextStep.delay_hours);
        const nextDueStr = nextDue.toISOString().replace('T', ' ').slice(0, 19);

        db.prepare(
          'UPDATE cadence_enrollments SET current_step = ?, last_step_at = ?, next_step_due = ? WHERE id = ?'
        ).run(enrollment.current_step + 1, now, nextDueStr, enrollment.id);
      } else {
        // Last step → completed
        db.prepare(
          "UPDATE cadence_enrollments SET status = 'completed', completed_at = ?, last_step_at = ?, next_step_due = NULL WHERE id = ?"
        ).run(now, now, enrollment.id);
        db.prepare(
          'UPDATE cadences SET total_completed = total_completed + 1 WHERE id = ?'
        ).run(enrollment.cadence_id);
      }

      // 6. Log activity
      const actType = step.channel === 'email' ? 'email' : step.channel === 'whatsapp' ? 'whatsapp' : 'note';
      db.prepare(`
        INSERT INTO activities (id, type, description, contact_name, contact_id, date, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        actType,
        `Cadencia: ${step.channel} enviado (passo ${step.step_order})`,
        templateData.nome,
        enrollment.contact_id || null,
        now, null, now
      );

      console.log(`[Cadence Worker] Enrollment ${enrollment.id}: step ${step.step_order} (${step.channel}) → ${result.status}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Cadence Worker] Error processing enrollment ${enrollment.id}:`, message);
    }
  }
}

// Cron management
let cronTask: cron.ScheduledTask | null = null;

export function startCadenceWorker(): void {
  if (cronTask) return;
  console.log('[Cadence Worker] Starting... (every 60 seconds)');

  // Run immediately on start
  try { processDueEnrollments(); } catch (e) { console.error('[Cadence Worker] Initial run error:', e); }

  // Then every 60 seconds
  cronTask = cron.schedule('* * * * *', () => {
    try {
      processDueEnrollments();
    } catch (err) {
      console.error('[Cadence Worker] Tick error:', err);
    }
  });
}

export function stopCadenceWorker(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    console.log('[Cadence Worker] Stopped.');
  }
}
