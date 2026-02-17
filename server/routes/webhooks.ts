import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import { processInboundMessage } from '../services/webhook-processor.js';

const router = Router();

// GET /api/webhooks/meta - Meta webhook verification
router.get('/meta', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Get verify token from channel_configs
  const waConfig = db.prepare("SELECT config FROM channel_configs WHERE channel = 'whatsapp' AND enabled = 1").get() as any;
  let verifyToken = process.env.META_VERIFY_TOKEN || 'pulse_verify_123';

  if (waConfig) {
    try {
      const config = JSON.parse(waConfig.config);
      if (config.verifyToken) verifyToken = config.verifyToken;
    } catch { /* use default */ }
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Webhook] Meta verification successful');
    res.status(200).send(challenge);
  } else {
    console.log('[Webhook] Meta verification failed');
    res.sendStatus(403);
  }
});

// POST /api/webhooks/meta - Receive messages from Meta
router.post('/meta', (req: Request, res: Response) => {
  // Always respond 200 immediately (Meta requirement)
  res.sendStatus(200);

  try {
    const body = req.body;

    // WhatsApp Business Account events
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages' && change.value?.messages) {
            for (const message of change.value.messages) {
              processInboundMessage({
                platform: 'whatsapp',
                from: message.from || '',
                messageId: message.id || '',
                text: message.text?.body || message.caption || '',
                timestamp: message.timestamp || '',
                type: message.type || 'text',
              });
            }
          }

          // Handle status updates (delivered, read)
          if (change.field === 'messages' && change.value?.statuses) {
            for (const status of change.value.statuses) {
              handleStatusUpdate('whatsapp', status.id, status.status);
            }
          }
        }
      }
    }

    // Instagram events
    if (body.object === 'instagram') {
      for (const entry of body.entry || []) {
        for (const messaging of entry.messaging || []) {
          if (messaging.message) {
            processInboundMessage({
              platform: 'instagram',
              from: messaging.sender?.id || '',
              messageId: messaging.message.mid || '',
              text: messaging.message.text || '',
              timestamp: String(messaging.timestamp || ''),
              type: 'text',
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[Webhook] Error processing Meta webhook:', err);
  }
});

// Handle delivery/read status updates
function handleStatusUpdate(platform: string, externalId: string, newStatus: string) {
  if (!externalId || !newStatus) return;

  const statusMap: Record<string, string> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'opened',
  };

  const mappedStatus = statusMap[newStatus];
  if (!mappedStatus) return;

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  try {
    if (mappedStatus === 'opened') {
      db.prepare(`
        UPDATE cadence_step_executions
        SET status = 'opened', opened_at = CASE WHEN opened_at IS NULL THEN ? ELSE opened_at END
        WHERE external_id = ?
      `).run(now, externalId);
    } else {
      db.prepare(`
        UPDATE cadence_step_executions SET status = ? WHERE external_id = ? AND status = 'sent'
      `).run(mappedStatus, externalId);
    }
  } catch {
    // Best effort
  }
}

export default router;
