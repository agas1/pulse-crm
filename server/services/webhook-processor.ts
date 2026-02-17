import crypto from 'crypto';
import db from '../db.js';
import { classifyReply, executeClassificationActions } from './reply-classifier.js';
import { recordScoreEvent } from './lead-scoring.js';

interface InboundMessage {
  platform: 'whatsapp' | 'instagram';
  from: string;
  messageId: string;
  text: string;
  timestamp: string;
  type: string;
}

export async function processInboundMessage(msg: InboundMessage): Promise<void> {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 1. Normalize phone and find contact/lead
  const normalizedPhone = msg.from.replace(/\D/g, '');
  const lastDigits = normalizedPhone.slice(-9);

  const contact = db.prepare(
    "SELECT id, name, email, phone FROM contacts WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?"
  ).get(`%${lastDigits}%`) as any;

  const lead = !contact ? db.prepare(
    "SELECT id, name, email, phone FROM leads WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, '(', ''), ')', ''), '-', ''), ' ', '') LIKE ?"
  ).get(`%${lastDigits}%`) as any : null;

  const entity = contact || lead;

  // 2. Check active cadence enrollments → PAUSE on reply
  if (entity) {
    const enrollmentQuery = contact
      ? "SELECT id, cadence_id FROM cadence_enrollments WHERE contact_id = ? AND status = 'active'"
      : "SELECT id, cadence_id FROM cadence_enrollments WHERE lead_id = ? AND status = 'active'";

    const enrollments = db.prepare(enrollmentQuery).all(entity.id) as any[];

    for (const enrollment of enrollments) {
      db.prepare(
        "UPDATE cadence_enrollments SET status = 'replied', paused_at = ?, next_step_due = NULL WHERE id = ?"
      ).run(now, enrollment.id);

      db.prepare(
        'UPDATE cadences SET total_replied = total_replied + 1 WHERE id = ?'
      ).run(enrollment.cadence_id);

      // Update most recent step execution to 'replied'
      const latestExec = db.prepare(
        "SELECT id FROM cadence_step_executions WHERE enrollment_id = ? AND status IN ('sent','delivered','opened') ORDER BY created_at DESC LIMIT 1"
      ).get(enrollment.id) as any;

      if (latestExec) {
        db.prepare(
          "UPDATE cadence_step_executions SET status = 'replied', replied_at = ? WHERE id = ?"
        ).run(now, latestExec.id);
      }

      console.log(`[Webhook] Enrollment ${enrollment.id} → replied (cadence paused)`);

      // Classify reply with AI and execute auto-actions
      const leadId = contact ? null : lead?.id || null;
      const contactIdForClass = contact?.id || null;
      try {
        const classification = await classifyReply(msg.text, {
          leadName: entity?.name, company: (lead as any)?.company || (contact as any)?.company || '',
          stepChannel: msg.platform,
        });
        const enrolledBy = (db.prepare('SELECT enrolled_by FROM cadence_enrollments WHERE id = ?').get(enrollment.id) as any)?.enrolled_by || 'u1';
        await executeClassificationActions(
          classification.classification, classification, enrollment.id,
          latestExec?.id || null, leadId, contactIdForClass, msg.text, enrolledBy
        );
      } catch (e) {
        console.error('[Webhook] Classification error:', e);
      }

      // Score event for reply
      if (leadId) {
        try { recordScoreEvent(leadId, 'reply', 25, { platform: msg.platform }); } catch { /* ignore */ }
      }
    }
  }

  // 3. Log activity
  db.prepare(`
    INSERT INTO activities (id, type, description, contact_name, contact_id, date, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    msg.platform,
    `Mensagem recebida via ${msg.platform}: ${msg.text.slice(0, 200)}`,
    entity?.name || msg.from,
    contact?.id || null,
    now, null, now
  );

  // 4. Auto-create lead if unknown
  if (!entity) {
    const leadId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO leads (id, name, email, phone, company, source, score, notes, status, created_at, updated_at)
      VALUES (?, ?, '', ?, '', ?, 'warm', ?, 'new', ?, ?)
    `).run(
      leadId,
      `Desconhecido (${msg.from})`,
      msg.from,
      msg.platform,
      `Auto-criado via ${msg.platform} inbound`,
      now, now
    );
    console.log(`[Webhook] Auto-created lead ${leadId} for unknown ${msg.platform} sender ${msg.from}`);
  }
}
