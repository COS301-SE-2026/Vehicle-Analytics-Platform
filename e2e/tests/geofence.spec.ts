import { test, expect, type Page } from '@playwright/test';
import { seedAuthenticated, closeDbPool } from './support/auth';
import {
  seedGeofence,
  cleanupE2eZones,
  closeGeofencePool,
} from './support/geofence';

const GEOFENCE_PATH = '/geofence';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[console.error]', msg.text());
  });
});

async function gotoGeofencePage(page: Page) {
  await page.goto(GEOFENCE_PATH);
  await expect(
    page.getByRole('heading', { name: /existing zones/i })
  ).toBeVisible();
}

function zoneRow(page: Page, name: string) {
  return page.getByRole('row').filter({ hasText: name });
}

test.afterEach(async () => {
  await cleanupE2eZones();
});

test.afterAll(async () => {
  await closeGeofencePool();
  await closeDbPool();
});

test.describe('Geofence zones', () => {
  test('a seeded zone appears in the Existing Zones table', async ({ page }) => {
    const zone = await seedGeofence({ triggerType: 'entry' });

    await seedAuthenticated(page, 'fleet_manager');
    await gotoGeofencePage(page);

    const row = zoneRow(page, zone.name);
    await expect(row).toBeVisible();

    await expect(row.getByText('Zone', { exact: true })).toBeVisible();
    await expect(row.getByText('entry', { exact: true })).toBeVisible();
  });

  test('clicking a zone row opens its detail view', async ({ page }) => {
    const zone = await seedGeofence();

    await seedAuthenticated(page, 'fleet_manager');
    await gotoGeofencePage(page);

    await zoneRow(page, zone.name).click();

    await expect(
      page.getByRole('heading', { name: /zone detail/i })
    ).toBeVisible();
    await expect(page.getByText(zone.name)).toBeVisible();

    // Back to the list.
    await page.getByRole('button', { name: /all zones/i }).click();
    await expect(
      page.getByRole('heading', { name: /existing zones/i })
    ).toBeVisible();
  });

  test('deleting a zone removes it from the table', async ({ page }) => {
    const zone = await seedGeofence();

    await seedAuthenticated(page, 'fleet_manager');
    await gotoGeofencePage(page);

    const row = zoneRow(page, zone.name);
    await expect(row).toBeVisible();

    await row.getByRole('button').nth(1).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText(/delete zone/i)).toBeVisible();
    await dialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(row).toBeHidden();
  });

  test('cancelling the delete dialog leaves the zone in place', async ({ page }) => {
    const zone = await seedGeofence();

    await seedAuthenticated(page, 'fleet_manager');
    await gotoGeofencePage(page);

    const row = zoneRow(page, zone.name);
    await row.getByRole('button').nth(1).click();

    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: /cancel/i }).click();

    await expect(dialog).toBeHidden();
    await expect(row).toBeVisible();
  });

  test('renaming a zone updates the table', async ({ page }) => {
    const zone = await seedGeofence({ triggerType: 'entry' });
    const newName = `${zone.name} renamed`;

    await seedAuthenticated(page, 'fleet_manager');
    await gotoGeofencePage(page);

    await zoneRow(page, zone.name).getByRole('button').nth(0).click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText(/edit zone/i)).toBeVisible();

    const nameInput = dialog.getByRole('textbox');
    await nameInput.fill(newName);

    await dialog.getByRole('radio', { name: /^both$/i }).click();

    await dialog.getByRole('button', { name: /save changes/i }).click();

    await expect(zoneRow(page, newName)).toBeVisible();
    await expect(zoneRow(page, newName).getByText('both', { exact: true }))
      .toBeVisible();
  });
});