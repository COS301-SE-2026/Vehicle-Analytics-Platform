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

    const vehicleA = 'COVTEST-VTS-A';
    const vehicleB = 'COVTEST-VTS-B';

    async function cleanup() {

        await pool.query(`DELETE FROM vehicles WHERE vehicle_id IN ($1, $2)`,
            [vehicleA, vehicleB]
        );

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-vts-%')
        `);
        
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-VTS-%'
        `);

        await pool.query(`
            DELETE FROM users WHERE email LIKE 'covtest-vts-%'
        `);
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-vts-admin-sub', 'COVTEST VTS Admin', 'covtest-vts-admin@example.com', 'admin', true)
            RETURNING id
            `);

        adminId = admin.rows[0].id;

        const manager = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-vts-manager-sub', 'COVTEST VTS Manager', 'covtest-vts-manager@example.com', 'fleet_manager', true)
            RETURNING id
            `);

        managerId = manager.rows[0].id; 
        
        const groupA = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-VTS-Group-A')
            RETURNING id
            `)

        groupAId = groupA.rows[0].id;


        const groupB = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-VTS-Group-B')
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
            `, [vehicleA, 'COVTEST-VTS-DEV-A', groupAId]
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
            `, [vehicleB, 'COVTEST-VTS-DEV-B', groupBId]
        );

        adminToken = generateTestToken(adminId, 'covtest-vts-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-vts-manager@example.com', 'fleet_manager');
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    describe.each([
        ['trips', (id) => `/api/vehicles/${id}/trips`], 
        ['safety-trend', (id) => `/api/vehicles/${id}/safety-trend`],
    ])('GET /api/vehicles/:vehicleId/%s', (_label, buildUrl) => {

        test('fleet manager can access trips for their own group\'s vehicle', async () => {
            const res = await request(app)
                .get(buildUrl(vehicleA))
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.vehicle_id).toBe(vehicleA)
        });

        test('fleet manager gets 404 for trips on a vehicle outside their group', async () => {
            const res = await request(app)
                .get(buildUrl(vehicleB))
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });

        test('admin can access vehicle regardless of group', async () => {
            const res = await request(app)
                .get(buildUrl(vehicleB))
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
        });
    });
});