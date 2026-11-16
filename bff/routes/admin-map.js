import express from 'express';
import pool from '../db.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  const role = req.header('X-Role') || req.query.role;
  if (role !== 'Admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  next();
}

router.get('/', requireAdmin, async (req, res) => {
  const { date, startTime, endTime } = req.query;

  if (!date || !startTime || !endTime) {
    return res.status(400).json({ message: 'date, startTime, endTime are required' });
  }

  try {
    // Find the slotId that matches this time window
    const [slotRows] = await pool.query(
      `SELECT SlotId FROM time_slot WHERE StartTime = ? AND EndTime = ? LIMIT 1`,
      [startTime + ':00', endTime + ':00']
    );

    if (slotRows.length === 0) {
      return res.status(400).json({ message: `No time slot matches ${startTime} - ${endTime}` });
    }

    const slotId = slotRows[0].SlotId;

    // Fetch all resources with their current occupancy for this slot
    const [resources] = await pool.query(
      `SELECT
        r.ResourceId AS resourceId,
        r.ResourceName AS resourceName,
        r.Capacity AS capacity,
        d.DepartmentName AS departmentName,
        rt.TypeName AS typeName,
        l.RoomNumber AS nodeId,
        b.BookingId AS bookingId,
        b.UserId AS userId,
        u.Role AS userRole,
        b.Status AS bookingStatus
      FROM resources r
      JOIN department d ON d.DepartmentId = r.DepartmentId
      JOIN resource_type rt ON rt.TypeId = r.TypeId
      JOIN location l ON l.LocationId = r.LocationId
      LEFT JOIN bookings b
        ON b.ResourceId = r.ResourceId
        AND b.SlotId = ?
        AND b.BookingDate = ?
        AND b.Status = 'Confirmed'
      LEFT JOIN users u ON u.UserId = b.UserId
      ORDER BY r.ResourceId`,
      [slotId, date]
    );

    // Annotate each resource with status + bookedBy
    const annotated = resources.map((row) => {
      const isOccupied = !!row.bookingId;
      return {
        resourceId: row.resourceId,
        resourceName: row.resourceName,
        capacity: row.capacity,
        departmentName: row.departmentName,
        typeName: row.typeName,
        nodeId: row.nodeId,
        status: isOccupied ? 'Occupied' : 'Available',
        booking: isOccupied
          ? {
              bookingId: row.bookingId,
              userId: row.userId,
              userRole: row.userRole,
            }
          : null,
      };
    });

    res.json({ slotId, date, startTime, endTime, resources: annotated });
  } catch (err) {
    console.error('GET /api/admin/map-status error:', err);
    res.status(500).json({ message: 'Failed to load map status' });
  }
});

export default router;
