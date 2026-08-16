
const config = {


  host: process.env.DB_HOST || '16.28.17.33',

  port: parseInt(process.env.DB_PORT || '6432', 10),

  database: process.env.DB_NAME || 'fleet_analytics',

  user: process.env.DB_USER || 'fleet_admin',

  password: process.env.DB_PASSWORD || 'Capstone26',

  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,

};



module.exports = config;

