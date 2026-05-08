import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { authenticateToken } from './ocorrencias.js';

const router = Router();

// Get current user info
router.get('/me', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;

  try {
    const result = await query(
      'SELECT id, name, email, notifications_enabled, location_enabled FROM "user" WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile (name and email)
router.put('/update', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  const { name, email } = req.body;

  try {
    const result = await query(
      'UPDATE "user" SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email',
      [name, email, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation for email
      return res.status(400).json({ error: 'Email already in use' });
    }
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update password
router.put('/update-password', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  const { currentPassword, newPassword } = req.body;

  try {
    // Check current password
    const userResult = await query('SELECT password FROM "user" WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await query('UPDATE "user" SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update preferences
router.put('/preferences', authenticateToken, async (req: any, res: Response) => {
  const userId = req.user.id;
  const { notifications_enabled, location_enabled } = req.body;

  try {
    const result = await query(
      'UPDATE "user" SET notifications_enabled = $1, location_enabled = $2 WHERE id = $3 RETURNING notifications_enabled, location_enabled',
      [notifications_enabled, location_enabled, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
