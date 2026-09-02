import { test, expect, type Page } from '@playwright/test';
import { seedAuthenticated, closeDbPool } from './support/auth';

const MAP_PATH = '/map';

async function gotoMapPage(page: Page) {
  await page.goto(MAP_PATH);
  await expect(page.getByText('Live Fleet', { exact: true })).toBeVisible();
}

test.afterAll(async () => {
  await closeDbPool();
});

test.describe('Live map', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  });

  test('a fleet_manager session loads the map with the fleet summary panel', async ({ page }) => {
    await seedAuthenticated(page, 'fleet_manager');
    await gotoMapPage(page);

    await expect(page.getByText('Moving', { exact: true })).toBeVisible();
    await expect(page.getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByText('Idle', { exact: true })).toBeVisible();

    const summaryCard = page.getByText('Live Fleet', { exact: true }).locator('..');
    await expect(summaryCard.getByText('0', { exact: true }).first()).toBeVisible();
  });

  test('a viewer session can also reach the map', async ({ page }) => {
    await seedAuthenticated(page, 'viewer');
    await gotoMapPage(page);
  });

  test('an unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto(MAP_PATH);
    await expect(page).toHaveURL(/\/login/);
  });
});