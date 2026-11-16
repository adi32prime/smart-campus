import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const sslConfig = process.env.DB_SSL_CA 
  ? { ca: process.env.DB_SSL_CA, rejectUnauthorized: true }
  : (fs.existsSync('./ca.pem') 
      ? { ca: fs.readFileSync('./ca.pem'), rejectUnauthorized: true } 
      : undefined);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'SMARTCAMPUS',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: sslConfig,
});

export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL connected to Aiven:', process.env.DB_HOST);
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    return false;
  }
}

export default pool;