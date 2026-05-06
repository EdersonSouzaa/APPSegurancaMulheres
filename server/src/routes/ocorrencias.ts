import { Router, type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = Router();

// Auth Middleware
export const authenticateToken = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Create Ocorrencia
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { title, description, location } = req.body;
  const userId = req.user.id;

  try {
    const result = await query(
      'INSERT INTO "ocorrencia" (user_id, title, description, location) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, description, location]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ocorrencia:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List Ocorrencias (user's own)
router.get('/', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  try {
    const result = await query('SELECT * FROM "ocorrencia" WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ocorrencias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
