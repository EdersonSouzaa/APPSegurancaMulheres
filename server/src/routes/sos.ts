import { Router, type Response } from 'express';
import { query } from '../db.js';
import { authenticateToken } from './ocorrencias.js';

const router = Router();

// Trigger SOS
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { location } = req.body;
  const userId = req.user.id;

  try {
    const result = await query(
      'INSERT INTO "SOS" (user_id, location) VALUES ($1, $2) RETURNING *',
      [userId, location]
    );
    res.status(201).json({ message: 'SOS triggered successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error triggering SOS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
