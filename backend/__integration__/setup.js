require('dotenv').config({ path: require('path').join(__dirname, '../.env.test') });

const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missing = required.filter((k) => !process.env[k]);

if (missing.length) {
  throw new Error(
    `Integration tests require a real database. Missing: ${missing.join(', ')}`
  );
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jwt_validation';

jest.setTimeout(30000);