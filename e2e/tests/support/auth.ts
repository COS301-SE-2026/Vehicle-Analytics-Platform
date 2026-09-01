import jwt from 'jsonwebtoken';
import type { Page } from '@playwright/test';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME ?? 'fleet_analytics_e2e',
      user: process.env.DB_USER ?? 'admin',
      password: process.env.DB_PASSWORD ?? 'testpassword',
    });
  }
  return pool;
}

export { getPool };

const FIXTURE_SUB = {
  admin: '00000000-0000-4000-8000-000000000001',
  fleet_manager: '00000000-0000-4000-8000-000000000002',
  viewer: '00000000-0000-4000-8000-000000000003',
} as const;

export type FixtureRole = keyof typeof FIXTURE_SUB;

export async function seedFixtureUser(role: FixtureRole) {
  const cognitoSub = FIXTURE_SUB[role];
  const email = `e2e-${role}@fixture.local`;
  const db = getPool();

  const result = await db.query(
    `INSERT INTO users (cognito_sub, name, email, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (cognito_sub) DO UPDATE SET role = EXCLUDED.role, is_active = true
     RETURNING id`,
    [cognitoSub, `E2E ${role}`, email, role]
  );

  return { id: result.rows[0].id, cognitoSub, email, role };
}

// Real Cognito login. Requires the one-time provisioning in
// PROVISIONING.md -- E2E_TEST_USER_COGNITO_SUB is the actual `sub` of that
// user, which must be linked to a `users` row for authenticate()'s
// post-decode lookup to succeed.
export async function seedRealLoginUser() {
  const cognitoSub = process.env.E2E_TEST_USER_COGNITO_SUB;
  const email = process.env.E2E_TEST_EMAIL;
  if (!cognitoSub || !email) {
    throw new Error(
      'seedRealLoginUser: E2E_TEST_USER_COGNITO_SUB and E2E_TEST_EMAIL must be set. ' +
      'See e2e/PROVISIONING.md.'
    );
  }

  const db = getPool();

  await db.query(
    `INSERT INTO users (cognito_sub, name, email, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (cognito_sub) DO UPDATE SET is_active = true
     RETURNING id`,
    [cognitoSub, 'E2E Login Test User', email, 'fleet_manager']
  );
}

function mintDecodeOnlyToken(cognitoSub: string, email: string) {
  return jwt.sign({ sub: cognitoSub, email }, 'e2e-unverified-signing-key', {
    expiresIn: '2h',
  });
}

function authStorePayload(user: { id: number; name: string; email: string }, role: string, token: string) {
  return JSON.stringify({
    state: { user, role, token },
    version: 0,
  });
}

export async function seedAuthenticated(page: Page, role: FixtureRole) {
  const fixture = await seedFixtureUser(role);
  const token = mintDecodeOnlyToken(fixture.cognitoSub, fixture.email);

  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    ['auth-store', authStorePayload({ id: fixture.id, name: `E2E ${role}`, email: fixture.email }, role, token)]
  );

  return fixture;
}



export async function closeDbPool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}