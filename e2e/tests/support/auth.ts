// e2e/tests/support/auth.ts
//
// Two separate ways of getting an "authenticated" browser session, because
// they answer different questions:
//
//   loginViaUI()         -- drives the real form, hits real Cognito, proves
//                            the login flow itself works end to end.
//   seedAuthenticated()  -- skips the form and Cognito entirely, injecting
//                           a token straight into localStorage. Use this
//                           for every OTHER spec (dashboard, geofence,
//                           vehicles) that needs to be logged in but isn't
//                           testing login itself -- it's instant and
//                           doesn't hammer Cognito once per test.
//
// seedAuthenticated() works because authenticate() in NODE_ENV outside
// 'test' does jwt.decode(), not jwt.verify() -- it trusts API Gateway to
// have already checked the signature in production, so in e2e it accepts
// ANY correctly-shaped token as long as its `sub` claim matches a real
// users.cognito_sub row. The signing secret below is never checked by the
// backend; it only needs to produce a well-formed JWT string.

import jwt from 'jsonwebtoken';
import type { Page } from '@playwright/test';
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'fleet_analytics_e2e',
  user: process.env.DB_USER ?? 'admin',
  password: process.env.DB_PASSWORD ?? 'testpassword',
});

// Stable, obviously-fake UUIDs -- never collide with a real Cognito sub,
// and stay the same across runs so re-seeding is an upsert, not a leak.
const FIXTURE_SUB = {
  admin: '00000000-0000-4000-8000-000000000001',
  manager: '00000000-0000-4000-8000-000000000002',
  viewer: '00000000-0000-4000-8000-000000000003',
} as const;

export type FixtureRole = keyof typeof FIXTURE_SUB;

export async function seedFixtureUser(role: FixtureRole) {
  const cognitoSub = FIXTURE_SUB[role];
  const email = `e2e-${role}@fixture.local`;

  const result = await pool.query(
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

  await pool.query(
    `INSERT INTO users (cognito_sub, name, email, role, is_active)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (cognito_sub) DO UPDATE SET is_active = true
     RETURNING id`,
    [cognitoSub, 'E2E Login Test User', email, 'manager']
  );
}

function mintDecodeOnlyToken(cognitoSub: string, email: string) {
  // Any secret works -- authenticate() in this mode never verifies the
  // signature. Do NOT reuse this pattern for anything that reads real
  // production data; it is only valid because the e2e backend intentionally
  // runs in the same "trust the decoded payload" mode API Gateway provides.
  return jwt.sign({ sub: cognitoSub, email }, 'e2e-unverified-signing-key', {
    expiresIn: '2h',
  });
}

// Matches zustand persist's default localStorage shape: { state, version }
// under the store's configured name. Functions in the store (setUser,
// setRole, ...) are never persisted -- they come from the live store
// creator on rehydration, so only data fields need to be seeded here.
function authStorePayload(user: { id: number; name: string; email: string }, role: string, token: string) {
  return JSON.stringify({
    state: { user, role, token },
    version: 0,
  });
}

export async function seedAuthenticated(page: Page, role: FixtureRole) {
  const fixture = await seedFixtureUser(role);
  const token = mintDecodeOnlyToken(fixture.cognitoSub, fixture.email);

  // Must run before the app's first script executes, so authStore reads
  // this on initial hydration rather than starting logged out.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    ['auth-store', authStorePayload({ id: fixture.id, name: `E2E ${role}`, email: fixture.email }, role, token)]
  );

  return fixture;
}

export async function closeDbPool() {
  await pool.end();
}