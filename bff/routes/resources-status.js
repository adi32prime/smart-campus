import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/resources/status?date=YYYY-MM-DD&startTime=HH:MM&endTime=HH:MM
router.get('/', async (req, res) => {
  const { date, startTime, endTime } = req.query;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'date, startTime, endTime are required' });
  }

  try {
    const [slotRows] = await pool.query(
      `SELECT SlotId FROM time_slot WHERE StartTime = ? AND EndTime = ? LIMIT 1`,
      [startTime + ':00', endTime + ':00']
    );
    if (slotRows.length === 0) {
      return res.status(400).json({ message: 'No matching time slot' });
    }
    const slotId = slotRows[0].SlotId;

    const [rows] = await pool.query(
      `SELECT
        l.RoomNumber AS nodeId,
        CASE WHEN b.BookingId IS NULL THEN 'available' ELSE 'occupied' END AS status
       FROM resources r
       JOIN location l ON l.LocationId = r.LocationId
       LEFT JOIN bookings b
         ON b.ResourceId = r.ResourceId
         AND b.SlotId = ?
         AND b.BookingDate = ?
         AND b.Status = 'Confirmed'`,
      [slotId, date]
    );

    const statusMap = {};
    rows.forEach((r) => {
      statusMap[r.nodeId] = r.status;
    });

    res.json({ slotId, date, startTime, endTime, statuses: statusMap });
  } catch (err) {
    console.error('GET /api/resources/status error:', err);
    res.status(500).json({ message: 'Failed to load resource status' });
  }
});

export default router;
