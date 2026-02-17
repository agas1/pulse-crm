import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface ActivityRow {
  id: string;
  type: string;
  description: string;
  contact_name: string;
  contact_id: string | null;
  deal_id: string | null;
  date: string;
  meta: string | null;
  created_at: string;
}

interface DealStageCount {
  stage: string;
  count: number;
}

interface DealStageValue {
  stage: string;
  count: number;
  total_value: number;
}

interface RevenueByUserRow {
  user_id: string;
  name: string;
  revenue: number;
  deal_count: number;
  total_deals: number;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

const stageLabels: Record<string, string> = {
  lead: 'Lead',
  contato_feito: 'Contato Feito',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociacao',
  fechado_ganho: 'Fechado (Ganho)',
  fechado_perdido: 'Fechado (Perdido)',
};

const stageColors: Record<string, string> = {
  lead: '#94a3b8',
  contato_feito: '#60a5fa',
  proposta_enviada: '#f59e0b',
  negociacao: '#8b5cf6',
  fechado_ganho: '#22c55e',
  fechado_perdido: '#ef4444',
};

const stageOrder = ['lead', 'contato_feito', 'proposta_enviada', 'negociacao', 'fechado_ganho', 'fechado_perdido'];

function sanitizeActivity(row: ActivityRow) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    contactName: row.contact_name,
    contactId: row.contact_id,
    dealId: row.deal_id,
    date: row.date,
    meta: row.meta,
    createdAt: row.created_at,
  };
}

function ownershipFilter(auth: AuthRequest['auth']): { where: string; params: string[] } {
  if (auth!.role === 'admin' || auth!.role === 'manager') return { where: '', params: [] };
  return { where: 'AND assigned_to = ?', params: [auth!.userId] };
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET /stats — Dashboard metrics
// ──────────────────────────────────────

router.get('/stats', (req: AuthRequest, res) => {
  try {
    const { where, params } = ownershipFilter(req.auth);

    // Total revenue (fechado_ganho)
    const revenueRow = db.prepare(
      `SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage = 'fechado_ganho' ${where}`
    ).get(...params) as { total: number };
    const totalRevenue = revenueRow.total;

    // Pipeline value (not closed)
    const pipelineRow = db.prepare(
      `SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage NOT IN ('fechado_ganho', 'fechado_perdido') ${where}`
    ).get(...params) as { total: number };
    const pipelineValue = pipelineRow.total;

    // Active contacts
    const contactsRow = db.prepare(
      `SELECT COUNT(*) as total FROM contacts WHERE status = 'active' ${where}`
    ).get(...params) as { total: number };
    const activeContacts = contactsRow.total;

    // Conversion rate
    const totalDealsRow = db.prepare(
      `SELECT COUNT(*) as total FROM deals WHERE 1=1 ${where}`
    ).get(...params) as { total: number };
    const wonDealsRow = db.prepare(
      `SELECT COUNT(*) as total FROM deals WHERE stage = 'fechado_ganho' ${where}`
    ).get(...params) as { total: number };
    const conversionRate = totalDealsRow.total > 0
      ? Math.round((wonDealsRow.total / totalDealsRow.total) * 100)
      : 0;

    // Deals by stage
    const stageCounts = db.prepare(
      `SELECT stage, COUNT(*) as count FROM deals WHERE 1=1 ${where} GROUP BY stage`
    ).all(...params) as DealStageCount[];

    const stageCountMap: Record<string, number> = {};
    for (const row of stageCounts) {
      stageCountMap[row.stage] = row.count;
    }

    const dealsByStage = stageOrder.map(stage => ({
      stage,
      label: stageLabels[stage] || stage,
      count: stageCountMap[stage] || 0,
      color: stageColors[stage] || '#94a3b8',
    }));

    // Recent activities (last 8)
    const recentActivities = db.prepare(
      'SELECT * FROM activities ORDER BY date DESC LIMIT 8'
    ).all() as ActivityRow[];

    res.json({
      totalRevenue,
      pipelineValue,
      activeContacts,
      conversionRate,
      dealsByStage,
      recentActivities: recentActivities.map(sanitizeActivity),
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar estatísticas do dashboard' });
  }
});

// ──────────────────────────────────────
// GET /reports — Report data
// ──────────────────────────────────────

router.get('/reports', (req: AuthRequest, res) => {
  try {
    const { where, params } = ownershipFilter(req.auth);

    // Revenue by user (admin/manager only)
    let revenueByUser: Array<{ name: string; revenue: number; dealCount: number; conversionRate: number }> = [];

    if (req.auth!.role === 'admin' || req.auth!.role === 'manager') {
      const rows = db.prepare(`
        SELECT
          u.id as user_id,
          u.name,
          COALESCE(SUM(CASE WHEN d.stage = 'fechado_ganho' THEN d.value ELSE 0 END), 0) as revenue,
          SUM(CASE WHEN d.stage = 'fechado_ganho' THEN 1 ELSE 0 END) as deal_count,
          COUNT(d.id) as total_deals
        FROM users u
        LEFT JOIN deals d ON d.assigned_to = u.id
        GROUP BY u.id, u.name
        ORDER BY revenue DESC
      `).all() as RevenueByUserRow[];

      revenueByUser = rows.map(row => ({
        name: row.name,
        revenue: row.revenue,
        dealCount: row.deal_count,
        conversionRate: row.total_deals > 0
          ? Math.round((row.deal_count / row.total_deals) * 100)
          : 0,
      }));
    }

    // Leads by stage (with values)
    const stageValues = db.prepare(
      `SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM deals WHERE 1=1 ${where} GROUP BY stage`
    ).all(...params) as DealStageValue[];

    const stageValueMap: Record<string, { count: number; value: number }> = {};
    for (const row of stageValues) {
      stageValueMap[row.stage] = { count: row.count, value: row.total_value };
    }

    const leadsByStage = stageOrder.map(stage => ({
      stage,
      label: stageLabels[stage] || stage,
      count: stageValueMap[stage]?.count || 0,
      value: stageValueMap[stage]?.value || 0,
      color: stageColors[stage] || '#94a3b8',
    }));

    res.json({
      revenueByUser,
      leadsByStage,
    });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar dados de relatórios' });
  }
});

// ──────────────────────────────────────
// GET /activity-summary — Activity summary counts
// ──────────────────────────────────────

router.get('/activity-summary', (req: AuthRequest, res) => {
  try {
    const { where, params } = ownershipFilter(req.auth);

    // Build ownership filter for scheduled_activities
    const schedWhere = req.auth!.role === 'seller' ? 'AND assigned_to = ?' : '';
    const schedParams = req.auth!.role === 'seller' ? [req.auth!.userId] : [];

    // Overdue: completed=0 AND due_date < date('now')
    const overdueRow = db.prepare(
      `SELECT COUNT(*) as total FROM scheduled_activities WHERE completed = 0 AND due_date < date('now') ${schedWhere}`
    ).get(...schedParams) as { total: number };

    // Today: completed=0 AND due_date = date('now')
    const todayRow = db.prepare(
      `SELECT COUNT(*) as total FROM scheduled_activities WHERE completed = 0 AND due_date = date('now') ${schedWhere}`
    ).get(...schedParams) as { total: number };

    // Upcoming: completed=0 AND due_date > date('now')
    const upcomingRow = db.prepare(
      `SELECT COUNT(*) as total FROM scheduled_activities WHERE completed = 0 AND due_date > date('now') ${schedWhere}`
    ).get(...schedParams) as { total: number };

    // Stalled deals: next_activity_date IS NULL OR next_activity_date < date('now')
    const stalledRow = db.prepare(
      `SELECT COUNT(*) as total FROM deals WHERE (next_activity_date IS NULL OR next_activity_date < date('now')) ${where}`
    ).get(...params) as { total: number };

    res.json({
      overdue: overdueRow.total,
      today: todayRow.total,
      upcoming: upcomingRow.total,
      stalled: stalledRow.total,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar resumo de atividades: ${message}` });
  }
});

export default router;
