module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/__integration__'],
  testMatch: ['**/*.integration.test.js'],
  setupFilesAfterEnv: ['<rootDir>/__integration__/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1,
  collectCoverageFrom: ['src/**/*.js'],
};