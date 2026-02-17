import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import contactRoutes from './routes/contacts.js';
import dealRoutes from './routes/deals.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activities.js';
import emailRoutes from './routes/emails.js';
import automationRoutes from './routes/automations.js';
import scheduledActivityRoutes from './routes/scheduled-activities.js';
import leadRoutes from './routes/leads.js';
import organizationRoutes from './routes/organizations.js';
import dashboardRoutes from './routes/dashboard.js';
import cadenceRoutes from './routes/cadences.js';
import channelConfigRoutes from './routes/channel-configs.js';
import trackingRoutes from './routes/tracking.js';
import webhookRoutes from './routes/webhooks.js';
import aiRoutes from './routes/ai.js';
import leadScoringRoutes from './routes/lead-scoring.js';
import replyClassificationRoutes from './routes/reply-classification.js';
import unsubscribeRoutes from './routes/unsubscribe.js';
import complianceRoutes from './routes/compliance.js';
import { startCadenceWorker } from './cadence-worker.js';
import cron from 'node-cron';
import { applyDailyDecay } from './services/lead-scoring.js';

const app = express();
const PORT = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin.includes(',') ? corsOrigin.split(',').map(s => s.trim()) : corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes (no auth)
app.use('/api/track', trackingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/unsubscribe', unsubscribeRoutes);

// Authenticated routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/scheduled-activities', scheduledActivityRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cadences', cadenceRoutes);
app.use('/api/channel-configs', channelConfigRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/lead-scoring', leadScoringRoutes);
app.use('/api/reply-classification', replyClassificationRoutes);
app.use('/api/compliance', complianceRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 PulseCRM API running on http://localhost:${PORT}`);
  startCadenceWorker();

  // Daily score decay at 2am
  cron.schedule('0 2 * * *', () => {
    try { applyDailyDecay(); } catch (e) { console.error('[Score Decay] Error:', e); }
  });
  console.log('[Lead Scoring] Daily decay cron scheduled (2am)');
});
