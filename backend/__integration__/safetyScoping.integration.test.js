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

    const vehicleA = 'COVTEST-SAFE-A';
    const vehicleB = 'COVTEST-SAFE-B';

    async function cleanup() {

        await pool.query(`DELETE FROM driver_daily_safety_scores WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`DELETE FROM vehicles WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-safe-%')
        `);
        
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-SAFE-%'
        `);

        await pool.query(`
            DELETE FROM users WHERE email LIKE 'covtest-safe-%'
        `);
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-safe-admin-sub', 'COVTEST SAFE Admin', 'covtest-safe-admin@example.com', 'admin', true)
            RETURNING id
            `);

        adminId = admin.rows[0].id;

        const manager = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-safe-manager-sub', 'COVTEST SAFE Manager', 'covtest-safe-manager@example.com', 'fleet_manager', true)
            RETURNING id
            `);

        managerId = manager.rows[0].id; 
        
        const groupA = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-SAFE-Group-A')
            RETURNING id
            `)

        groupAId = groupA.rows[0].id;


        const groupB = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-SAFE-Group-B')
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
            `, [vehicleA, 'COVTEST-SAFE-DEV-A', groupAId]
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
            `, [vehicleB, 'COVTEST-SAFE-DEV-B', groupBId]
        );

        await pool.query(`
            INSERT INTO driver_daily_safety_scores (vehicle_id, score_date, safety_score, classification)
            VALUES ($1, CURRENT_DATE, 90, 'Good')
            `, [vehicleA]
        );

        await pool.query(`
            INSERT INTO driver_daily_safety_scores (vehicle_id, score_date, safety_score, classification)
            VALUES ($1, CURRENT_DATE, 40, 'Poor')
            `, [vehicleB]
        );

        adminToken = generateTestToken(adminId, 'covtest-safe-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-safe-manager@example.com', 'fleet_manager');
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    describe('GET /api/safety/scores/:vehicleId', () => {
        test('fleet manager can access their own group\'s vehicle', async () => {
            const res = await request(app)
                .get(`/api/safety/scores/${vehicleA}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.vehicle_id).toBe(vehicleA);
        });


        test('fleet manager gets 404 for a vehicle outside their group', async () => {
            const res = await request(app)
                .get(`/api/safety/scores/${vehicleB}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });

        test('admin can access any vehicle regardless of group', async () => {
            const res = await request(app)
                .get(`/api/safety/scores/${vehicleB}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });
    });

    describe('GET /api/safety/scores', () => {
        test('fleet manager sees only their groups vehicle in fleet-wide scores', async () => {
            const res = await request(app)
                .get('/api/safety/scores')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.data.vehicles.map(v => v.vehicle_id);
            expect(ids).toContain(vehicleA);
            expect(ids).not.toContain(vehicleB);
        });

        test('admin sees vehicles from both groups across fleet-wide scores', async () => {
            const res = await request(app)
                .get('/api/safety/scores')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.data.vehicles.map(v => v.vehicle_id);
            expect(ids).toContain(vehicleA);
            expect(ids).toContain(vehicleB);
        });       
    });
});