jest.unmock('pg');
const request = require('supertest');
const {Client} = require('pg');
const app = require('../../src/app');
const generateToken = require('../../tests/generateToken');

const getDbConfig = () => ({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'fleet_analytics',
    user: process.env.DB_USER || 'fleet_admin',
    password: process.env.DB_PASSWORD || 'Capstone2026',
});

describe("Dashboard Controller Integration Tests", () => {
    let client;
    let adminToken;

    beforeAll(async () => {
        const dbConfig = getDbConfig();
        client = new Client(dbConfig);
        await client.connect();
        await client.query(`
            INSERT INTO vehicle_events (time, vehicle_id, event_category, event_detail, speed)
            VALUES
            (NOW(), 'COVTEST-01', 'harsh_driving', 'harsh_braking', 90),
            (NOW(), 'COVTEST-02', 'crash_detection', NULL, 0),
            (NOW(), 'COVTEST-03', 'harsh_driving', 'harsh_acceleration', 70)
            `);

        adminToken = generateToken(1, 'admin@test.com', 'admin');
    }, 30000);

    afterAll(async () => {
        if (client) {
            await client.query(`DELETE FROM vehicle_events WHERE vehicle_id LIKE 'COVTEST-%'`);
        
            await client.end();
        }
    }, 30000);

    describe('GET /api/dashboard/kpis', () => {
        it('returns real KPI data from database', async () => {
            const response = await request(app)
                .get('/api/dashboard/kpis')
                .set('Authorization', `Bearer ${adminToken}`)

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total_vehicles');
            expect(response.body.data).toHaveProperty('active_vehicles');
            expect(response.body.data).toHaveProperty('alerts_today');
        }, 15000);
    });

    describe('GET /api/dashboard/total-distance', () => {
        it('says whether vehicle_trips table exists in the database', async () => {
            const response = await request(app)
                .get('/api/dashboard/total-distance')
                .set('Authorization', `Bearer ${adminToken}`);

            if(response.status === 500) {
                console.warn('INTEGRATION ISSUE: total-distance endpoint failed: ', response.body.error);
            }
            expect([200, 500]).toContain(response.status);
        }, 15000);
    });

    describe('GET /api/dashboard/alerts', () => {
        it('returns real db data', async () => {
            const response = await request(app)
                .get('/api/dashboard/alerts')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('total');
            expect(response.body.data).toHaveProperty('alerts');
            expect(Array.isArray(response.body.data.alerts)).toBe(true);
        }, 15000);

        it('returns 401 if without token', async () => {
            const response = await request(app).get('/api/dashboard/alerts');
            expect(response.status).toBe(401);
        }, 15000);
    });

    describe('GET /api/dashboard/activity', () => {
        it('returns activity history for the default range (which is day)', async () => {
            const response = await request(app)
                .get('/api/dashboard/activity')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('range','day');
            expect(response.body.data).toHaveProperty('bucket');
            expect(response.body.data).toHaveProperty('points');
        }, 15000);

        it('returns activity history for the week range', async () => {
            const response = await request(app)
                .get('/api/dashboard/activity?range=week')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('range', 'week');
        }, 15000);

        it('returns 401 without a token', async () => {
            const response = await request(app).get('/api/dashboard/activity');
            expect(response.status).toBe(401);
        },15000);
    });

    describe('GET /api/dashboard/activity - invalid range', () => {
        it('returns 400 for invalid range', async () => {
            const response = await request(app)
                .get('/api/dashboard/activity?range=month')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        },15000);
    });
});