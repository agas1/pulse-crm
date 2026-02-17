import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { calculateLeadScore, getScoreBreakdown, getLeaderboard, applyDailyDecay } from '../services/lead-scoring.js';

const router = Router();

// GET /api/lead-scoring/leaderboard - must be before /:leadId
router.get('/leaderboard', verifyAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const leads = getLeaderboard(limit);
    const sanitized = leads.map((l: any) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      phone: l.phone,
      company: l.company,
      source: l.source,
      score: l.score,
      status: l.status,
      jobTitle: l.job_title,
      companySize: l.company_size,
      numericScore: l.numeric_score,
      scoreDerivedLabel: l.score_label,
      scoreBreakdown: JSON.parse(l.score_breakdown || '{}'),
      lastInteractionAt: l.last_interaction_at,
      assignedTo: l.assigned_to,
      createdAt: l.created_at,
    }));
    res.json(sanitized);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-scoring/decay - trigger daily decay (admin)
router.post('/decay', verifyAuth, (req, res) => {
  try {
    const updated = applyDailyDecay();
    res.json({ updated, message: `Decay applied to ${updated} leads` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lead-scoring/:leadId - get score breakdown
router.get('/:leadId', verifyAuth, (req, res) => {
  try {
    const result = getScoreBreakdown(req.params.leadId as string);
    if (!result) return res.status(404).json({ error: 'Lead not found' });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-scoring/:leadId/recalculate
router.post('/:leadId/recalculate', verifyAuth, (req, res) => {
  try {
    const result = calculateLeadScore(req.params.leadId as string);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
