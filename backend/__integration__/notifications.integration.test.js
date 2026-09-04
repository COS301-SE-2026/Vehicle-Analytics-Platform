jest.unmock('pg');

const request = require('supertest');
const app = require('../src/app');

const {pool} = require('../src/db/pool');
const generateTestToken = require('../tests/generateToken');


describe('Assignment and unassignment notifications endpoint', () => {
    let adminId;
    let managerId;
    let groupId;
    let adminToken;
    let managerToken;


    async function cleanup() {
        await pool.query(`
            DELETE FROM fleet_assignment_audit_log
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-notif-%')
            `);

        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id IN (SELECT id FROM users WHERE email LIKE 'covtest-notif-%')
            `);   
            
        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name LIKE 'COVTEST-NOTIF-%' 
            `);     

        await pool.query(`
            DELETE FROM users
            WHERE email LIKE 'covtest-notif-%' 
            `);  
    }

    beforeAll(async () => {
        await cleanup();

        const admin = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-notif-admin-sub', 'COVTEST NOTIF Admin', 'covtest-notif-admin@example.com', 'admin', true)
            RETURNING id
        `);

        adminId = admin.rows[0].id;


        const manager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-notif-manager-sub', 'COVTEST NOTIF Manager', 'covtest-notif-manager@example.com', 'fleet_manager', true)
            RETURNING id
        `);

        managerId = manager.rows[0].id;


        const group = await pool.query(`
            INSERT INTO fleet_groups (name) VALUES ('COVTEST-NOTIF-Group') RETURNING id
        `);
        groupId = group.rows[0].id;

        adminToken = generateTestToken(adminId, 'covtest-notif-admin@example.com', 'admin');
        managerToken = generateTestToken(managerId, 'covtest-notif-manager@example.com', 'fleet_manager');
    });


    afterAll(async () => {
        await cleanup();
        await pool.end();
    });


        test('invalid since parameter reterns 400', async () => {
            const res = await request(app)
                .get('/api/notifications?since=not-a-real-date')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(400);
        });

        test('polling with no prev events returns empty list', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${managerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.notifications).toEqual([]);
        });

        test('assignment shows up as notification for respective manager', async () => {
            const before = new Date(Date.now() - 1000).toISOString();
            const assignRes = await request(app)
                .post(`/api/fleet-groups/${groupId}/assignments`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({managerId});

            expect(assignRes.status).toBe(201);

            const notifRes = await request(app)
                .get(`/api/notifications?since=${before}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(notifRes.status).toBe(200);
            expect(notifRes.body.data.notifications).toHaveLength(1);
            expect(notifRes.body.data.notifications[0].action).toBe('ASSIGNED');
            expect(notifRes.body.data.notifications[0].message).toBe(
                'You have been added to Fleet Group: COVTEST-NOTIF-Group'
            );
        });

        test('assignment removal shows up as notification and polling since the assignment only returns the removal', async () => {
            const afterAssign = new Date().toISOString();

            //delay so removal performed_at is unambiguously later
            await new Promise((resolve) => setTimeout(resolve, 50));

            const removeRes = await request(app)
                .delete(`/api/fleet-groups/${groupId}/assignments/${managerId}`)
                .set('Authorization', `Bearer ${adminToken}`)

            expect(removeRes.status).toBe(200);

            const notifRes = await request(app)
                .get(`/api/notifications?since=${afterAssign}`)
                .set('Authorization', `Bearer ${managerToken}`);

            expect(notifRes.status).toBe(200);
            expect(notifRes.body.data.notifications).toHaveLength(1);
            expect(notifRes.body.data.notifications[0].action).toBe('REMOVED');
            expect(notifRes.body.data.notifications[0].message).toBe(
                'You no longer have access to Fleet Group: COVTEST-NOTIF-Group'
            );
        });


        test('admin never sees notifications under their own id as they have no audit rows belonging to them', async () => {

            const res = await request(app)
                .get(`/api/notifications?since=${new Date(0).toISOString()}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.notifications).toEqual([]);
        });


        test('unauthenticated request is rejected', async () => {

            const res = await request(app)
                .get('/api/notifications')

            expect(res.status).toBe(401);
        });
    });



