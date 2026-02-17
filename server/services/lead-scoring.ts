import db from '../db.js';
import crypto from 'crypto';

interface ScoreBreakdown {
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

interface ScoreResult {
  numericScore: number;
  derivedLabel: 'hot' | 'warm' | 'cold';
  breakdown: ScoreBreakdown;
}

const SOURCE_SCORES: Record<string, number> = {
  referral: 15, website: 10, manual: 5, facebook: 5, csv: 0,
};

const ICP_PATTERNS: Array<{ pattern: RegExp; points: number }> = [
  { pattern: /\b(ceo|cto|cfo|coo|cmo|founder|co-?founder|socio|presidente)\b/i, points: 10 },
  { pattern: /\b(vp|vice.?president|diretor|director|head)\b/i, points: 7 },
  { pattern: /\b(gerente|manager|coordenador|coordinator|supervisor|lead)\b/i, points: 3 },
];

const COMPANY_SIZE_SCORES: Record<string, number> = {
  '1000+': 10, '201-1000': 8, '51-200': 5, '11-50': 3, '1-10': 0, '': 0,
};

function getICPScore(jobTitle: string): number {
  if (!jobTitle) return 0;
  for (const { pattern, points } of ICP_PATTERNS) {
    if (pattern.test(jobTitle)) return points;
  }
  return 0;
}

export function calculateLeadScore(leadId: string): ScoreResult {
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId) as any;
  if (!lead) {
    return { numericScore: 0, derivedLabel: 'cold', breakdown: { opens: 0, clicks: 0, replies: 0, responseSpeed: 0, source: 0, icp: 0, companySize: 0, decay: 0, total: 0 } };
  }

  const enrollmentIds = (db.prepare(
    'SELECT id FROM cadence_enrollments WHERE lead_id = ?'
  ).all(leadId) as any[]).map(e => e.id);

  let openCount = 0, replyCount = 0;
  let fastestReplyMs = Infinity;

  if (enrollmentIds.length > 0) {
    const placeholders = enrollmentIds.map(() => '?').join(',');
    const executions = db.prepare(
      `SELECT status, sent_at, opened_at, replied_at FROM cadence_step_executions WHERE enrollment_id IN (${placeholders})`
    ).all(...enrollmentIds) as any[];

    for (const exec of executions) {
      if (exec.opened_at) openCount++;
      if (exec.status === 'replied' && exec.replied_at) {
        replyCount++;
        if (exec.sent_at) {
          const diff = new Date(exec.replied_at).getTime() - new Date(exec.sent_at).getTime();
          if (diff < fastestReplyMs) fastestReplyMs = diff;
        }
      }
    }
  }

  const clickEvents = db.prepare(
    `SELECT COUNT(*) as count FROM lead_score_events WHERE lead_id = ? AND event_type = 'click'`
  ).get(leadId) as any;
  const clickCount = clickEvents?.count || 0;

  const opensScore = Math.min(openCount * 5, 25);
  const clicksScore = Math.min(clickCount * 10, 30);
  const repliesScore = Math.min(replyCount * 25, 50);

  let responseSpeedScore = 0;
  if (fastestReplyMs < Infinity) {
    const hours = fastestReplyMs / (1000 * 60 * 60);
    if (hours < 1) responseSpeedScore = 15;
    else if (hours < 24) responseSpeedScore = 10;
    else if (hours < 48) responseSpeedScore = 5;
  }

  const sourceScore = SOURCE_SCORES[lead.source] ?? 0;
  const icpScore = getICPScore(lead.job_title || '');
  const companySizeScore = COMPANY_SIZE_SCORES[lead.company_size || ''] ?? 0;

  let decayScore = 0;
  const lastInteraction = db.prepare(`
    SELECT MAX(created_at) as last_at FROM lead_score_events WHERE lead_id = ? AND event_type != 'decay'
  `).get(leadId) as any;

  if (lastInteraction?.last_at) {
    const daysSince = (Date.now() - new Date(lastInteraction.last_at).getTime()) / (1000 * 60 * 60 * 24);
    decayScore = -Math.floor(daysSince) * 2;
  }

  const rawTotal = opensScore + clicksScore + repliesScore + responseSpeedScore + sourceScore + icpScore + companySizeScore + decayScore;
  const total = Math.max(0, Math.min(100, rawTotal));
  const derivedLabel: 'hot' | 'warm' | 'cold' = total >= 70 ? 'hot' : total >= 40 ? 'warm' : 'cold';

  const breakdown: ScoreBreakdown = {
    opens: opensScore, clicks: clicksScore, replies: repliesScore,
    responseSpeed: responseSpeedScore, source: sourceScore, icp: icpScore,
    companySize: companySizeScore, decay: decayScore, total,
  };

  const existing = db.prepare('SELECT id FROM lead_scores WHERE lead_id = ?').get(leadId) as any;
  if (existing) {
    db.prepare(`
      UPDATE lead_scores SET numeric_score = ?, score_breakdown = ?, derived_label = ?,
        last_calculated_at = datetime('now'), last_interaction_at = ?
      WHERE lead_id = ?
    `).run(total, JSON.stringify(breakdown), derivedLabel, lastInteraction?.last_at || null, leadId);
  } else {
    db.prepare(`
      INSERT INTO lead_scores (id, lead_id, numeric_score, score_breakdown, derived_label, last_interaction_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), leadId, total, JSON.stringify(breakdown), derivedLabel, lastInteraction?.last_at || null);
  }

  db.prepare("UPDATE leads SET score = ?, updated_at = datetime('now') WHERE id = ?").run(derivedLabel, leadId);

  return { numericScore: total, derivedLabel, breakdown };
}

export function recordScoreEvent(leadId: string, eventType: string, pointsDelta: number, metadata: Record<string, unknown> = {}): void {
  db.prepare(`
    INSERT INTO lead_score_events (id, lead_id, event_type, points_delta, metadata)
    VALUES (?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), leadId, eventType, pointsDelta, JSON.stringify(metadata));
  calculateLeadScore(leadId);
}

export function initializeLeadScore(leadId: string): ScoreResult {
  return calculateLeadScore(leadId);
}

export function getScoreBreakdown(leadId: string): { score: any; events: any[] } | null {
  const score = db.prepare(`
    SELECT ls.*, l.name, l.company, l.source, l.job_title, l.company_size
    FROM lead_scores ls JOIN leads l ON ls.lead_id = l.id WHERE ls.lead_id = ?
  `).get(leadId) as any;
  if (!score) return null;

  const events = db.prepare(
    'SELECT * FROM lead_score_events WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(leadId) as any[];

  return {
    score: {
      numericScore: score.numeric_score, derivedLabel: score.derived_label,
      breakdown: JSON.parse(score.score_breakdown || '{}'),
      lastInteractionAt: score.last_interaction_at, lastCalculatedAt: score.last_calculated_at,
      leadName: score.name, company: score.company,
    },
    events: events.map(e => ({
      id: e.id, eventType: e.event_type, pointsDelta: e.points_delta,
      metadata: JSON.parse(e.metadata || '{}'), createdAt: e.created_at,
    })),
  };
}

export function applyDailyDecay(): number {
  const leads = db.prepare(`
    SELECT ls.lead_id FROM lead_scores ls
    WHERE ls.numeric_score > 0
    AND (ls.last_interaction_at IS NULL OR ls.last_interaction_at < datetime('now', '-1 day'))
  `).all() as any[];

  let updated = 0;
  for (const { lead_id } of leads) {
    recordScoreEvent(lead_id, 'decay', -2, { reason: 'daily_decay' });
    updated++;
  }
  console.log(`[Lead Scoring] Daily decay applied to ${updated} leads`);
  return updated;
}

export function getLeaderboard(limit: number = 20): any[] {
  return db.prepare(`
    SELECT l.*, ls.numeric_score, ls.derived_label as score_label, ls.score_breakdown, ls.last_interaction_at
    FROM leads l JOIN lead_scores ls ON l.id = ls.lead_id
    WHERE l.status IN ('new', 'contacted')
    ORDER BY ls.numeric_score DESC LIMIT ?
  `).all(limit) as any[];
}
