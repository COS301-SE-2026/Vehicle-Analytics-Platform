import { test, expect } from '@playwright/test';
import { seedAuthenticated, closeDbPool, getPool } from './support/auth';

test.afterAll(async () => {
  await closeDbPool();
});


async function seedFleetGroupAndAssignment(managerId: number) {
  const db = getPool();
  const suffix = Math.random().toString(36).slice(2, 8);

  const group = await db.query(
    `INSERT INTO fleet_groups (name) VALUES ($1) RETURNING id`,
    [`E2E-CA-Group-${suffix}`]
  );
  const fleetGroupId = group.rows[0].id;

  await db.query(
    `INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
     VALUES ($1, $2, $1)`,
    [managerId, fleetGroupId]
  );

  return fleetGroupId as number;
}

async function seedRuleVehicleAndAlert(
  managerId: number,
  fleetGroupId: number,
  status: 'new' | 'acknowledged' | 'resolved' = 'new'
) {
  const db = getPool();
  const suffix = Math.random().toString(36).slice(2, 8);

  const rule = await db.query(
    `INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
     VALUES ($1, $2, $3, 'speed_threshold', $4, 'active')
     RETURNING id`,
    [managerId, fleetGroupId, `E2E-CA Rule ${suffix}`, { max_speed_kmh: 120 }]
  );

  const vehicle = await db.query(
    `INSERT INTO vehicles (vehicle_id, device_id) VALUES ($1, $2) RETURNING vehicle_id`,
    [`e2e-ca-veh-${suffix}`, `e2e-ca-dev-${suffix}`]
  );

  const alert = await db.query(
    `INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status)
     VALUES ($1, $2, $3, 'speed_threshold', '135', '120', $4)
     RETURNING id`,
    [rule.rows[0].id, vehicle.rows[0].vehicle_id, fleetGroupId, status]
  );

  return { ruleId: rule.rows[0].id, vehicleId: vehicle.rows[0].vehicle_id, alertId: alert.rows[0].id };
}

async function cleanupFixtures() {
  const db = getPool();
  await db.query(`DELETE FROM triggered_alerts WHERE vehicle_id LIKE 'e2e-ca-%'`);
  await db.query(`DELETE FROM custom_alert_rules WHERE name LIKE 'E2E-CA %'`);
  await db.query(
    `DELETE FROM fleet_manager_assignments
     WHERE fleet_group_id IN (SELECT id FROM fleet_groups WHERE name LIKE 'E2E-CA-%')`
  );
  await db.query(`DELETE FROM fleet_groups WHERE name LIKE 'E2E-CA-%'`);
  await db.query(`DELETE FROM vehicles WHERE vehicle_id LIKE 'e2e-ca-%'`);
}

test.afterEach(async () => {
  await cleanupFixtures();
});

test.describe('Custom Alerts page - Alert Rules tab', () => {
 
  test('BUG: a real fleet_manager sees an empty Fleet Group dropdown and cannot create a rule', async ({ page }) => {
    const fixture = await seedAuthenticated(page, 'fleet_manager');
    await seedFleetGroupAndAssignment(fixture.id); // properly assigned -- doesn't matter, bug is in the dropdown fetch itself

    await page.goto('/custom-alerts');
    await page.getByTestId('custom-alerts-tab-rules').click();
    await page.getByRole('button', { name: 'Create Alert Rules' }).click();

    const fleetGroupSelect = page.getByLabel('Fleet Group');
    await expect(fleetGroupSelect.locator('option')).toHaveCount(1); // only the "Select a fleet group" placeholder

   
    await page.getByLabel('Alert Name').fill('E2E-CA Should be blocked');
    await page.getByRole('button', { name: 'Create Alert Rule' }).click();
    await expect(page.getByText('fleet_group_id is required')).toBeVisible();
  });

  test('tab defaults to Triggered Alerts, and Alert Rules is reachable via its tab', async ({ page }) => {
    const fixture = await seedAuthenticated(page, 'fleet_manager');
    await seedFleetGroupAndAssignment(fixture.id);

    await page.goto('/custom-alerts');

    
    await expect(page.getByPlaceholder('Search Vehicle ID...')).toBeVisible();

    await page.getByTestId('custom-alerts-tab-rules').click();
    await expect(page.getByRole('heading', { name: 'Alerts Rules' })).toBeVisible();
  });
});

test.describe('Custom Alerts page - Triggered Alerts tab', () => {


  test('manager can acknowledge a new alert, then resolve it', async ({ page }) => {
    const fixture = await seedAuthenticated(page, 'fleet_manager');
    const fleetGroupId = await seedFleetGroupAndAssignment(fixture.id);
    const { vehicleId } = await seedRuleVehicleAndAlert(fixture.id, fleetGroupId, 'new');

    await page.goto('/custom-alerts');

    await expect(page.getByText(new RegExp(`Vehicle ${vehicleId} exceeded`))).toBeVisible();

    await page.getByRole('button', { name: 'Acknowledge' }).click();
    await expect(page.getByText(/Acknowledged/)).toBeVisible();

    await page.getByRole('button', { name: 'Resolve' }).click();
    await expect(page.getByText(/Resolved/)).toBeVisible();

    
    await expect(page.getByRole('button', { name: 'Acknowledge' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Resolve' })).not.toBeVisible();
  });

  test('status filter tabs scope the visible alerts', async ({ page }) => {
    const fixture = await seedAuthenticated(page, 'fleet_manager');
    const fleetGroupId = await seedFleetGroupAndAssignment(fixture.id);
    const { vehicleId: newVehicleId } = await seedRuleVehicleAndAlert(fixture.id, fleetGroupId, 'new');
    const { vehicleId: resolvedVehicleId } = await seedRuleVehicleAndAlert(fixture.id, fleetGroupId, 'resolved');

    await page.goto('/custom-alerts');

    await expect(page.getByText(new RegExp(`Vehicle ${newVehicleId} exceeded`))).toBeVisible();
    await expect(page.getByText(new RegExp(`Vehicle ${resolvedVehicleId} exceeded`))).toBeVisible();

    await page.getByRole('button', { name: 'Resolved', exact: true }).click();
    await expect(page.getByText(new RegExp(`Vehicle ${resolvedVehicleId} exceeded`))).toBeVisible();
    await expect(page.getByText(new RegExp(`Vehicle ${newVehicleId} exceeded`))).not.toBeVisible();

    await page.getByRole('button', { name: 'New', exact: true }).click();
    await expect(page.getByText(new RegExp(`Vehicle ${newVehicleId} exceeded`))).toBeVisible();
    await expect(page.getByText(new RegExp(`Vehicle ${resolvedVehicleId} exceeded`))).not.toBeVisible();
  });
});