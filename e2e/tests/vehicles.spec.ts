import { test, expect, type Page } from '@playwright/test';
import { seedAuthenticated, closeDbPool } from './support/auth';
import { seedVehicle, cleanupE2eVehicles } from './support/vehicle';

const VEHICLES_PATH = '/vehicles';

async function gotoVehiclesPage(page: Page) {
  await page.goto(VEHICLES_PATH);
  await expect(page.getByRole('heading', { name: 'Vehicles', level: 1 })).toBeVisible();
}

test.afterEach(async () => {
  await cleanupE2eVehicles();
});

test.afterAll(async () => {
  await closeDbPool();
});

test.describe('Vehicles', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (err) => console.log('[pageerror]', err.message));
  });

  test('a seeded vehicle appears in the vehicles table', async ({ page }) => {
    const { vehicleId } = await seedVehicle();

    await seedAuthenticated(page, 'fleet_manager');
    await gotoVehiclesPage(page);

    const row = page.getByTestId(`vehicle-row-${vehicleId}`);
    await expect(row).toBeVisible();
    await expect(row.getByText(vehicleId, { exact: true })).toBeVisible();
  });

  test('the summary cards render with the seeded fleet', async ({ page }) => {
    await seedVehicle();

    await seedAuthenticated(page, 'fleet_manager');
    await gotoVehiclesPage(page);

    await expect(page.getByText('AVG. SAFETY SCORE')).toBeVisible();
    await expect(page.getByText('ACTIVE TRIPS')).toBeVisible();
    await expect(page.getByText('LOWEST SCORING VEHICLE')).toBeVisible();
  });

  test('clicking a vehicle row opens its profile', async ({ page }) => {
    const { vehicleId } = await seedVehicle();

    await seedAuthenticated(page, 'fleet_manager');
    await gotoVehiclesPage(page);

    await page.getByTestId(`vehicle-row-${vehicleId}`).click();

    await expect(page).toHaveURL(new RegExp(`/vehicles/${vehicleId}$`));
    await expect(page.getByRole('heading', { name: vehicleId, level: 1 })).toBeVisible();
  });

  test('the profile back button returns to the list', async ({ page }) => {
    const { vehicleId } = await seedVehicle();

    await seedAuthenticated(page, 'fleet_manager');
    await page.goto(`${VEHICLES_PATH}/${vehicleId}`);

    await expect(page.getByRole('heading', { name: vehicleId, level: 1 })).toBeVisible();
    await page.getByTestId('back-to-vehicles').click();

    await expect(page).toHaveURL(new RegExp(`${VEHICLES_PATH}$`));
    await expect(page.getByRole('heading', { name: 'Vehicles', level: 1 })).toBeVisible();
  });

  test('the profile switches between Current Trip and History tabs', async ({ page }) => {
    const { vehicleId } = await seedVehicle();

    await seedAuthenticated(page, 'fleet_manager');
    await page.goto(`${VEHICLES_PATH}/${vehicleId}`);

    // 'current' is the default tab -- CurrentTripTab renders Live Tracking.
    await expect(page.getByText('Live Tracking')).toBeVisible();

    await page.getByTestId('vehicle-tab-history').click();
    await expect(page.getByText('Safety Score Trend')).toBeVisible();

    await page.getByTestId('vehicle-tab-current').click();
    await expect(page.getByText('Live Tracking')).toBeVisible();
  });

  test('a viewer session is redirected away from the vehicles list', async ({ page }) => {
    await seedAuthenticated(page, 'viewer');
    await page.goto(VEHICLES_PATH);

    await expect(page).toHaveURL(/\/dashboard\/viewer/);
  });

  test('an unauthenticated visitor is redirected to login', async ({ page }) => {
    await page.goto(VEHICLES_PATH);
    await expect(page).toHaveURL(/\/login/);
  });
});