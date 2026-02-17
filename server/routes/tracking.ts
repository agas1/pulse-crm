import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import { recordScoreEvent } from '../services/lead-scoring.js';

function findLeadIdByExecution(executionId: string): string | null {
  const row = db.prepare(`
    SELECT ce.lead_id FROM cadence_step_executions cse
    JOIN cadence_enrollments ce ON cse.enrollment_id = ce.id
    WHERE cse.id = ? AND ce.lead_id IS NOT NULL
  `).get(executionId) as any;
  return row?.lead_id || null;
}

const router = Router();

// 1x1 transparent GIF pixel
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// GET /api/track/open/:executionId - tracking pixel
router.get('/open/:executionId', (req: Request, res: Response) => {
  const { executionId } = req.params;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    db.prepare(`
      UPDATE cadence_step_executions
      SET status = CASE WHEN status IN ('sent','delivered') THEN 'opened' ELSE status END,
          opened_at = CASE WHEN opened_at IS NULL THEN ? ELSE opened_at END
      WHERE id = ?
    `).run(now, executionId);
    // Score event for open
    const leadId = findLeadIdByExecution(executionId as string);
    if (leadId) {
      try { recordScoreEvent(leadId, 'open', 5, { executionId }); } catch { /* ignore */ }
    }
  } catch {
    // Silently fail - don't break the pixel
  }

  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache' });
  res.send(TRANSPARENT_GIF);
});

// GET /api/track/click/:executionId?url=ORIGINAL - click redirect
router.get('/click/:executionId', (req: Request, res: Response) => {
  const { executionId } = req.params;
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).send('Missing url');
    return;
  }

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    db.prepare(`
      UPDATE cadence_step_executions
      SET status = CASE WHEN status IN ('sent','delivered') THEN 'opened' ELSE status END,
          opened_at = CASE WHEN opened_at IS NULL THEN ? ELSE opened_at END
      WHERE id = ?
    `).run(now, executionId);
    // Score event for click
    const leadId = findLeadIdByExecution(executionId as string);
    if (leadId) {
      try { recordScoreEvent(leadId, 'click', 10, { executionId, url }); } catch { /* ignore */ }
    }
  } catch {
    // Silently fail
  }

  res.redirect(301, url);
});

export default router;
