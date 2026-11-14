import express from 'express';
import pool from '../db.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  const role = req.header('X-Role') || req.query.role;
  if (role !== 'Admin') return res.status(403).json({ message: 'Admin role required' });
  next();
}

// GET /api/admin/stats
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [[deptRow]] = await pool.query(`SELECT COUNT(*) AS c FROM department`);
    const [[resRow]] = await pool.query(`SELECT COUNT(*) AS c FROM resources`);
    const [[userRow]] = await pool.query(`SELECT COUNT(*) AS c FROM users`);
    const [[bookRow]] = await pool.query(`SELECT COUNT(*) AS c FROM bookings`);

    res.json({
      totalDepartments: deptRow.c,
      totalResources: resRow.c,
      totalUsers: userRow.c,
      totalBookings: bookRow.c,
    });
  } catch (err) {
    console.error('admin stats:', err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

// GET /api/admin/resources/status
router.get('/resources/status', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        r.ResourceId     AS resourceId,
        r.ResourceName   AS resourceName,
        r.Status         AS status,
        d.DepartmentName AS departmentName,
        rt.TypeName      AS typeName
      FROM resources r
      JOIN department d ON d.DepartmentId = r.DepartmentId
      JOIN resource_type rt ON rt.TypeId = r.TypeId
      ORDER BY d.DepartmentName, r.ResourceName
    `);
    res.json(rows);
  } catch (err) {
    console.error('admin resources status:', err);
    res.status(500).json({ message: 'Failed to load resource status' });
  }
});

// GET /api/admin/reports?range=7d|30d|90d
router.get('/reports', requireAdmin, async (req, res) => {
  const range = String(req.query.range || '30d').toLowerCase();



  try {
    let days;
    let startDate;
    let endDate;

    if (range === 'month') {
      const [[row]] = await pool.query(
        `SELECT DATE_FORMAT(CURDATE(), '%Y-%m-01') AS startDate, CURDATE() AS endDate`
      );
      startDate = row.startDate;
      endDate = row.endDate;
      days = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000));
    } else {
      days = range === '90d' ? 90 : range === '7d' ? 7 : 30;
      const [[row]] = await pool.query(
        `SELECT DATE_SUB(CURDATE(), INTERVAL ? DAY) AS startDate, CURDATE() AS endDate`,
        [days]
      );
      startDate = row.startDate;
      endDate = row.endDate;
    }

    // Previous period: same length window right before startDate
    const [[prevRow]] = await pool.query(
      `SELECT DATE_SUB(CURDATE(), INTERVAL ? DAY) AS prevStart,
              DATE_SUB(CURDATE(), INTERVAL ? DAY) AS prevEnd`,
      [days * 2, days + 1]
    );

    // --- Active resources count (for utilization) ---
    const [[activeResRow]] = await pool.query(
      `SELECT COUNT(*) AS c FROM resources WHERE Status = 'Available'`
    );
    const activeResources = activeResRow.c || 1;

    // --- Slot count (usually 8) ---
    const [[slotRow]] = await pool.query(`SELECT COUNT(*) AS c FROM time_slot`);
    const slots = slotRow.c || 8;

    // ------------------------------------------------------------------
    // KPI 1: Total Bookings + Confirmed + previous period
    // ------------------------------------------------------------------
    const [[kpi1]] = await pool.query(
      `SELECT
        SUM(BookingDate BETWEEN ? AND ?)                                        AS currentTotal,
        SUM(BookingDate BETWEEN ? AND ? AND Status='Confirmed')                 AS confirmed,
        SUM(BookingDate BETWEEN ? AND ?)                                        AS prevTotal
      FROM bookings
      WHERE BookingDate BETWEEN ? AND ?`,
      [startDate, endDate, startDate, endDate, prevRow.prevStart, prevRow.prevEnd, prevRow.prevStart, endDate]
    );

    // ------------------------------------------------------------------
    // KPI 2: True Slot Utilization %
    // ------------------------------------------------------------------
    const [[kpi2]] = await pool.query(
      `SELECT ROUND(100 * COUNT(b.BookingId) /
        ((SELECT COUNT(*) FROM resources WHERE Status='Available') * ? * ?), 1) AS utilPct
       FROM bookings b
       JOIN resources r ON r.ResourceId = b.ResourceId AND r.Status='Available'
       WHERE b.Status='Confirmed' AND b.BookingDate BETWEEN ? AND ?`,
      [slots, days, startDate, endDate]
    );

    // ------------------------------------------------------------------
    // KPI 3: Pending Actions (live, not range-bound)
    // ------------------------------------------------------------------
    const [[kpi3]] = await pool.query(
      `SELECT
        SUM(Status='Pending') AS pending,
        SUM(Status='Waitlisted') AS waitlisted
       FROM bookings WHERE BookingDate >= CURDATE()`
    );

    // ------------------------------------------------------------------
    // KPI 4: Cancellation Rate %
    // ------------------------------------------------------------------
    const [[kpi4]] = await pool.query(
      `SELECT ROUND(100 * SUM(Status='Cancelled') / NULLIF(COUNT(*), 0), 1) AS cancelPct
       FROM bookings WHERE BookingDate BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    // ------------------------------------------------------------------
    // Trend: zero-filled days, split Confirmed vs Cancelled
    // Generate the date series in SQL using a UNION trick (MySQL 8 safe)
    // ------------------------------------------------------------------
    const [trendRows] = await pool.query(
      `WITH RECURSIVE days AS (
         SELECT ? AS d
         UNION ALL
         SELECT DATE_ADD(d, INTERVAL 1 DAY) FROM days WHERE d < ?
       )
       SELECT
         days.d AS date,
         COUNT(CASE WHEN b.Status='Confirmed' THEN 1 END) AS confirmed,
         COUNT(CASE WHEN b.Status='Cancelled' THEN 1 END) AS cancelled,
         COUNT(b.BookingId) AS total
       FROM days
       LEFT JOIN bookings b ON b.BookingDate = days.d
       GROUP BY days.d
       ORDER BY days.d ASC`,
      [startDate, endDate]
    );

    // ------------------------------------------------------------------
    // Hourly distribution (Confirmed only, zero-fill all 8 slots)
    // ------------------------------------------------------------------
    const [hourlyRows] = await pool.query(
      `SELECT ts.SlotId AS slotId, ts.StartTime AS startTime, ts.EndTime AS endTime,
              COUNT(b.BookingId) AS confirmed
       FROM time_slot ts
       LEFT JOIN bookings b
         ON b.SlotId = ts.SlotId
         AND b.Status = 'Confirmed'
         AND b.BookingDate BETWEEN ? AND ?
       GROUP BY ts.SlotId
       ORDER BY ts.SlotId`,
      [startDate, endDate]
    );

    // ------------------------------------------------------------------
    // Status breakdown (donut chart)
    // ------------------------------------------------------------------
    const [statusRows] = await pool.query(
      `SELECT Status AS status, COUNT(*) AS count
       FROM bookings
       WHERE BookingDate BETWEEN ? AND ?
       GROUP BY Status`,
      [startDate, endDate]
    );

    // ------------------------------------------------------------------
    // By Resource Type (Confirmed only, LEFT JOINs so all types appear)
    // ------------------------------------------------------------------
    const [typeRows] = await pool.query(
      `SELECT rt.TypeName AS typeName, COUNT(b.BookingId) AS confirmed
       FROM resource_type rt
       LEFT JOIN resources r ON r.TypeId = rt.TypeId AND r.Status='Available'
       LEFT JOIN bookings b
         ON b.ResourceId = r.ResourceId
         AND b.Status = 'Confirmed'
         AND b.BookingDate BETWEEN ? AND ?
       GROUP BY rt.TypeId
       ORDER BY rt.TypeId`,
      [startDate, endDate]
    );

    // ------------------------------------------------------------------
    // By Department (with confirmed count + true utilization per dept)
    // ------------------------------------------------------------------
    const [deptRows] = await pool.query(
      `SELECT d.DepartmentName AS departmentName,
              COUNT(b.BookingId) AS confirmed,
              COUNT(DISTINCT r.ResourceId) AS resourceCount,
              ROUND(100 * COUNT(b.BookingId) /
                    NULLIF(COUNT(DISTINCT r.ResourceId) * ? * ?, 0), 1) AS utilPct
       FROM department d
       LEFT JOIN resources r ON r.DepartmentId = d.DepartmentId AND r.Status='Available'
       LEFT JOIN bookings b
         ON b.ResourceId = r.ResourceId
         AND b.Status = 'Confirmed'
         AND b.BookingDate BETWEEN ? AND ?
       GROUP BY d.DepartmentId
       ORDER BY confirmed DESC`,
      [slots, days, startDate, endDate]
    );

    // ------------------------------------------------------------------
    // Top 5 resources by confirmed bookings
    // ------------------------------------------------------------------
    const [topResourceRows] = await pool.query(
      `SELECT r.ResourceId AS resourceId,
              r.ResourceName AS resourceName,
              rt.TypeName AS typeName,
              d.DepartmentName AS departmentName,
              COALESCE(SUM(b.Status='Confirmed'), 0) AS confirmed,
              COALESCE(SUM(b.Status IN ('Waitlisted','Rejected')), 0) AS unmet,
              ROUND(100 * COALESCE(SUM(b.Status='Confirmed'), 0) / (? * ?), 1) AS utilPct
       FROM resources r
       JOIN resource_type rt ON rt.TypeId = r.TypeId
       JOIN department d ON d.DepartmentId = r.DepartmentId
       LEFT JOIN bookings b
         ON b.ResourceId = r.ResourceId
         AND b.BookingDate BETWEEN ? AND ?
       WHERE r.Status = 'Available'
       GROUP BY r.ResourceId
       ORDER BY confirmed DESC, unmet DESC
       LIMIT 5`,
      [slots, days, startDate, endDate]
    );

    // ------------------------------------------------------------------
    // Peak hour (kept for a chip in the chart header)
    // ------------------------------------------------------------------
    const [peakHourRows] = await pool.query(
      `SELECT HOUR(ts.StartTime) AS hour, COUNT(*) AS c
       FROM bookings b
       JOIN time_slot ts ON ts.SlotId = b.SlotId
       WHERE b.Status='Confirmed' AND b.BookingDate BETWEEN ? AND ?
       GROUP BY HOUR(ts.StartTime)
       ORDER BY c DESC LIMIT 1`,
      [startDate, endDate]
    );

    res.json({
      range,
      days,
      startDate,
      endDate,
      // KPI cards
      totalBookings: Number(kpi1.currentTotal || 0),
      confirmedBookings: Number(kpi1.confirmed || 0),
      previousTotal: Number(kpi1.prevTotal || 0),
      utilPct: Number(kpi2?.utilPct || 0),
      pendingCount: Number(kpi3?.pending || 0),
      waitlistedCount: Number(kpi3?.waitlisted || 0),
      cancelPct: Number(kpi4?.cancelPct || 0),
      // Charts
      trend: trendRows.map((r) => ({
        date: r.date,
        confirmed: Number(r.confirmed),
        cancelled: Number(r.cancelled),
        total: Number(r.total),
      })),
      hourly: hourlyRows.map((r) => ({
        slotId: r.slotId,
        startTime: r.startTime,
        endTime: r.endTime,
        confirmed: Number(r.confirmed),
      })),
      peakHour: peakHourRows.length ? Number(peakHourRows[0].hour) : null,
      statusBreakdown: statusRows.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
      byResourceType: typeRows.map((r) => ({
        name: r.typeName,
        count: Number(r.confirmed),
      })),
      byDepartment: deptRows.map((r) => ({
        name: r.departmentName,
        count: Number(r.confirmed),
        resourceCount: Number(r.resourceCount),
        utilPct: Number(r.utilPct || 0),
      })),
      topResources: topResourceRows.map((r) => ({
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        typeName: r.typeName,
        departmentName: r.departmentName,
        confirmed: Number(r.confirmed),
        unmet: Number(r.unmet),
        utilPct: Number(r.utilPct || 0),
      })),
    });
  } catch (err) {
    console.error('admin reports:', err);
    res.status(500).json({ message: 'Failed to load reports' });
  }
});

export default router;