import { Router, type Response, type NextFunction } from 'express';
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

const ALLOWED_TYPES = ['error', 'warning'] as const;
type OccurrenceType = typeof ALLOWED_TYPES[number];

const isValidType = (t: any): t is OccurrenceType => ALLOWED_TYPES.includes(t);
const isValidLatitude = (n: any) => typeof n === 'number' && Number.isFinite(n) && n >= -90 && n <= 90;
const isValidLongitude = (n: any) => typeof n === 'number' && Number.isFinite(n) && n >= -180 && n <= 180;

// Create Ocorrencia
router.post('/', authenticateToken, async (req: any, res: Response) => {
  const { title, description, location, type, latitude, longitude } = req.body;
  const userId = req.user.id;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }
  if (type !== undefined && !isValidType(type)) {
    return res.status(400).json({ error: "Type must be 'error' or 'warning'" });
  }
  if (latitude !== undefined && latitude !== null && !isValidLatitude(latitude)) {
    return res.status(400).json({ error: 'Invalid latitude' });
  }
  if (longitude !== undefined && longitude !== null && !isValidLongitude(longitude)) {
    return res.status(400).json({ error: 'Invalid longitude' });
  }

  try {
    const result = await query(
      `INSERT INTO "ocorrencia" (user_id, title, description, location, type, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, title, description, location ?? null, type ?? 'error', latitude ?? null, longitude ?? null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ocorrencia:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all Ocorrencias — community feed for the "Gerais" tab
router.get('/', authenticateToken, async (_req: any, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM "ocorrencia" ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ocorrencias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List nearby Ocorrencias — community feed for the "Proximas" tab.
router.get('/proximas', authenticateToken, async (req: any, res: Response) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = req.query.radius !== undefined ? Number(req.query.radius) : 1000;

  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params are required' });
  }
  if (!Number.isFinite(radius) || radius <= 0) {
    return res.status(400).json({ error: 'radius must be a positive number (meters)' });
  }

  try {
    const result = await query(
      `SELECT * FROM (
         SELECT *, (
           6371000 * acos(
             LEAST(1.0,
               cos(radians($1::float8)) * cos(radians(latitude)) *
               cos(radians(longitude) - radians($2::float8)) +
               sin(radians($1::float8)) * sin(radians(latitude))
             )
           )
         ) AS distance
         FROM "ocorrencia"
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       ) sub
       WHERE distance <= $3
       ORDER BY distance ASC`,
      [lat, lng, radius]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching nearby ocorrencias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
