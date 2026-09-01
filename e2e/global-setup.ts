// e2e/global-setup.ts
//
// Runs once before the whole suite (not per-test, per-file). Links the
// pre-provisioned Cognito test user (see PROVISIONING.md) to a `users` row
// so authenticate()'s post-decode lookup succeeds once auth.spec.ts logs in
// for real. Fixture users for the OTHER specs are seeded lazily by
// seedAuthenticated() in support/auth.ts, since which roles are needed
// varies per spec.

import { seedRealLoginUser, closeDbPool } from './tests/support/auth';

export default async function globalSetup() {
  if (!process.env.E2E_TEST_USER_COGNITO_SUB || !process.env.E2E_TEST_EMAIL) {
    console.warn(
      '[global-setup] E2E_TEST_USER_COGNITO_SUB / E2E_TEST_EMAIL not set -- ' +
      'the real-login spec will fail. See e2e/PROVISIONING.md. ' +
      'Other specs are unaffected.'
    );
    return;
  }

  await seedRealLoginUser();
  await closeDbPool();
}