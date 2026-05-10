const fs = require('fs');
const path = require('path');

function readEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf8');
  return content
    .split(/\r?\n/)
    .filter(line => line && !line.startsWith('#'))
    .reduce((accumulator, line) => {
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) {
        return accumulator;
      }

      const key = line.slice(0, equalsIndex).trim();
      const value = line.slice(equalsIndex + 1).trim();
      accumulator[key] = value;
      return accumulator;
    }, {});
}

const rootEnv = readEnvFile(path.resolve(__dirname, '../.env'));

function getDbConfig(databaseName = 'fleet_analytics') {
  return {
    host: 'localhost',
    port: 5432,
    database: databaseName,
    user: 'admin',
    password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || rootEnv.DB_PASSWORD || 'localdev',
  };
}

module.exports = { getDbConfig };
