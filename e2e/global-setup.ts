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