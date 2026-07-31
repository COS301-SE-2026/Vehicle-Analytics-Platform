// Extend default test timeout for async DB/endpoint operations
jest.setTimeout(30000);

// --- Environment Setup ---
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jwt_validation';
process.env.COGNITO_REGION = process.env.COGNITO_REGION || 'af-south-1';
process.env.COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'test-pool-id';
process.env.COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || 'test-client-id';

// Ensure DB env vars have safe defaults so tests don't fail when missing
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    process.env[varName] = `mock_${varName.toLowerCase()}`;
  }
});

// --- Silence Expected Console Noise ---
let consoleErrorSpy;
let consoleLogSpy;

beforeAll(() => {
  // Suppress intentional controller error logs (e.g. "Get vehicles list error:")
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  // Suppress verbose auth middleware logs (e.g. "NODE_ENV = test")
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(async () => {
  // Restore original console behavior
  consoleErrorSpy.mockRestore();
  consoleLogSpy.mockRestore();

  // Give active handles a brief moment to close
  await new Promise((resolve) => setTimeout(resolve, 500));
});

// --- Sanity Check ---
describe('Jest Setup Verification', () => {
  test('setup file loads correctly', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});