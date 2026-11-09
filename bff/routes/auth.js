import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// POST /api/auth/login
// Body: { role, userId, password }
router.post('/login', async (req, res) => {
  const { role, userId, password } = req.body || {};

  // --- Validate input ---
  if (!role || !userId || !password) {
    return res.status(400).json({ message: 'Role, User ID, and password are required' });
  }

  if (!['Student', 'Faculty', 'Admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  const uid = Number(userId);
  if (!Number.isInteger(uid)) {
    return res.status(400).json({ message: 'User ID must be numeric' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT UserId, Password, Role, Status FROM USERS WHERE UserId = ? LIMIT 1',
      [uid]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'User not found' });
    }

    const user = rows[0];

    // --- Status check ---
    if (user.Status !== 'Active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    // --- Role match check ---
    if (user.Role !== role) {
      return res.status(401).json({ message: `This account is not a ${role}` });
    }
    // --- Password check ---
    let isMatch = false;

    // Check if the stored password is a bcrypt hash (starts with $2a$ or $2b$)
    if (user.Password.startsWith('$2a$') || user.Password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(String(password), user.Password);
    } else {
      // Fallback for the original seeded demo accounts (plain text)
      isMatch = String(user.Password) === String(password);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // --- Issue JWT ---
    const token = jwt.sign(
      { userId: user.UserId, role: user.Role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    res.json({
      token,
      user: {
        userId: user.UserId,
        role: user.Role,
        status: user.Status,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;