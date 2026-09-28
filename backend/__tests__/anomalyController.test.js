'use strict';

process.env.JWT_SECRET = 'test_secret_key';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { mockQuery } = require('pg');
const generateToken = require('../tests/generateToken');
const { _resetDataClockProbe } = require('../src/services/period');

const VEHICLES = ['V001', 'V002', 'V003', 'V004', 'V005', 'V006', 'V999'];

function exposureRows() {
    return VEHICLES.map((vehicle_id) => ({
        vehicle_id, distance_km: '500', trip_count: '10', active_days: '5',
    }));
}

// Six peers at 2 harsh brakes per 100 km, one vehicle at 20.
function incidentRows() {
    return VEHICLES.map((vehicle_id) => ({
        vehicle_id,
        harsh_brakes: vehicle_id === 'V999' ? '100' : '10',
        harsh_accelerations: '0',
        harsh_cornering: '0',
        overspeed_events: '0',
        idling_events: '0',
        crashes: '0',
        total_events: vehicle_id === 'V999' ? '100' : '10',
    }));
}

function routeQuery(sql) {
    if (sql.includes('fleet_manager_assignments')) {
        return { rows: [{ id: 1, name: 'Delivery vehicles' }] };
    }
    if (sql.includes('fleet_group_id IS NULL')) return { rows: [{ count: 0 }] };
    if (sql.includes('fleet_group_id = ANY')) {
        return { rows: VEHICLES.map((vehicle_id) => ({ vehicle_id })) };
    }
    if (sql.includes('to_regproc')) return { rows: [{ present: false }] };
    if (sql.includes('current_vehicle_position')) {
        return { rows: [{ data_now: '2026-09-21T10:00:00Z' }] };
    }
    if (sql.includes('FROM trips')) return { rows: exposureRows() };
    if (sql.includes('FROM vehicle_events')) return { rows: incidentRows() };
    if (sql.includes('FROM clean_telemetry')) return { rows: [] };
    return { rows: [] };
}

describe('GET /api/anomalies', () => {
    let managerToken;
    let viewerToken;

    beforeAll(() => {
        managerToken = generateToken(1, 'manager@test.com', 'fleet_manager');
        viewerToken = generateToken(2, 'viewer@test.com', 'viewer');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        _resetDataClockProbe();
        mockQuery.mockImplementation((sql) => Promise.resolve(routeQuery(sql)));
    });

    test('rejects an unauthenticated request', async () => {
        const response = await request(app).get('/api/anomalies');
        expect(response.status).toBe(401);
    });

    test('rejects a role without reporting access', async () => {
        const response = await request(app)
            .get('/api/anomalies')
            .set('Authorization', `Bearer ${viewerToken}`);
        expect(response.status).toBe(403);
    });

    test('rejects a fleet group the manager is not assigned to', async () => {
        const response = await request(app)
            .get('/api/anomalies?scope_type=group&scope_id=99')
            .set('Authorization', `Bearer ${managerToken}`);

        expect(response.status).toBe(403);
    });

    test('returns fleet-relative anomalies for the managed scope', async () => {
        const response = await request(app)
            .get('/api/anomalies')
            .set('Authorization', `Bearer ${managerToken}`);

        expect(response.status).toBe(200);

        const payload = response.body.data || response.body;
        expect(payload.anomalies.method).toBe('fleet_relative');
        expect(payload.scope.vehicleCount).toBe(VEHICLES.length);
        expect(payload.anomalies.flagged).toHaveLength(1);
        expect(payload.anomalies.flagged[0].vehicleId).toBe('V999');
        expect(payload.anomalies.flagged[0].flags[0].feature).toBe('harshBrakingPer100Km');
    });

    test('rejects an unknown period type', async () => {
        const response = await request(app)
            .get('/api/anomalies?period_type=fortnightly')
            .set('Authorization', `Bearer ${managerToken}`);

        expect(response.status).toBe(400);
    });

    test('accepts a custom period and requires both bounds', async () => {
        const missing = await request(app)
            .get('/api/anomalies?period_type=custom&from=2026-09-01')
            .set('Authorization', `Bearer ${managerToken}`);
        expect(missing.status).toBe(400);

        const valid = await request(app)
            .get('/api/anomalies?period_type=custom&from=2026-09-01&to=2026-09-08')
            .set('Authorization', `Bearer ${managerToken}`);
        expect(valid.status).toBe(200);
    });
});