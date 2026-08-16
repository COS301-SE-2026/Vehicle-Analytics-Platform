/* eslint-env jest */

const express = require('express');
const request = require('supertest');
const {Pool} = require('pg');

const {authenticate} = require('../src/middleware/auth');
const {requireFleetGroupAccess} = require('../src/middleware/fleetGroupAccess');
const generateTestToken = require('../tests/generateToken');
const {pool: sharedPool} = require('../src/db/pool');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number.parseInt(process.env.DB_PORT, 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

const app = express();
app.get('/test-fleet-scope', authenticate, requireFleetGroupAccess, (req,res) => {
    res.json({ fleetGroupIds: req.fleetGroupIds });
});

describe('requireFleetGroupAccess against real db no mocking', () => {
    let adminId;
    let managerId;
    let groupAId;
    let groupBId;

    async function cleanup() {
        await pool.query(`
            DELETE FROM fleet_manager_assignments
            WHERE fleet_manager_id
            IN (SELECT id FROM users WHERE email LIKE 'covtest-mw-%')
        `);

        await pool.query(`
            DELETE FROM fleet_groups
            WHERE name
            LIKE 'COVTEST-MW-%'
        `);

        await pool.query(`
            DELETE FROM users
            WHERE email
            LIKE 'covtest-mw-%'
        `);
    }


    beforeAll(async () => {
        await cleanup();

        //admin
        const admin = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-mw-admin-sub', 'COVTEST MW Admin', 'covtest-mw-admin@example.com', 'admin', true)
            RETURNING id
            `
        );

        adminId = admin.rows[0].id;

        //manager
        const manager = await pool.query(`
            INSERT INTO users (cognito_sub, name, email, role, is_active)
            VALUES ('covtest-mw-manager-sub', 'COVTEST MW Manager', 'covtest-mw-manager@example.com', 'fleet_manager', true)
            RETURNING id
            `
        );

        managerId = manager.rows[0].id;    
        
        //group A
        const groupA = await pool.query(`
            INSERT INTO fleet_groups (name) 
            VALUES ('COVTEST-MW-Group-A') 
            RETURNING id
            ` 
        );

        groupAId = groupA.rows[0].id;


        //group B
        const groupB = await pool.query(`
            INSERT INTO fleet_groups (name) 
            VALUES ('COVTEST-MW-Group-B') 
            RETURNING id
            ` 
        );

        groupBId = groupB.rows[0].id;


        //manager starts assigned to only group A
        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $3)
        `, [managerId, groupAId, adminId]
        );
    });


    afterAll(async () => {
        await cleanup();
        await pool.end();
        await sharedPool.end();
    });

    test('admin gets unrestricted access to fleetGroupIds: null', async () => {
        const token = generateTestToken(adminId, 'covtest-mw-admin@example.com', 'admin');

        const res = await request(app)
            .get('/test-fleet-scope')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.fleetGroupIds).toBeNull();
    });


    test('fleet manager gets scoped to their current assignment', async () => {
        const token = generateTestToken(managerId, 'covtest-mw-manager@example.com', 'fleet_manager');

        const res = await request(app)
            .get('/test-fleet-scope')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.fleetGroupIds).toEqual([groupAId]);
    });


    test('access reflects a NEW assignment on every request - no token caching', async () => {

        //add second assignment, group B withouut new token issued
        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $3)
            `, [managerId, groupBId, adminId]
        );

        const token = generateTestToken(managerId, 'covtest-mw-manager@example.com', 'fleet_manager');

        const res = await request(app)
            .get('/test-fleet-scope')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.fleetGroupIds.sort()).toEqual([groupAId, groupBId].sort());
    });

    test('access immediately revoked on next request after removal - no token caching', async () => {

        await pool.query(`
            DELETE FROM fleet_manager_assignments 
            WHERE fleet_manager_id = $1
            AND fleet_group_id = $2
            `, [managerId, groupBId]
        );

        const token = generateTestToken(managerId, 'covtest-mw-manager@example.com', 'fleet_manager');

        const res = await request(app)
            .get('/test-fleet-scope')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.fleetGroupIds).toEqual([groupAId]);
    });


    test('fleet manager with no ssignments gets an empty array not 403 error', async () => {

        await pool.query(`
            DELETE FROM fleet_manager_assignments 
            WHERE fleet_manager_id = $1
            `, [managerId]
        );

        const token = generateTestToken(managerId, 'covtest-mw-manager@example.com', 'fleet_manager');

        const res = await request(app)
            .get('/test-fleet-scope')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.fleetGroupIds).toEqual([]);

        //restore for tests that might run after this test
        await pool.query(`
            INSERT INTO fleet_manager_assignments (fleet_manager_id, fleet_group_id, assigned_by)
            VALUES ($1, $2, $3)
            `, [managerId, groupAId, adminId]
        ); 
    });


    test('deactivated manger loses access even though assignment row still exists', async () => {

        await pool.query(`
            UPDATE users SET is_active = false WHERE id = $1
            `, [managerId]
        );

        const token = generateTestToken(managerId, 'covtest-mw-manager@example.com', 'fleet_manager');

        const res = await request(app)
            .get('/test-fleet-scope')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.status).toBe(200);
        expect(res.body.fleetGroupIds).toEqual([]);
        
        //restore
        await pool.query(`
            UPDATE users SET is_active = true WHERE id = $1
            `, [managerId]);
    });

    test('rejects requests with no token at all', async () => {
        const res = await request(app).get('/test-fleet-scope');
        expect(res.status).toBe(401);
    });
});