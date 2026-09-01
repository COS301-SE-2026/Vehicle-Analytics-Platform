// e2e/tests/auth.spec.ts

import { test, expect } from '@playwright/test';
import { seedAuthenticated, closeDbPool } from './support/auth';

test.afterAll(async () => {
  await closeDbPool();
});

test.describe('Login form', () => {
  test('shows validation errors on an empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();

    // Login.jsx's inputs have `required`, so the browser's own validation
    // UI blocks submission before handleSubmit runs at all -- no fetch
    // call happens. Confirm via the native validity state rather than
    // looking for app-rendered error text, since none is produced here.
    const emailValid = await page.getByLabel(/email address/i).evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(emailValid).toBe(false);
  });

  test('shows an error for invalid credentials', async ({ page }) => {
    // Genuinely hits real Cognito with garbage credentials -- no seeding
    // needed. Cognito rejects it with NotAuthorizedException, authController
    // maps that to 401, and Login.jsx renders the thrown error message.
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('nobody-e2e@example.com');
    await page.getByLabel(/^password$/i).fill('definitely-wrong-password');
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();

    await expect(page.locator('.auth-error')).toBeVisible();
  });

  test('logs in with real Cognito credentials and reaches the manager dashboard', async ({ page }) => {
    test.skip(
      !process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD,
      'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set -- see e2e/PROVISIONING.md'
    );

    // global-setup.ts already linked this user's real cognito_sub to a
    // `users` row with role='manager'. getDashboardPath() maps
    // manager/fleet_manager to /dashboard/manager.
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill(process.env.E2E_TEST_EMAIL!);
    await page.getByLabel(/^password$/i).fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/manager/);
  });

  test('rejects access to a protected route when not logged in', async ({ page }) => {
    await page.goto('/dashboard/manager');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Fixture-authenticated access (no login form, no Cognito)', () => {
  // Every OTHER spec file that needs to be logged in should use
  // seedAuthenticated() the same way, rather than driving the login form.
  // This is the pattern this block demonstrates; it is not itself testing
  // login.

  test('a seeded manager session reaches the manager dashboard directly', async ({ page }) => {
    await seedAuthenticated(page, 'fleet_manager');
    await page.goto('/dashboard/manager');

    await expect(page).not.toHaveURL(/\/login/);
  });

  test('a seeded viewer session is redirected away from an admin-only route', async ({ page }) => {
    await seedAuthenticated(page, 'viewer');
    await page.goto('/dashboard/admin');

    // ProtectedRoute's role check redirects to getDashboardPath() for the
    // seeded role, not to /login -- the session IS authenticated, just not
    // authorized for this route.
    await expect(page).toHaveURL(/\/dashboard\/viewer/);
  });

  test('a seeded admin session cannot reach /map (admin is not in its allowedRoles)', async ({ page }) => {
    // Documents a real gap in App.jsx: /map allows
    // ['viewer','manager','fleet_manager'] but not 'admin', so an admin
    // account is redirected away from the live map entirely. Not fixed
    // here -- this test exists so that if it's ever intentionally changed,
    // it fails loudly rather than silently.
    await seedAuthenticated(page, 'admin');
    await page.goto('/map');

    await expect(page).toHaveURL(/\/dashboard\/admin/);
  });
});