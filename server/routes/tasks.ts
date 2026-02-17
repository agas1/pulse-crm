import { Router } from 'express';
import crypto from 'crypto';
import db from '../db.js';
import { verifyAuth, type AuthRequest } from '../middleware/auth.js';
import { evaluateAutomations } from '../automation-engine.js';

const router = Router();

interface TaskRow {
  id: string;
  title: string;
  description: string;
  contact_id: string | null;
  contact_name: string;
  due_date: string;
  due_time: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  type: 'follow_up' | 'call' | 'meeting' | 'email' | 'other';
  assigned_to: string;
  automated: number;
  created_at: string;
  updated_at: string;
}

function sanitizeTask(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    contactId: row.contact_id,
    contactName: row.contact_name,
    dueDate: row.due_date,
    dueTime: row.due_time,
    priority: row.priority,
    status: row.status,
    type: row.type,
    assignedTo: row.assigned_to,
    automated: Boolean(row.automated),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// All routes require authentication
router.use(verifyAuth);

// GET /api/tasks — list tasks with filters
router.get('/', (req: AuthRequest, res) => {
  const { status, priority, assignedTo, search } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Ownership filtering: sellers see only their own tasks
  if (req.auth!.role === 'seller') {
    conditions.push('assigned_to = ?');
    params.push(req.auth!.userId);
  }

  if (status && typeof status === 'string') {
    conditions.push('status = ?');
    params.push(status);
  }

  if (priority && typeof priority === 'string') {
    conditions.push('priority = ?');
    params.push(priority);
  }

  if (assignedTo && typeof assignedTo === 'string') {
    conditions.push('assigned_to = ?');
    params.push(assignedTo);
  }

  if (search && typeof search === 'string') {
    conditions.push('(title LIKE ? OR description LIKE ? OR contact_name LIKE ?)');
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `SELECT * FROM tasks ${where} ORDER BY due_date ASC, due_time ASC`;

  const tasks = db.prepare(sql).all(...params) as TaskRow[];

  res.json({ tasks: tasks.map(sanitizeTask) });
});

// POST /api/tasks — create task
router.post('/', (req: AuthRequest, res) => {
  const {
    title,
    description,
    contactId,
    contactName,
    dueDate,
    dueTime,
    priority,
    status,
    type,
    assignedTo,
    automated,
  } = req.body;

  if (!title || !dueDate) {
    res.status(400).json({ error: 'Titulo e data de vencimento sao obrigatorios' });
    return;
  }

  try {
    const validPriorities = ['low', 'medium', 'high'];
    const validStatuses = ['pending', 'in_progress', 'completed'];
    const validTypes = ['follow_up', 'call', 'meeting', 'email', 'other'];

    const id = crypto.randomUUID();
    const taskPriority = validPriorities.includes(priority) ? priority : 'medium';
    const taskStatus = validStatuses.includes(status) ? status : 'pending';
    const taskType = validTypes.includes(type) ? type : 'other';

    // Validate assignedTo exists in users table; fallback to authenticated user
    let taskAssignedTo = req.auth!.userId;
    if (assignedTo) {
      const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(assignedTo);
      if (userExists) taskAssignedTo = assignedTo;
    }

    const taskAutomated = automated ? 1 : 0;

    db.prepare(`
      INSERT INTO tasks (id, title, description, contact_id, contact_name, due_date, due_time, priority, status, type, assigned_to, automated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      title.trim(),
      (description || '').trim(),
      contactId || null,
      (contactName || '').trim(),
      dueDate,
      dueTime || null,
      taskPriority,
      taskStatus,
      taskType,
      taskAssignedTo,
      taskAutomated,
    );

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;

    res.status(201).json({ task: sanitizeTask(task) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao criar tarefa: ${message}` });
  }
});

// PUT /api/tasks/:id — update task
router.put('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Tarefa nao encontrada' });
    return;
  }

  try {
    const {
      title,
      description,
      contactId,
      contactName,
      dueDate,
      dueTime,
      priority,
      status,
      type,
      assignedTo,
      automated,
    } = req.body;

    const validPriorities = ['low', 'medium', 'high'];
    const validStatuses = ['pending', 'in_progress', 'completed'];
    const validTypes = ['follow_up', 'call', 'meeting', 'email', 'other'];

    const updates = {
      title: title?.trim() || existing.title,
      description: description !== undefined ? (description || '').trim() : existing.description,
      contact_id: contactId !== undefined ? (contactId || null) : existing.contact_id,
      contact_name: contactName !== undefined ? (contactName || '').trim() : existing.contact_name,
      due_date: dueDate || existing.due_date,
      due_time: dueTime !== undefined ? (dueTime || null) : existing.due_time,
      priority: validPriorities.includes(priority) ? priority : existing.priority,
      status: validStatuses.includes(status) ? status : existing.status,
      type: validTypes.includes(type) ? type : existing.type,
      assigned_to: assignedTo || existing.assigned_to,
      automated: automated !== undefined ? (automated ? 1 : 0) : existing.automated,
    };

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, contact_id = ?, contact_name = ?, due_date = ?, due_time = ?,
          priority = ?, status = ?, type = ?, assigned_to = ?, automated = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      updates.title,
      updates.description,
      updates.contact_id,
      updates.contact_name,
      updates.due_date,
      updates.due_time,
      updates.priority,
      updates.status,
      updates.type,
      updates.assigned_to,
      updates.automated,
      id,
    );

    // Auto-create activity when status changes to 'completed'
    if (updates.status === 'completed' && existing.status !== 'completed') {
      const activityId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO activities (id, type, description, contact_name, contact_id, date, meta)
        VALUES (?, ?, ?, ?, ?, datetime('now'), ?)
      `).run(
        activityId,
        'task_done',
        `Tarefa concluida: ${updates.title}`,
        updates.contact_name,
        updates.contact_id,
        null,
      );
    }

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;

    // Disparar automações quando tarefa é concluída
    if (updates.status === 'completed' && existing.status !== 'completed') {
      try {
        evaluateAutomations({ type: 'task_completed', data: task as unknown as Record<string, unknown>, userId: req.auth!.userId });
      } catch (autoErr) {
        console.error('[Automação] Erro ao processar evento task_completed:', autoErr);
      }
    }

    res.json({ task: sanitizeTask(task) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao atualizar tarefa: ${message}` });
  }
});

// DELETE /api/tasks/:id — delete task
router.delete('/:id', (req: AuthRequest, res) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Tarefa nao encontrada' });
    return;
  }

  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ message: 'Tarefa removida com sucesso' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    res.status(500).json({ error: `Erro ao remover tarefa: ${message}` });
  }
});

export default router;
