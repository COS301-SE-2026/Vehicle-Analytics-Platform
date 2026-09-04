jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');

const {pool} = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');


describe('Vehicle to fleet group assignment endpoints', () => {
    let adminId;
    let managerId;
    let groupAId;
    let groupBId;
    let adminToken;
    let managerToken;

    const vehicleA = 'COVTEST-ASSIGN-A';
    const vehicleB = 'COVTEST-ASSIGN-B';
    const vehicleC = 'COVTEST-ASSIGN-C';


    async function cleanup() {
        await pool.query(`
            DELETE FROM vehicles
            WHERE vehicle_id IN ($1, $2, $3)
            `, [vehicleA, vehicleB, vehicleC]);

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-assign-%')
            `);   
            
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-ASSIGN-%' 
            `);     

        await pool.query(`
            DELETE FROM users
            WHERE email LIKE 'covtest-assign-%' 
            `);  
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-assign-admin-sub', 'COVTEST ASSIGN Admin', 'covtest-assign-admin@example.com', 'admin', true)
            RETURNING id
        `);

        adminId = admin.rows[0].id;


        const manager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-assign-manager-sub', 'COVTEST ASSIGN Manager', 'covtest-assign-manager@example.com', 'fleet_manager', true)
            RETURNING id
        `);

        managerId = manager.rows[0].id;


        const groupA = await pool.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-ASSIGN-Group-A') RETURNING id
        `);
        groupAId = groupA.rows[0].id;

        const groupB = await pool.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-ASSIGN-Group-B') RETURNING id
        `);
        groupBId = groupB.rows[0].id;

        //all 3 unassigned first
        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id)
            VALUES ($1, $2)
            `, [vehicleA, 'COVTEST-ASSIGN-DEV-A']
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id)
            VALUES ($1, $2)
            `, [vehicleB, 'COVTEST-ASSIGN-DEV-B']
        );

        await pool.query(`
            INSERT INTO vehicles (vehicle_id, device_id)
            VALUES ($1, $2)
            `, [vehicleC, 'COVTEST-ASSIGN-DEV-C']
        );

        adminToken = generateTestToken(adminId, 'covtest-assign-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-assign-manager@example.com', 'fleet_manager');
    });


    afterAll(async () => {
        await cleanup();
        await pool.end();
    });


    describe('PATCH /api/vehicles/:vehicleId/fleet-group', () => {
        test('admin can assign vehicle to a group', async () => {
            const res = await request(app)
                .patch(`/api/vehicles/${vehicleA}/fleet-group`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({fleetGroupId: groupAId});

            expect(res.status).toBe(200);
            expect(res.body.data.fleet_group_id).toBe(groupAId);

            const check = await pool.query('SELECT fleet_group_id FROM vehicles WHERE vehicle_id = $1', [vehicleA]);

            expect(check.rows[0].fleet_group_id).toBe(groupAId);
        });


        test('admin can unassign vehicle to a group by passing null', async () => {
            const res = await request(app)
                .patch(`/api/vehicles/${vehicleA}/fleet-group`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({fleetGroupId: null});


            expect(res.status).toBe(200);

            const check = await pool.query('SELECT fleet_group_id FROM vehicles WHERE vehicle_id = $1', [vehicleA]);

            expect(check.rows[0].fleet_group_id).toBeNull();
        });


        test('missing fleetGroupId returns 400', async () => {
            const res = await request(app)
                .patch(`/api/vehicles/${vehicleA}/fleet-group`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});


            expect(res.status).toBe(400);
        });

        test('assigning to a non existent group returns 404', async () => {
            const res = await request(app)
                .patch(`/api/vehicles/${vehicleA}/fleet-group`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({fleetGroupId: 999999999});


            expect(res.status).toBe(404);
        });

        test('assigning a non existent vehicle returns 404', async () => {
            const res = await request(app)
                .patch(`/api/vehicles/COVTEST-DOES-NOT-EXIST/fleet-group`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({fleetGroupId: groupAId});


            expect(res.status).toBe(404);
        });

        test('non admin cannot assign a vehicle to a group', async () => {
            const res = await request(app)
                .patch(`/api/vehicles/${vehicleA}/fleet-group`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({fleetGroupId: groupAId});


            expect(res.status).toBe(403);
        });
    });


    describe('PATCH /api/fleet-groups/:id/vehicles', () => {
        test('admin can bulk assign vehicles to a group', async () => {
            const res = await request(app)
                .patch(`/api/fleet-groups/${groupBId}/vehicles`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({vehicleIds: [vehicleB, vehicleC]});

            expect(res.status).toBe(200);
            expect(res.body.data.updated.sort()).toEqual([vehicleB, vehicleC].sort());
            expect(res.body.data.not_found).toEqual([]);


            const check = await pool.query(`
                SELECT vehicle_id, fleet_group_id 
                FROM vehicles
                WHERE vehicle_id IN ($1, $2) 
                `,[vehicleB, vehicleC]
            );

            for(const row of check.rows){
                expect(row.fleet_group_id).toBe(groupBId);
            }
        });

        test('bulk assign reports unknown vehicle ids without failing the whole batch', async () => {
            const res = await request(app)
                .patch(`/api/fleet-groups/${groupBId}/vehicles`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({vehicleIds: [vehicleB, 'COVTEST-DOES-NOT-EXIST'] });


            expect(res.status).toBe(200);
            expect(res.body.data.updated).toEqual([vehicleB]);
            expect(res.body.data.not_found).toEqual(['COVTEST-DOES-NOT-EXIST']);
        });

        test('empty vehicleIds return 400', async () => {
            const res = await request(app)
                .patch(`/api/fleet-groups/${groupBId}/vehicles`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({vehicleIds: [] });


            expect(res.status).toBe(400);
        });

        test('bulk assigning to a non existent group returns 404', async () => {
            const res = await request(app)
                .patch(`/api/fleet-groups/99999999999999/vehicles`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({vehicleIds: [vehicleB]});


            expect(res.status).toBe(404);
        });

        test('non admin cannot bulk assign vehicles', async () => {
            const res = await request(app)
                .patch(`/api/fleet-groups/${groupBId}/vehicles`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({vehicleIds: [vehicleB]});


            expect(res.status).toBe(403);
        });

    });
});