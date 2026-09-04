jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const {pool} = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');


describe('Vehicle trips/safety-trend endpoints scoped to fleet group', () => {
    let adminId;
    let managerId;
    let groupAId;
    let groupBId;
    let adminToken;
    let managerToken;

    const vehicleA = 'COVTEST-DASH-A';
    const vehicleB = 'COVTEST-DASH-B';

    async function cleanup() {

        await pool.query(`DELETE FROM current_vehicle_position WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`DELETE FROM clean_telemetry WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`DELETE FROM vehicle_events WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`DELETE FROM vehicles WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-dash-%')
        `);
        
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-DASH-%'
        `);

        await pool.query(`
            DELETE FROM users WHERE email LIKE 'covtest-dash-%'
        `);
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-dash-admin-sub', 'COVTEST DASH Admin', 'covtest-dash-admin@example.com', 'admin', true)
            RETURNING id
            `);

        adminId = admin.rows[0].id;

        const manager = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-dash-manager-sub', 'COVTEST DASH Manager', 'covtest-dash-manager@example.com', 'fleet_manager', true)
            RETURNING id
            `);

        managerId = manager.rows[0].id; 
        
        const groupA = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-DASH-Group-A')
            RETURNING id
            `)

        groupAId = groupA.rows[0].id;


        const groupB = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-DASH-Group-B')
            RETURNING id
            `)

        groupBId = groupB.rows[0].id;


        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $3)
            `, [managerId, groupAId, adminId]
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
            `, [vehicleA, 'COVTEST-DASH-DEV-A', groupAId]
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
            `, [vehicleB, 'COVTEST-DASH-DEV-B', groupBId]
        );

        adminToken = generateTestToken(adminId, 'covtest-dash-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-dash-manager@example.com', 'fleet_manager');
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    test('GET /api/dashboard/kpis responds 200 for both roles', async () => {
        const managerRes = await request(app).get('/api/dashboard/kpis').set('Authorization', `Bearer ${managerToken}`);
        const adminRes = await request(app).get('/api/dashboard/kpis').set('Authorization', `Bearer ${adminToken}`);

        expect(managerRes.status).toBe(200);
        expect(adminRes.status).toBe(200);
    });


    test('GET /api/dashboard/total-distance responds 200 for both roles', async () => {
        const managerRes = await request(app)
            .get('/api/dashboard/total-distance')
            .set('Authorization', `Bearer ${managerToken}`);

        const adminRes = await request(app)
            .get('/api/dashboard/total-distance')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(managerRes.status).toBe(200);
        expect(adminRes.status).toBe(200);
    });

    test('Dashboard stats are scoped to a manager\'s group', async () => {
        const managerRes = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', `Bearer ${managerToken}`);

        const adminRes = await request(app)
            .get('/api/dashboard/stats')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(managerRes.status).toBe(200);
        expect(adminRes.status).toBe(200);
    });

    test('Alerts and activity endpoints responds 200 for both roles', async () => {
        const alertsManager = await request(app)
            .get('/api/dashboard/alerts')
            .set('Authorization', `Bearer ${managerToken}`);

        const activityManager = await request(app)
            .get('/api/dashboard/activity')
            .set('Authorization', `Bearer ${managerToken}`);

        expect(activityManager.status).toBe(200);
        expect(alertsManager.status).toBe(200);
    });
});