import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// GET /api/reply-classification/recent
router.get('/recent', verifyAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const rows = db.prepare(`
      SELECT rc.*,
        l.name as lead_name, l.company as lead_company,
        c.name as contact_name, c.company as contact_company,
        cad.name as cadence_name
      FROM reply_classifications rc
      LEFT JOIN leads l ON rc.lead_id = l.id
      LEFT JOIN contacts c ON rc.contact_id = c.id
      LEFT JOIN cadence_enrollments ce ON rc.enrollment_id = ce.id
      LEFT JOIN cadences cad ON ce.cadence_id = cad.id
      ORDER BY rc.classified_at DESC
      LIMIT ?
    `).all(limit) as any[];

    res.json(rows.map(r => ({
      id: r.id,
      enrollmentId: r.enrollment_id,
      leadId: r.lead_id,
      contactId: r.contact_id,
      replyText: r.reply_text,
      classification: r.classification,
      confidence: r.confidence,
      aiReasoning: r.ai_reasoning,
      actionsTaken: JSON.parse(r.actions_taken || '[]'),
      reviewed: !!r.reviewed,
      classifiedAt: r.classified_at,
      leadName: r.lead_name || r.contact_name || '',
      company: r.lead_company || r.contact_company || '',
      cadenceName: r.cadence_name || '',
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reply-classification/stats
router.get('/stats', verifyAuth, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT classification, COUNT(*) as count, AVG(confidence) as avg_confidence
      FROM reply_classifications
      GROUP BY classification
    `).all() as any[];

    const total = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    res.json({
      total,
      byClassification: stats.map(s => ({
        classification: s.classification,
        count: s.count,
        percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
        avgConfidence: Math.round((s.avg_confidence || 0) * 100) / 100,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reply-classification/:id/override
router.put('/:id/override', verifyAuth, (req, res) => {
  try {
    const { classification } = req.body;
    const valid = ['interested', 'not_interested', 'meeting_request', 'proposal_request', 'out_of_office', 'unsubscribe', 'other'];
    if (!valid.includes(classification)) {
      return res.status(400).json({ error: 'Invalid classification' });
    }

    db.prepare('UPDATE reply_classifications SET classification = ?, reviewed = 1 WHERE id = ?').run(classification, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
