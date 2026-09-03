jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');

describe('Triggered Alerts API (/api/alerts) - Integration tests. real db no mocks', () => {
    let adminId;
    let managerId;
    let secondManagerId;
    let fleetGroupId;
    let secondFleetGroupId;
    let vehicleId;
    let secondVehicleId;
    let ruleId;
    let secondRuleId;
    let managerToken;

    async function cleanup() {
        await pool.query(`
            DELETE FROM triggered_alerts
            WHERE vehicle_id LIKE 'covtest-ta-%'
        `);

        await pool.query(` DELETE FROM custom_alert_rules
            WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%')`);

        await pool.query(` DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%') `);

        await pool.query(` DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-TA-%'`);

        await pool.query(`DELETE FROM users
            WHERE email LIKE 'covtest-ta-%'`);

        await pool.query(` DELETE FROM vehicles
            WHERE vehicle_id LIKE 'covtest-ta-%' `);
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query(` INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-ta-admin-sub', 'COVTEST TA Admin', 'covtest-ta-admin@example.com', 'admin', true)
            RETURNING id `);
        adminId = admin.rows[0].id;

        const manager = await pool.query(` INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-ta-manager-sub', 'COVTEST TA Manager', 'covtest-ta-manager@example.com', 'fleet_manager', true)
            RETURNING id  `);
        managerId = manager.rows[0].id;

        const secondManager = await pool.query(` INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-ta-manager2-sub', 'COVTEST TA Manager Two', 'covtest-ta-manager2@example.com', 'fleet_manager', true)
            RETURNING id `);
        secondManagerId = secondManager.rows[0].id;

        const fleetGroup = await pool.query(` INSERT INTO fleet_groups (name) VALUES ('COVTEST-TA-Group-A') RETURNING id `);
        fleetGroupId = fleetGroup.rows[0].id;

        const secondFleetGroup = await pool.query(`INSERT INTO fleet_groups (name) VALUES ('COVTEST-TA-Group-B') RETURNING id`);
        secondFleetGroupId = secondFleetGroup.rows[0].id;

        const vehicle = await pool.query(` INSERT INTO vehicles (vehicle_id, device_id) VALUES ('covtest-ta-veh-A', 'covtest-ta-dev-A') RETURNING vehicle_id `);
        vehicleId = vehicle.rows[0].vehicle_id;

        const secondVehicle = await pool.query(`INSERT INTO vehicles (vehicle_id, device_id) VALUES ('covtest-ta-veh-B', 'covtest-ta-dev-B') RETURNING vehicle_id `);
        secondVehicleId = secondVehicle.rows[0].vehicle_id;

        const rule = await pool.query(`INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
            VALUES ($1, $2, 'COVTEST-TA Rule A', 'speed_threshold', $3, 'active')
            RETURNING id `, [managerId, fleetGroupId, { max_speed_kmh: 120 }]);
        ruleId = rule.rows[0].id;

        const secondRule = await pool.query(` INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
            VALUES ($1, $2, 'COVTEST-TA Rule B', 'speed_threshold', $3, 'active')
            RETURNING id`, [secondManagerId, secondFleetGroupId, { max_speed_kmh: 120 }]);
        secondRuleId = secondRule.rows[0].id;

        managerToken = generateTestToken(managerId, 'covtest-ta-manager@example.com', 'fleet_manager');
        secondManagerToken = generateTestToken(secondManagerId, 'covtest-ta-manager2@example.com', 'fleet_manager');
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    describe('GET /api/alerts/triggered', () => {
        beforeEach(async () => {
            await pool.query(` INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)`, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`DELETE FROM triggered_alerts
                WHERE vehicle_id LIKE 'covtest-ta-%' `);
            await pool.query(`DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%') `);
        });

        test('lists alerts only within the accessible fleet group', async () => {
            const alert = await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120')
                RETURNING id `, [ruleId, vehicleId, fleetGroupId]);

            await pool.query(` INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value)
                VALUES ($1, $2, $3, 'speed_threshold', '140', '120') `, [secondRuleId, secondVehicleId, secondFleetGroupId]);

            const res = await request(app)
                .get('/api/alerts/triggered')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.data).toHaveLength(1);
            expect(res.body.data.data[0].id).toBe(alert.rows[0].id);
            expect(res.body.data.data[0].fleet_group_id).toBe(fleetGroupId);
        });


        test('rejects a fleet_group_id filter the manager cannot access', async () => {
            const res = await request(app)
                .get(`/api/alerts/triggered?fleet_group_id=${secondFleetGroupId}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(403);
        });
    });

    describe('GET /api/alerts/triggered/new', () => {
        beforeEach(async () => {
            await pool.query(` INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3) `, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`DELETE FROM triggered_alerts
                WHERE vehicle_id LIKE 'covtest-ta-%' `);
            await pool.query(` DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%')`);
        });

        test('returns only new alerts created after the given since timestamp', async () => {
            await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status, created_at)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120', 'new', NOW() - INTERVAL '5 minutes')
            `, [ruleId, vehicleId, fleetGroupId]);

            const recent = await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status, created_at)
                VALUES ($1, $2, $3, 'speed_threshold', '140', '120', 'new', NOW() - INTERVAL '5 seconds')
                RETURNING id `, [ruleId, vehicleId, fleetGroupId]);

            const since = new Date(Date.now() - 60 * 1000).toISOString();
            const res = await request(app)
                .get(`/api/alerts/triggered/new?since=${encodeURIComponent(since)}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.alerts).toHaveLength(1);
            expect(res.body.data.alerts[0].id).toBe(recent.rows[0].id);
        });

        test('returns 400 for an invalid since parameter', async () => {
            const res = await request(app)
                .get('/api/alerts/triggered/new?since=not-a-date')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/alerts/triggered/:id', () => {
        beforeEach(async () => {
            await pool.query(`INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3) `, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`DELETE FROM triggered_alerts
                WHERE vehicle_id LIKE 'covtest-ta-%' `);
            await pool.query(`DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%') `);
        });

        test('returns full alert details including rule and fleet group context', async () => {
            const alert = await pool.query(` INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120')
                RETURNING id `, [ruleId, vehicleId, fleetGroupId]);

            const res = await request(app)
                .get(`/api/alerts/triggered/${alert.rows[0].id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(alert.rows[0].id);
            expect(res.body.data.rule_name).toBe('COVTEST-TA Rule A');
            expect(res.body.data.fleet_group_name).toBe('COVTEST-TA-Group-A');
            expect(res.body.data.vehicle_link).toBe(`/vehicles/${vehicleId}`);
        });

        test('returns 404 for a nonexistent alert id', async () => {
            const res = await request(app)
                .get('/api/alerts/triggered/999999999')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/alerts/triggered/:id/acknowledge', () => {
        beforeEach(async () => {
            await pool.query(` INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3) `, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(` DELETE FROM triggered_alerts
                WHERE vehicle_id LIKE 'covtest-ta-%' `);
            await pool.query(` DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%')`);
        });

        test('returns 400 when the alert is already acknowledged', async () => {
            const alert = await pool.query(` INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120', 'acknowledged')
                RETURNING id `, [ruleId, vehicleId, fleetGroupId]);

            const res = await request(app)
                .put(`/api/alerts/triggered/${alert.rows[0].id}/acknowledge`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(400);
        });

        test('returns 403 when the manager has no access to the alert\'s fleet group', async () => {
            const alert = await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120', 'new')
                RETURNING id`, [secondRuleId, secondVehicleId, secondFleetGroupId]);

            const res = await request(app)
                .put(`/api/alerts/triggered/${alert.rows[0].id}/acknowledge`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(403);

            const dbRow = await pool.query('SELECT status FROM triggered_alerts WHERE id = $1', [alert.rows[0].id]);
            expect(dbRow.rows[0].status).toBe('new');
        });

    });

    describe('PUT /api/alerts/triggered/:id/resolve', () => {
        beforeEach(async () => {
            await pool.query(` INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3) `, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`DELETE FROM triggered_alerts
                WHERE vehicle_id LIKE 'covtest-ta-%' `);
            await pool.query(`DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%') `);
        });

        test('resolves an acknowledged alert', async () => {
            const alert = await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120', 'acknowledged')
                RETURNING id`, [ruleId, vehicleId, fleetGroupId]);

            const res = await request(app)
                .put(`/api/alerts/triggered/${alert.rows[0].id}/resolve`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.alert.status).toBe('resolved');
            expect(res.body.data.alert.resolved_at).not.toBeNull();
        });
    });

    describe('GET /api/alerts/count/new', () => {
        beforeEach(async () => {
            await pool.query(`INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)`, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`DELETE FROM triggered_alerts
                WHERE vehicle_id LIKE 'covtest-ta-%' `);
            await pool.query(` DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ta-%')  `);
        });

        test('scopes the count to a specific fleet_group_id when provided', async () => {
            await pool.query(`INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3) `, [secondFleetGroupId, managerId, adminId]);

            await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status)
                VALUES ($1, $2, $3, 'speed_threshold', '135', '120', 'new') `, [ruleId, vehicleId, fleetGroupId]);

            await pool.query(`INSERT INTO triggered_alerts (rule_id, vehicle_id, fleet_group_id, condition_type, breach_value, threshold_value, status)
                VALUES ($1, $2, $3, 'speed_threshold', '140', '120', 'new') `, [secondRuleId, secondVehicleId, secondFleetGroupId]);

            const res = await request(app)
                .get(`/api/alerts/count/new?fleet_group_id=${fleetGroupId}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.count).toBe(1);

            await pool.query(` DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id = $1 AND fleet_group_id = $2`, [managerId, secondFleetGroupId]);
        });
    });
});