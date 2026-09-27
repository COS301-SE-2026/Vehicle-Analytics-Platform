// backend/src/db/pool.js

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number.parseInt(process.env.DB_PORT || '6432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Resilience settings so the pool survives brief DB / PgBouncer blips.
  // Without these, a single failed burst can leave all connections stuck
  // and every subsequent query times out until the process is restarted.
  max: 10,                         // was 5 - more headroom for concurrent queries
  idleTimeoutMillis: 60000,        // keep idle connections alive longer
  connectionTimeoutMillis: 15000,  // was 5000 - give a slow pooler more time
  keepAlive: true,                 // TCP keepalive so the remote pooler doesn't drop silently
  maxUses: 7500,                   // rotate connections periodically

  ssl: false,
});

// Log idle-client errors so we can see when the pool is being stressed
pool.on('error', (err) => {
  console.error('Unexpected error on idle DB client:', err.message);
});

module.exports = { pool };
