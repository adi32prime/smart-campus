import express from 'express';
import pool from '../db.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  const role = req.header('X-Role') || req.query.role;
  if (role !== 'Admin') return res.status(403).json({ message: 'Admin role required' });
  next();
}

// GET /api/admin/recent-bookings?limit=100
router.get('/', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  try {
    const [rows] = await pool.query(
      `SELECT
        b.BookingId    AS bookingId,
        b.UserId       AS userId,
        b.ResourceId   AS resourceId,
        r.ResourceName AS resourceName,
        d.DepartmentName AS departmentName,
        b.BookingDate  AS date,
        ts.StartTime   AS startTime,
        ts.EndTime     AS endTime,
        b.Status       AS status
       FROM bookings b
       JOIN resources r ON r.ResourceId = b.ResourceId
       JOIN department d ON d.DepartmentId = r.DepartmentId
JOIN time_slot ts ON ts.SlotId = b.SlotId
       ORDER BY b.BookingId DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    console.error('admin recent-bookings:', err);
    res.status(500).json({ message: 'Failed to fetch recent bookings' });
  }
});

export default router;
