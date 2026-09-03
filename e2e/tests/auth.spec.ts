import { test, expect } from '@playwright/test';
import { seedAuthenticated, closeDbPool } from './support/auth';

test.afterAll(async () => {
  await closeDbPool();
});

test.describe('Login form', () => {
  test('shows validation errors on an empty submit', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /sign in to dashboard/i }).click();

    const emailValid = await page.getByLabel(/email address/i).evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(emailValid).toBe(false);
  });

  test('shows an error for invalid credentials', async ({ page }) => {
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
  test('a seeded manager session reaches the manager dashboard directly', async ({ page }) => {
    await seedAuthenticated(page, 'fleet_manager');
    await page.goto('/dashboard/manager');

    await expect(page).not.toHaveURL(/\/login/);
  });

  test('a seeded viewer session is redirected away from an admin-only route', async ({ page }) => {
    await seedAuthenticated(page, 'viewer');
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/viewer/);
  });

  test('a seeded admin session cannot reach /map (admin is not in its allowedRoles)', async ({ page }) => {
    await seedAuthenticated(page, 'admin');
    await page.goto('/map');
    await expect(page).toHaveURL(/\/dashboard\/admin/);
  });
});