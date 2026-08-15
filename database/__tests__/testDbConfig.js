function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'fleet_analytics_test',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'testpassword',
  };
}
 
module.exports = { getDbConfig };