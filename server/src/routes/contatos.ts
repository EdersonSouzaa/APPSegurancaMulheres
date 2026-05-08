import { Router, type Response } from 'express';
import { query } from '../db.js';
import { authenticateToken } from './ocorrencias.js';

const router = Router();

// Create Contato
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { name, phone } = req.body;
  const userId = req.user.id;

  try {
    const result = await query(
      'INSERT INTO "contatos" (user_id, name, phone) VALUES ($1, $2, $3) RETURNING *',
      [userId, name, phone]
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
    const result = await query('SELECT * FROM "contatos" WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching contatos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Contato
router.put('/:id', authenticateToken, async (req: any, res: Response) => {
  const { id } = req.params;
  const { name, phone } = req.body;
  const userId = req.user.id;

  try {
    const result = await query(
      'UPDATE "contatos" SET name = $1, phone = $2 WHERE id = $3 AND user_id = $4 RETURNING *',
      [name, phone, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contato not found or unauthorized' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating contato:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete Contato
router.delete('/:id', authenticateToken, async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const result = await query(
      'DELETE FROM "contatos" WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contato not found or unauthorized' });
    }

    res.json({ message: 'Contato deleted successfully' });
  } catch (error) {
    console.error('Error deleting contato:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
