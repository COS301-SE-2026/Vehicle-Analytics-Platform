// e2e/playwright.config.ts
//
// Runs against REAL servers: `webServer` below starts the actual backend
// (Express + Postgres) and the actual frontend (Vite preview) before tests
// run. CI migrates the database BEFORE `npx playwright test` runs -- see
// .github/workflows/e2e.yml.
//
// NODE_ENV is deliberately NOT 'test' here. authenticate() in
// middleware/auth.js branches on NODE_ENV:
//   'test'  -> jwt.verify(token, JWT_SECRET) -- rejects real Cognito
//              tokens outright, since they're signed by AWS's keys, not
//              JWT_SECRET. Breaks the real-login spec after the login step.
//   other   -> jwt.decode(token) (no signature check -- trusts API Gateway
//              to have verified it in production) then looks up
//              users.cognito_sub. Works for BOTH real Cognito logins and
//              self-minted tokens used to skip login in other specs.
// So the backend runs as NODE_ENV=e2e: distinguishable in logs, doesn't
// match either special-cased string, takes the decode-and-lookup path.

import { defineConfig, devices } from '@playwright/test';

const FRONTEND_PORT = 4173; // Vite `preview` default
const BACKEND_PORT = 5000;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, 
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  globalSetup: require.resolve('./global-setup'),

  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run start --prefix ../backend',
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: {
        NODE_ENV: 'e2e',
        PORT: String(BACKEND_PORT),   
        DB_HOST: process.env.DB_HOST ?? 'localhost',
        DB_PORT: process.env.DB_PORT ?? '5432',
        DB_NAME: process.env.DB_NAME ?? 'fleet_analytics_e2e',
        DB_USER: process.env.DB_USER ?? 'admin',
        DB_PASSWORD: process.env.DB_PASSWORD ?? 'testpassword',
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID ?? '',
        COGNITO_REGION: process.env.COGNITO_REGION ?? 'af-south-1',
      },
    },
    {
      command: `npm run build --prefix ../frontend && npm run preview --prefix ../frontend -- --port ${FRONTEND_PORT}`,
      url: `http://localhost:${FRONTEND_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_API_URL: `http://localhost:${BACKEND_PORT}`,
        VITE_MAPBOX_TOKEN: process.env.VITE_MAPBOX_TOKEN ?? '',
      },
    },
  ],
});