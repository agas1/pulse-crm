import { Router, type Response } from 'express';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';
import * as ai from '../integrations/ai-copywriter.js';

const router = Router();
router.use(verifyAuth);

// POST /api/ai/generate-message
router.post('/generate-message', async (req: AuthRequest, res: Response) => {
  try {
    const { type, context, tone, previousMessages } = req.body;

    if (!context || !context.nome) {
      res.status(400).json({ error: 'Contexto com "nome" e obrigatorio' });
      return;
    }

    let result;
    switch (type) {
      case 'email':
        result = await ai.generateEmail(context, tone || 'consultivo');
        break;
      case 'whatsapp':
        result = await ai.generateWhatsAppMessage(context);
        break;
      case 'follow_up':
        result = await ai.generateFollowUp(context, previousMessages || []);
        break;
      default:
        res.status(400).json({ error: 'Tipo invalido. Use: email, whatsapp, follow_up' });
        return;
    }

    if (!result) {
      res.status(503).json({ error: 'IA indisponivel. Verifique ANTHROPIC_API_KEY no .env' });
      return;
    }

    res.json({ generated: result });
  } catch (err) {
    console.error('[AI Route] generate-message error:', err);
    res.status(500).json({ error: 'Erro ao gerar mensagem' });
  }
});

// POST /api/ai/suggest-next-step
router.post('/suggest-next-step', async (req: AuthRequest, res: Response) => {
  try {
    const { context, history } = req.body;

    if (!context || !context.nome) {
      res.status(400).json({ error: 'Contexto com "nome" e obrigatorio' });
      return;
    }

    const result = await ai.suggestNextStep(context, history || []);

    if (!result) {
      res.status(503).json({ error: 'IA indisponivel' });
      return;
    }

    res.json({ suggestion: result });
  } catch (err) {
    console.error('[AI Route] suggest error:', err);
    res.status(500).json({ error: 'Erro ao sugerir proximo passo' });
  }
});

// POST /api/ai/generate-cadence
router.post('/generate-cadence', async (req: AuthRequest, res: Response) => {
  try {
    const { nicho, dor, numSteps } = req.body;

    if (!nicho) {
      res.status(400).json({ error: 'Campo "nicho" e obrigatorio' });
      return;
    }

    const result = await ai.generateCadenceSteps(nicho, dor || '', numSteps || 5);

    if (!result) {
      res.status(503).json({ error: 'IA indisponivel. Verifique ANTHROPIC_API_KEY no .env' });
      return;
    }

    res.json({ cadence: result });
  } catch (err) {
    console.error('[AI Route] generate-cadence error:', err);
    res.status(500).json({ error: 'Erro ao gerar cadencia' });
  }
});

export default router;
