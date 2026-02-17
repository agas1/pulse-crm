import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.js';
import {
  getComplianceConfig, updateComplianceConfig,
  getUnsubscribeList, addToUnsubscribeList, removeFromUnsubscribeList,
  getBounceLog, getSendStats,
} from '../services/compliance.js';

const router = Router();

// GET /api/compliance/config
router.get('/config', verifyAuth, (req, res) => {
  try {
    res.json(getComplianceConfig());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/compliance/config
router.put('/config', verifyAuth, (req, res) => {
  try {
    updateComplianceConfig(req.body);
    res.json(getComplianceConfig());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/unsubscribe-list
router.get('/unsubscribe-list', verifyAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(getUnsubscribeList(limit, offset));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/compliance/unsubscribe-list
router.post('/unsubscribe-list', verifyAuth, (req, res) => {
  try {
    const { email, phone, reason } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'Email or phone required' });
    addToUnsubscribeList(email || '', phone || '', reason || 'Manual', 'manual');
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/compliance/unsubscribe-list/:id
router.delete('/unsubscribe-list/:id', verifyAuth, (req, res) => {
  try {
    const removed = removeFromUnsubscribeList(req.params.id as string);
    if (!removed) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/bounce-log
router.get('/bounce-log', verifyAuth, (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const bounces = getBounceLog(limit);
    res.json(bounces.map((b: any) => ({
      id: b.id,
      email: b.email,
      bounceType: b.bounce_type,
      reason: b.reason,
      executionId: b.execution_id,
      bouncedAt: b.bounced_at,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/compliance/send-stats
router.get('/send-stats', verifyAuth, (req, res) => {
  try {
    res.json(getSendStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
