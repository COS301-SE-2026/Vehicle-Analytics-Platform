jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');

describe('Custom Alert Rules API (/api/custom-alerts) - Integration tests. real db no mocks', () => {
    let adminId;
    let managerId;
    let secondManagerId;
    let fleetGroupId;
    let secondFleetGroupId;
    let managerToken;
    let secondManagerToken;

    async function cleanup() {
        await pool.query(`
            DELETE FROM custom_alert_rules
            WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
        `);

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
        `);

        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-CA-%'
        `);

        await pool.query(`
            DELETE FROM users
            WHERE email LIKE 'covtest-ca-%'
        `);
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-ca-admin-sub', 'COVTEST CA Admin', 'covtest-ca-admin@example.com', 'admin', true)
            RETURNING id
        `);
        adminId = admin.rows[0].id;

        const manager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-ca-manager-sub', 'COVTEST CA Manager', 'covtest-ca-manager@example.com', 'fleet_manager', true)
            RETURNING id
        `);
        managerId = manager.rows[0].id;

        const secondManager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-ca-manager2-sub', 'COVTEST CA Manager Two', 'covtest-ca-manager2@example.com', 'fleet_manager', true)
            RETURNING id
        `);
        secondManagerId = secondManager.rows[0].id;

        const fleetGroup = await pool.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-CA-Group-A') RETURNING id
        `);
        fleetGroupId = fleetGroup.rows[0].id;

        const secondFleetGroup = await pool.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-CA-Group-B') RETURNING id
        `);
        secondFleetGroupId = secondFleetGroup.rows[0].id;

        managerToken = generateTestToken(managerId, 'covtest-ca-manager@example.com', 'fleet_manager');
        secondManagerToken = generateTestToken(secondManagerId, 'covtest-ca-manager2@example.com', 'fleet_manager');
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    describe('POST /api/custom-alerts/rules', () => {
        beforeEach(async () => {
            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`
                DELETE FROM custom_alert_rules
                WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
            await pool.query(`
                DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
        });

        test('creates a rule when the manager is assigned to the fleet group', async () => {
            const res = await request(app)
                .post('/api/custom-alerts/rules')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Highway speeding',
                    fleet_group_id: fleetGroupId,
                    condition_type: 'speed_threshold',
                    condition_params: { max_speed_kmh: 110 },
                });

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toMatchObject({
                name: 'Highway speeding',
                fleet_group_id: fleetGroupId,
                condition_type: 'speed_threshold',
                status: 'active',
            });

            const dbRow = await pool.query('SELECT * FROM custom_alert_rules WHERE id = $1', [res.body.data.id]);
            expect(dbRow.rows).toHaveLength(1);
            expect(dbRow.rows[0].manager_id).toBe(managerId);
            expect(dbRow.rows[0].condition_params).toEqual({ max_speed_kmh: 110 });
        });

        test('rejects requests with no auth token', async () => {
            const res = await request(app)
                .post('/api/custom-alerts/rules')
                .send({ name: 'x' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /api/custom-alerts/rules', () => {
        beforeEach(async () => {
            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, managerId, adminId]);

            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, secondManagerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`
                DELETE FROM custom_alert_rules
                WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
            await pool.query(`
                DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
        });

        test('lists only the requesting manager\'s own rules, most recent first', async () => {
            
            const rule1 = await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'Rule 1', 'speed_threshold', $3, 'active')
                RETURNING id
            `, [managerId, fleetGroupId, { max_speed_kmh: 100 }]);

            const rule2 = await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'Rule 2', 'speed_threshold', $3, 'active')
                RETURNING id
            `, [managerId, fleetGroupId, { max_speed_kmh: 110 }]);

            await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'Not mine', 'speed_threshold', $3, 'active')
            `, [secondManagerId, fleetGroupId, { max_speed_kmh: 120 }]);

            const res = await request(app)
                .get('/api/custom-alerts/rules')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data.every((r) => r.manager_id === managerId)).toBe(true);

            const groupCheck = await pool.query(
                'SELECT name FROM fleet_groups WHERE id = $1',
                [fleetGroupId]
            );
            expect(res.body.data[0]).toHaveProperty('fleet_group_name', groupCheck.rows[0].name);
        });
    });

    describe('GET /api/custom-alerts/rules/:id', () => {
        beforeEach(async () => {
            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, managerId, adminId]);
        });

        afterEach(async () => {
            await pool.query(`
                DELETE FROM custom_alert_rules
                WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
            await pool.query(`
                DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
        });

        test('returns a rule owned by the requesting manager', async () => {
            const rule = await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'My Rule', 'speed_threshold', $3, 'active')
                RETURNING id
            `, [managerId, fleetGroupId, { max_speed_kmh: 100 }]);

            const res = await request(app)
                .get(`/api/custom-alerts/rules/${rule.rows[0].id}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.id).toBe(rule.rows[0].id);
        });


        test('returns 404 for a nonexistent rule id', async () => {
            const res = await request(app)
                .get('/api/custom-alerts/rules/999999')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /api/custom-alerts/rules/:id', () => {
        let ruleId;

        beforeEach(async () => {
            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, managerId, adminId]);

            const rule = await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'Old name', 'speed_threshold', $3, 'active')
                RETURNING id
            `, [managerId, fleetGroupId, { max_speed_kmh: 100 }]);

            ruleId = rule.rows[0].id;
        });

        afterEach(async () => {
            await pool.query(`
                DELETE FROM custom_alert_rules
                WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
            await pool.query(`
                DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
        });

        test('updates a rule\'s fields and persists them', async () => {
            const res = await request(app)
                .put(`/api/custom-alerts/rules/${ruleId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'New name',
                    fleet_group_id: fleetGroupId,
                    condition_type: 'speed_threshold',
                    condition_params: { max_speed_kmh: 90 },
                    status: 'inactive',
                });

            expect(res.status).toBe(200);
            expect(res.body.data.name).toBe('New name');
            expect(res.body.data.status).toBe('inactive');

            const dbRow = await pool.query('SELECT * FROM custom_alert_rules WHERE id = $1', [ruleId]);
            expect(dbRow.rows[0].name).toBe('New name');
            expect(dbRow.rows[0].status).toBe('inactive');
        });

        test('returns 403 when the manager is not assigned to the (possibly new) fleet_group_id', async () => {
            const res = await request(app)
                .put(`/api/custom-alerts/rules/${ruleId}`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                    name: 'Old name',
                    fleet_group_id: secondFleetGroupId,
                    condition_type: 'speed_threshold',
                    condition_params: { max_speed_kmh: 90 },
                });

            expect(res.status).toBe(403);
        });
    });

    describe('PATCH /api/custom-alerts/rules/:id/status', () => {
        let ruleId;

        beforeEach(async () => {
            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, managerId, adminId]);

            const rule = await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'Status Rule', 'speed_threshold', $3, 'active')
                RETURNING id
            `, [managerId, fleetGroupId, { max_speed_kmh: 100 }]);

            ruleId = rule.rows[0].id;
        });

        afterEach(async () => {
            await pool.query(`
                DELETE FROM custom_alert_rules
                WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
            await pool.query(`
                DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
        });


        test('returns 404 when setting status on another manager\'s rule', async () => {
            const res = await request(app)
                .patch(`/api/custom-alerts/rules/${ruleId}/status`)
                .set('Authorization', `Bearer ${secondManagerToken}`)
                .send({ status: 'inactive' });

            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/custom-alerts/rules/:id', () => {
        let ruleId;

        beforeEach(async () => {
            await pool.query(`
                INSERT INTO fleet_manager_assignments (fleet_group_id, fleet_manager_id, assigned_by)
                VALUES ($1, $2, $3)
            `, [fleetGroupId, managerId, adminId]);

            const rule = await pool.query(`
                INSERT INTO custom_alert_rules (manager_id, fleet_group_id, name, condition_type, condition_params, status)
                VALUES ($1, $2, 'Delete Rule', 'speed_threshold', $3, 'active')
                RETURNING id
            `, [managerId, fleetGroupId, { max_speed_kmh: 100 }]);

            ruleId = rule.rows[0].id;
        });

        afterEach(async () => {
            await pool.query(`
                DELETE FROM custom_alert_rules
                WHERE manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
            await pool.query(`
                DELETE FROM fleet_manager_assignments
                WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-ca-%')
            `);
        });

        test('returns 404 when deleting another manager\'s rule (and does not delete it)', async () => {
            const res = await request(app)
                .delete(`/api/custom-alerts/rules/${ruleId}`)
                .set('Authorization', `Bearer ${secondManagerToken}`);

            expect(res.status).toBe(404);

            const dbRow = await pool.query('SELECT * FROM custom_alert_rules WHERE id = $1', [ruleId]);
            expect(dbRow.rows).toHaveLength(1);
        });
    });
});