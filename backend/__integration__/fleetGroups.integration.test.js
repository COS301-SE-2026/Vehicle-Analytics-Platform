jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');

const {pool} = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');


describe('Fleet Groups Admin CRUD - Integration tests. real db no mocks', () => {
    let adminId;
    let managerId;
    let secondManagerId;
    let groupId;
    let adminToken;
    let managerToken;


    async function cleanup() {
        await pool.query(`
            DELETE FROM fleet_assignment_audit_log
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-fg-%')
            `);

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-fg-%')
            `);   
            
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-FG-%' 
            `);     

        await pool.query(`
            DELETE FROM users
            WHERE email LIKE 'covtest-fg-%' 
            `);  
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-fg-admin-sub', 'COVTEST FG Admin', 'covtest-fg-admin@example.com', 'admin', true)
            RETURNING id
        `);

        adminId = admin.rows[0].id;


        const manager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-fg-manager-sub', 'COVTEST FG Manager', 'covtest-fg-manager@example.com', 'fleet_manager', true)
            RETURNING id
        `);

        managerId = manager.rows[0].id;

        const secondManager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-fg-manager2-sub', 'COVTEST FG Manager Two', 'covtest-fg-manager2@example.com', 'fleet_manager', true)
            RETURNING id
        `);

        secondManagerId = secondManager.rows[0].id;


        const group = await pool.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-FG-Group-A') RETURNING id
        `);
        groupId = group.rows[0].id;

        adminToken = generateTestToken(adminId, 'covtest-fg-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-fg-manager@example.com', 'fleet_manager');
    });


    afterAll(async () => {
        await cleanup();
        await pool.end();
    });


    describe('GET /api/fleet-groups', () => {
        test('admin can list fleet groups', async () => {
            const res = await request(app)
                .get('/api/fleet-groups')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            const group = res.body.data.groups.find((g) => g.id === groupId);

            expect(group).toBeDefined();
            expect(group.is_unassigned).toBe(true);
            expect(group.vehicle_count).toBe(0);
        });


        test('non-admin (fleet_manager) is rejected', async () => {
            const res = await request(app)
                .get('/api/fleet-groups')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(403);
        });


        test('unauthenticated request is rejected', async () => {
            const res = await request(app).get('/api/fleet-groups');
            expect(res.status).toBe(401);
        });
    });


    describe('POST /api/fleet-groups/:id/assignments', () => {
        test('admin can assign fleet manager to a group', async () => {
            const res = await request(app)
                .post(`/api/fleet-groups/${groupId}/assignments`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({managerId});

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);


            const check = await pool.query(`
                SELECT * FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2
                `,[groupId, managerId]
            );

            expect(check.rows.length).toBe(1);


            const auditCheck = await pool.query(`
                SELECT * FROM fleet_assignment_audit_log WHERE fleet_group_id = $1 AND fleet_manager_id = $2 AND action = 'ASSIGNED'
                `, [groupId, managerId]
            );

            expect(auditCheck.rows.length).toBe(1);
        });

        test('assigning the same manager to the same group again returns 409',  async () =>{
            const res = await request(app)
                .post(`/api/fleet-groups/${groupId}/assignments`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ managerId});

            expect(res.status).toBe(409);
            expect(res.body.success).toBe(false);
        });

        test('assigning a non fleet manager user is rejected with 400',  async () =>{
            const res = await request(app)
                .post(`/api/fleet-groups/${groupId}/assignments`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ managerId: adminId});

            expect(res.status).toBe(400);
        });


        test('assigning to a non existing group returns returns 404',  async () =>{
            const res = await request(app)
                .post(`/api/fleet-groups/999999999/assignments`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ managerId: secondManagerId});

            expect(res.status).toBe(404);
        });   

        test('missing manager returns 400',  async () =>{
            const res = await request(app)
                .post(`/api/fleet-groups/${groupId}/assignments`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});

            expect(res.status).toBe(400);
        });

        test('non admin cannot assign',  async () =>{
            const res = await request(app)
                .post(`/api/fleet-groups/${groupId}/assignments`)
                .set('Authorization', `Bearer ${managerToken}`)
                .send({ managerId: secondManagerId});

            expect(res.status).toBe(403);
        });
    });


    describe('DELETE /api/fleet-groups/:id/assignments/:managerId', () => {
        test('admin can remove a fleet manager assignment', async () => {
            const res = await request(app)
                .delete(`/api/fleet-groups/${groupId}/assignments/${managerId}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);


            const check = await pool.query(`
                SELECT * FROM fleet_manager_assignments WHERE fleet_group_id = $1 AND fleet_manager_id = $2
                `,[groupId, managerId]
            );

            expect(check.rows.length).toBe(0);


            const auditCheck = await pool.query(`
                SELECT * FROM fleet_assignment_audit_log WHERE fleet_group_id = $1 AND fleet_manager_id = $2 AND action = 'REMOVED'
                `, [groupId, managerId]
            );

            expect(auditCheck.rows.length).toBe(1);
        });

        test('remove non existent assignment returns 404',  async () =>{
            const res = await request(app)
                .delete(`/api/fleet-groups/${groupId}/assignments/${managerId}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(res.status).toBe(404);
        });

        test('non admin cannot remove assignment',  async () =>{
            const res = await request(app)
                .delete(`/api/fleet-groups/${groupId}/assignments/${secondManagerId}`)
                .set('Authorization', `Bearer ${managerToken}`)

            expect(res.status).toBe(403);
        });
    })
})