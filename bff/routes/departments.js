import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /api/department
// Returns all department with a resource count for each
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        d.DepartmentId   AS departmentId,
        d.DepartmentName AS departmentName,
        COUNT(r.ResourceId) AS resourceCount
      FROM department d
      LEFT JOIN resources r ON r.DepartmentId = d.DepartmentId
      GROUP BY d.DepartmentId, d.DepartmentName
      ORDER BY d.DepartmentId
    `);

    res.json(rows);
  } catch (err) {
    console.error('GET /api/department error:', err);
    res.status(500).json({ message: 'Failed to fetch department' });
  }
});

export default router;
