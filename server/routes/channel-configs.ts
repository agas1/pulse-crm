import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// ──────────────────────────────────────
// Types
// ──────────────────────────────────────

interface ChannelConfigRow {
  id: string;
  channel: string;
  config: string;
  enabled: number;
  simulation_mode: number;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────
// Helpers
// ──────────────────────────────────────

function sanitizeConfig(row: ChannelConfigRow, maskSecrets = true) {
  const config = JSON.parse(row.config || '{}');
  if (maskSecrets) {
    for (const key of Object.keys(config)) {
      if (/token|pass|secret/i.test(key) && typeof config[key] === 'string' && config[key].length > 4) {
        config[key] = '****' + config[key].slice(-4);
      }
    }
  }
  return {
    id: row.id,
    channel: row.channel,
    config,
    enabled: Boolean(row.enabled),
    simulationMode: Boolean(row.simulation_mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ──────────────────────────────────────
// Auth middleware
// ──────────────────────────────────────

router.use(verifyAuth);

// ──────────────────────────────────────
// GET / — List all configs (mask sensitive fields)
// ──────────────────────────────────────

router.get('/', (req: AuthRequest, res) => {
  try {
    const configs = db.prepare('SELECT * FROM channel_configs ORDER BY created_at DESC').all() as ChannelConfigRow[];

    res.json({ configs: configs.map((row) => sanitizeConfig(row, true)) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao buscar configuracoes de canal: ${message}` });
  }
});

// ──────────────────────────────────────
// PUT /:channel — Upsert config for a channel
// ──────────────────────────────────────

router.put('/:channel', (req: AuthRequest, res) => {
  try {
    const channel = req.params.channel as string;

    const validChannels = ['smtp', 'whatsapp', 'instagram'];
    if (!validChannels.includes(channel)) {
      res.status(400).json({ error: `Canal invalido. Valores permitidos: ${validChannels.join(', ')}` });
      return;
    }

    const { config, enabled, simulationMode } = req.body;

    if (!config || typeof config !== 'object') {
      res.status(400).json({ error: 'Config e obrigatorio e deve ser um objeto' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const existing = db.prepare('SELECT * FROM channel_configs WHERE channel = ?').get(channel) as ChannelConfigRow | undefined;

    if (existing) {
      const updatedEnabled = enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled;
      const updatedSimulation = simulationMode !== undefined ? (simulationMode ? 1 : 0) : existing.simulation_mode;

      db.prepare(`
        UPDATE channel_configs SET config = ?, enabled = ?, simulation_mode = ?, updated_at = ?
        WHERE channel = ?
      `).run(
        JSON.stringify(config),
        updatedEnabled,
        updatedSimulation,
        now,
        channel,
      );
    } else {
      const id = crypto.randomUUID();
      const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : 0;
      const newSimulation = simulationMode !== undefined ? (simulationMode ? 1 : 0) : 1;

      db.prepare(`
        INSERT INTO channel_configs (id, channel, config, enabled, simulation_mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        channel,
        JSON.stringify(config),
        newEnabled,
        newSimulation,
        now,
        now,
      );
    }

    const updated = db.prepare('SELECT * FROM channel_configs WHERE channel = ?').get(channel) as ChannelConfigRow;

    res.json({ config: sanitizeConfig(updated, true) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao salvar configuracao de canal: ${message}` });
  }
});

// ──────────────────────────────────────
// POST /:channel/test — Test channel connection
// ──────────────────────────────────────

router.post('/:channel/test', (req: AuthRequest, res) => {
  try {
    const channel = req.params.channel as string;

    const validChannels = ['smtp', 'whatsapp', 'instagram'];
    if (!validChannels.includes(channel)) {
      res.status(400).json({ error: `Canal invalido. Valores permitidos: ${validChannels.join(', ')}` });
      return;
    }

    const existing = db.prepare('SELECT * FROM channel_configs WHERE channel = ?').get(channel) as ChannelConfigRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Configuracao de canal nao encontrada' });
      return;
    }

    if (existing.simulation_mode) {
      res.json({ success: true, message: 'Modo simulacao ativo' });
      return;
    }

    // Real mode: will be extended in later etapas
    res.json({ success: true, message: `Teste de conexao para ${channel} sera implementado em breve` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao testar canal: ${message}` });
  }
});

export default router;
