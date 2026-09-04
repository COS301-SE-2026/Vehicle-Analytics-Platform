jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');
const{pool} = require('../src/db/pool');
const generateTokenTest = require('../tests/generateToken');
const generateTestToken = require('../tests/generateToken');


describe('Vehicle endpoints scoped to assigned group', () => {
    let adminId;
    let managerId;
    let groupAId;
    let groupBId;
    let adminToken;
    let managerToken;

    const vehicleA = 'COVTEST-VEH-A';
    const vehicleB = 'COVTEST-VEH-B';
    const vehicleUnassigned = 'COVTEST-VEH-U';

    async function cleanup() {

        await pool.query(`DELETE FROM vehicles WHERE vehicle_id IN ($1, $2, $3)`,
            [vehicleA, vehicleB, vehicleUnassigned]
        );

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-vs-%')
        `);
        
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-VS-%'
        `);

        await pool.query(`
            DELETE FROM users WHERE email LIKE 'covtest-vs-%'
        `);
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-vs-admin-sub', 'COVTEST VS Admin', 'covtest-vs-admin@example.com', 'admin', true)
            RETURNING id
            `);

        adminId = admin.rows[0].id;

        const manager = await pool.query (`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-vs-manager-sub', 'COVTEST VS Manager', 'covtest-vs-manager@example.com', 'fleet_manager', true)
            RETURNING id
            `);

        managerId = manager.rows[0].id; 
        
        const groupA = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-VS-Group-A')
            RETURNING id
            `)

        groupAId = groupA.rows[0].id;


        const groupB = await pool.query(`
            INSERT INTO fleet_groups (name)
            VALUES ('COVTEST-VS-Group-B')
            RETURNING id
            `)

        groupBId = groupB.rows[0].id;


        //manager assigned to Group A only
        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $3)
            `, [managerId, groupAId, adminId]
        );

        //3 vehicles one in each group and one unassigned
        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
            `, [vehicleA, 'COVTEST-DEV-A', groupAId]
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id, fleet_group_id)
            VALUES ($1, $2, $3)
            `, [vehicleB, 'COVTEST-DEV-B', groupBId]
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id)
            VALUES ($1, $2)
            `, [vehicleUnassigned, 'COVTEST-DEV-U']
        );


        adminToken = generateTestToken(adminId, 'covtest-vs-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-vs-manager@example.com', 'fleet_manager');
    });

    afterAll(async () => {
        await cleanup();
        await pool.end();
    });

    describe('GET /api/vehicles', () => {
        test('admin sees all three COVTEST vehicles', async () => {
            const res = await request(app)
                .get('/api/vehicles?limit=1000')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.data.vehicles.map(v => v.id);
            expect(ids).toContain(vehicleA);
            expect(ids).toContain(vehicleB);
            expect(ids).toContain(vehicleUnassigned);
        });

        test('fleet manager sees only their group\'s vehicle', async () => {
            const res = await request(app)
                .get('/api/vehicles?limit=1000')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.data.vehicles.map(v => v.id);
            expect(ids).toContain(vehicleA);
            expect(ids).not.toContain(vehicleB);
            expect(ids).not.toContain(vehicleUnassigned);
        });
    });


    describe('GET /api/vehicles/:vehicleId', () => {
        test('fleet manager can access their own group\'s vehicle', async () => {
            const res = await request(app)
                .get(`/api/vehicles/${vehicleA}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.vehicle.id).toBe(vehicleA);
        });


        test('fleet manager gets 404 for a vehicle outside their group', async () => {
            const res = await request(app)
                .get(`/api/vehicles/${vehicleB}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });       


        test('fleet manager gets 404 for unassigned vehicle', async () => {
            const res = await request(app)
                .get(`/api/vehicles/${vehicleUnassigned}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(404);
        });
        
        test('admin can access any vehicle regardless of group', async () => {
            const res = await request(app)
                .get(`/api/vehicles/${vehicleB}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.vehicle.id).toBe(vehicleB);
        });
    });

    describe('GET /api/vehicles/locations', () => {
        test('fleet manager only sees their vehicle in live loctions', async () => {
            const res = await request(app)
                .get('/api/vehicles/locations')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            const ids = res.body.data.vehicles.map(v => v.id);
            expect(ids).toContain(vehicleA);
            expect(ids).not.toContain(vehicleB);
            expect(ids).not.toContain(vehicleUnassigned);            
        })
    })
})