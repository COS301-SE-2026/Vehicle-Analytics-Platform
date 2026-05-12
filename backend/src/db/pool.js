const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '13.246.7.45',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fleet_analytics',
  user: process.env.DB_USER || 'fleet_admin',
  password: process.env.DB_PASSWORD || 'Capstone2026',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

module.exports = { pool };
