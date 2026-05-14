import { Router, type Response } from 'express';
import { query } from '../db.js';
import { authenticateToken } from './ocorrencias.js';

const router = Router();

// Create Contato
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { name, phone, emergencial } = req.body;
  const userId = req.user.id;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const result = await query(
     'INSERT INTO "contatos" (user_id, name, phone, emergencial) VALUES ($1, $2, $3, $4) RETURNING *',
[userId, name, phone, emergencial ?? false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating contato:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List Contatos
router.get('/', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  try {
    const result = await query(
      'SELECT * FROM "contatos" WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contatos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Contato
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  const contatoId = Number(req.params.id);
  const { name, phone, emergencial } = req.body;

  if (!Number.isInteger(contatoId)) {
    return res.status(400).json({ error: 'Invalid contact id' });
  }

  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone are required' });
  }

  try {
    const result = await query(
      'UPDATE "contatos" SET name = $1, phone = $2, emergencial = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [name, phone, emergencial ?? false, contatoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contato:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Contato
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  const contatoId = Number(req.params.id);

  if (!Number.isInteger(contatoId)) {
    return res.status(400).json({ error: 'Invalid contact id' });
  }

  try {
    const result = await query(
      'DELETE FROM "contatos" WHERE id = $1 AND user_id = $2 RETURNING *',
      [contatoId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting contato:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
