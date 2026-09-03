import { test, expect, type Page } from '@playwright/test';
import { seedAuthenticated, closeDbPool } from './support/auth';

const FLEET_GROUPS_PATH = '/fleet-groups';

async function gotoFleetGroupsPage(page: Page) {
  await page.goto(FLEET_GROUPS_PATH);
  await expect(
    page.getByRole('heading', { name: 'Fleet Groups', level: 1 })
  ).toBeVisible();
}

test.afterAll(async () => {
  await closeDbPool();
});

test.describe('Fleet groups', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  });

  test('an admin session loads the fleet groups page', async ({ page }) => {
    await seedAuthenticated(page, 'admin');
    await gotoFleetGroupsPage(page);

    await expect(page.getByRole('button', { name: /new group/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });

  test('the groups table renders past its loading state', async ({ page }) => {
    await seedAuthenticated(page, 'admin');
    await gotoFleetGroupsPage(page);

    await expect(
      page.getByRole('heading', { name: 'Fleet Groups', level: 2 })
    ).toBeVisible();
    await expect(page.getByText(/loading fleet groups/i)).toBeHidden();

    await expect(page.getByRole('columnheader', { name: 'Group' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Vehicles' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });

  test('the New Group button opens the create dialog', async ({ page }) => {
    await seedAuthenticated(page, 'admin');
    await gotoFleetGroupsPage(page);

    await page.getByRole('button', { name: /new group/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('a fleet_manager session is redirected away', async ({ page }) => {
    await seedAuthenticated(page, 'fleet_manager');
    await page.goto(FLEET_GROUPS_PATH);

    await expect(page).not.toHaveURL(/\/fleet-groups/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('a viewer session is redirected away', async ({ page }) => {
    await seedAuthenticated(page, 'viewer');
    await page.goto(FLEET_GROUPS_PATH);

    await expect(page).toHaveURL(/\/dashboard\/viewer/);
  });

  test('an unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto(FLEET_GROUPS_PATH);
    await expect(page).toHaveURL(/\/login/);
  });
});