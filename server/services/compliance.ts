import db from '../db.js';
import crypto from 'crypto';

interface ComplianceConfig {
  maxEmailsPerHourPerDomain: number;
  maxEmailsPerDay: number;
  softBounceRetryCount: number;
  enabled: boolean;
}

export function getComplianceConfig(): ComplianceConfig {
  const config = db.prepare('SELECT * FROM compliance_config WHERE id = ?').get('config') as any;
  if (!config) return { maxEmailsPerHourPerDomain: 30, maxEmailsPerDay: 200, softBounceRetryCount: 1, enabled: true };
  return {
    maxEmailsPerHourPerDomain: config.max_emails_per_hour_per_domain,
    maxEmailsPerDay: config.max_emails_per_day,
    softBounceRetryCount: config.soft_bounce_retry_count,
    enabled: !!config.enabled,
  };
}

export function updateComplianceConfig(updates: Partial<ComplianceConfig>): void {
  const current = getComplianceConfig();
  db.prepare(`
    UPDATE compliance_config SET
      max_emails_per_hour_per_domain = ?, max_emails_per_day = ?,
      soft_bounce_retry_count = ?, enabled = ?, updated_at = datetime('now')
    WHERE id = 'config'
  `).run(
    updates.maxEmailsPerHourPerDomain ?? current.maxEmailsPerHourPerDomain,
    updates.maxEmailsPerDay ?? current.maxEmailsPerDay,
    updates.softBounceRetryCount ?? current.softBounceRetryCount,
    (updates.enabled ?? current.enabled) ? 1 : 0
  );
}

export function isUnsubscribed(email: string, phone: string): boolean {
  if (email) {
    const byEmail = db.prepare("SELECT id FROM unsubscribe_list WHERE email = ? AND email != ''").get(email);
    if (byEmail) return true;
  }
  if (phone) {
    const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
    const all = db.prepare("SELECT phone FROM unsubscribe_list WHERE phone != ''").all() as any[];
    for (const row of all) {
      if (row.phone.replace(/\D/g, '').slice(-9) === normalizedPhone) return true;
    }
  }
  return false;
}

export function addToUnsubscribeList(email: string, phone: string, reason: string, source: string, enrollmentId?: string): void {
  if (email) {
    const existing = db.prepare("SELECT id FROM unsubscribe_list WHERE email = ? AND email != ''").get(email);
    if (existing) return;
  }
  db.prepare(`
    INSERT INTO unsubscribe_list (id, email, phone, reason, source, enrollment_id) VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), email || '', phone || '', reason, source, enrollmentId || null);
}

export function removeFromUnsubscribeList(id: string): boolean {
  return db.prepare('DELETE FROM unsubscribe_list WHERE id = ?').run(id).changes > 0;
}

export function getUnsubscribeList(limit: number = 100, offset: number = 0): { items: any[]; total: number } {
  const total = (db.prepare('SELECT COUNT(*) as count FROM unsubscribe_list').get() as any).count;
  const items = db.prepare('SELECT * FROM unsubscribe_list ORDER BY unsubscribed_at DESC LIMIT ? OFFSET ?').all(limit, offset) as any[];
  return {
    total,
    items: items.map(i => ({
      id: i.id, email: i.email, phone: i.phone, reason: i.reason,
      source: i.source, enrollmentId: i.enrollment_id, unsubscribedAt: i.unsubscribed_at,
    })),
  };
}

export function checkRateLimit(emailDomain: string): boolean {
  const config = getComplianceConfig();
  if (!config.enabled) return true;

  const oneHourAgo = new Date(Date.now() - 3600000).toISOString().replace('T', ' ').slice(0, 19);
  const hourlyCount = (db.prepare(
    'SELECT COUNT(*) as count FROM send_log WHERE email_domain = ? AND sent_at > ?'
  ).get(emailDomain, oneHourAgo) as any).count;
  if (hourlyCount >= config.maxEmailsPerHourPerDomain) return false;

  const oneDayAgo = new Date(Date.now() - 86400000).toISOString().replace('T', ' ').slice(0, 19);
  const dailyCount = (db.prepare('SELECT COUNT(*) as count FROM send_log WHERE sent_at > ?').get(oneDayAgo) as any).count;
  if (dailyCount >= config.maxEmailsPerDay) return false;

  return true;
}

export function recordSend(emailDomain: string, executionId?: string): void {
  db.prepare('INSERT INTO send_log (id, email_domain, execution_id) VALUES (?, ?, ?)').run(crypto.randomUUID(), emailDomain, executionId || null);
}

export function handleBounce(email: string, bounceType: 'hard' | 'soft', reason: string, executionId?: string): void {
  db.prepare('INSERT INTO bounce_log (id, email, bounce_type, reason, execution_id) VALUES (?, ?, ?, ?, ?)').run(crypto.randomUUID(), email, bounceType, reason, executionId || null);

  if (bounceType === 'hard') {
    addToUnsubscribeList(email, '', `Hard bounce: ${reason}`, 'bounce');
    const leads = db.prepare('SELECT id FROM leads WHERE email = ?').all(email) as any[];
    for (const lead of leads) {
      db.prepare("UPDATE cadence_enrollments SET status = 'bounced' WHERE lead_id = ? AND status = 'active'").run(lead.id);
    }
  }
}

export function getBounceLog(limit: number = 50): any[] {
  return db.prepare('SELECT * FROM bounce_log ORDER BY bounced_at DESC LIMIT ?').all(limit) as any[];
}

export function getSendStats(): { hourly: any[]; dailyTotal: number } {
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString().replace('T', ' ').slice(0, 19);
  const dailyTotal = (db.prepare('SELECT COUNT(*) as count FROM send_log WHERE sent_at > ?').get(oneDayAgo) as any).count;
  const hourly = db.prepare('SELECT email_domain, COUNT(*) as count FROM send_log WHERE sent_at > ? GROUP BY email_domain ORDER BY count DESC LIMIT 20').all(oneDayAgo) as any[];
  return { hourly, dailyTotal };
}
