'use strict';

jest.mock('../db/pool', () => ({ pool: { name: 'pool' } }));

jest.mock('../services/scopeResolver', () => {
    class ScopeError extends Error {
        constructor(message, statusCode = 400) {
            super(message);
            this.statusCode = statusCode;
        }
    }
    return { resolveScope: jest.fn(), ScopeError };
});

jest.mock('../services/period', () => ({
    resolvePeriod: jest.fn(),
    getDataClock: jest.fn(),
    PERIOD_TYPES: ['weekly', 'monthly', 'current', 'custom'],
}));

jest.mock('../services/anomalyAnalytics', () => ({ getAnomalyFeatures: jest.fn() }));

const { resolveScope, ScopeError } = require('../services/scopeResolver');
const { resolvePeriod, getDataClock } = require('../services/period');
const { getAnomalyFeatures } = require('../services/anomalyAnalytics');
const { getAnomalies } = require('../controllers/anomalyController');

const PERIOD = {
    type: 'current',
    label: 'Last 7 days',
    fromDate: '2026-09-21',
    toDate: '2026-09-27',
    days: 7,
    from: new Date('2026-09-20T22:00:00Z'),
    to: new Date('2026-09-27T22:00:00Z'),
};

const FLEET_IDS = Array.from({ length: 10 }, (_, i) => `V${i}`);

function features(ids) {
    return ids.map((id, i) => ({
        vehicleId: id,
        distanceKm: 500,
        tripCount: 20,
        activeDays: 5,
        p90TripMaxSpeedKmh: 100,
        maxSpeedKmh: 110,
        counts: {
            harshBrakes: id === 'V9' ? 90 : 10 + (i % 3),
            harshAccelerations: 5,
            harshCornering: 0,
            overspeedEvents: 8 + (i % 2),
            idlingEvents: 0,
            crashes: 0,
            totalEvents: (id === 'V9' ? 90 : 10 + (i % 3)) + 5 + 8 + (i % 2),
        },
    }));
}

function scope(scopeType, vehicleIds, extra = {}) {
    return {
        scopeType,
        scopeId: null,
        label: `${scopeType} label`,
        vehicleIds,
        vehicleCount: vehicleIds.length,
        groupIds: [],
        ...extra,
    };
}

function makeRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const USER = { id: 'u1', role: 'fleet_manager' };

beforeEach(() => {
    jest.clearAllMocks();
    getDataClock.mockResolvedValue(new Date('2026-09-28T00:00:00Z'));
    resolvePeriod.mockReturnValue(PERIOD);
    getAnomalyFeatures.mockImplementation(async (db, ids) => features(ids));
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

describe('getAnomalies peer group', () => {
    test('fleet scope is its own peer group and every vehicle is reported', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { scope_type: 'fleet' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(resolveScope).toHaveBeenCalledTimes(1);
        expect(getAnomalyFeatures).toHaveBeenCalledWith(expect.anything(), FLEET_IDS, PERIOD);

        const data = res.json.mock.calls[0][0].data;
        expect(data.peerGroup).toEqual({ type: 'fleet', label: 'fleet label', vehicleCount: 10 });
        expect(data.anomalies.summary.vehiclesInScope).toBe(10);
        expect(data.anomalies.flagged.map((v) => v.vehicleId)).toEqual(['V9']);
    });

    test('a single vehicle is compared against the authorised fleet', async () => {
        resolveScope
            .mockResolvedValueOnce(scope('vehicle', ['V3']))
            .mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { scope_type: 'vehicle', scope_id: 'V3' } }, res);

        expect(resolveScope).toHaveBeenNthCalledWith(2, expect.anything(), USER, { scopeType: 'fleet', scopeId: null });
        expect(getAnomalyFeatures).toHaveBeenCalledWith(expect.anything(), FLEET_IDS, PERIOD);

        const data = res.json.mock.calls[0][0].data;
        expect(data.scope.type).toBe('vehicle');
        expect(data.peerGroup.type).toBe('fleet');
        expect(data.anomalies.vehicles.map((v) => v.vehicleId)).toEqual(['V3']);
        expect(data.anomalies.flagged).toEqual([]);
        expect(data.anomalies.headline).toMatch(/^V3 is within the fleet's normal range/);
    });

    test('selected vehicles missing from the fleet list are still included as peers', async () => {
        resolveScope
            .mockResolvedValueOnce(scope('vehicles', ['V9', 'EXTRA']))
            .mockResolvedValueOnce(scope('fleet', FLEET_IDS.slice(0, 9)));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { scope_type: 'vehicles', scope_id: ['V9', 'EXTRA'] } }, res);

        const requested = getAnomalyFeatures.mock.calls[0][1];
        expect(requested).toEqual(expect.arrayContaining([...FLEET_IDS.slice(0, 9), 'V9', 'EXTRA']));
        expect(new Set(requested).size).toBe(requested.length);

        const data = res.json.mock.calls[0][0].data;
        expect(data.anomalies.vehicles.map((v) => v.vehicleId).sort()).toEqual(['EXTRA', 'V9']);
        expect(data.anomalies.flagged.map((v) => v.vehicleId)).toEqual(['V9']);
    });

    test('a group scope compares within the group and says so', async () => {
        resolveScope.mockResolvedValueOnce(scope('group', FLEET_IDS, { scopeId: '4' }));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { scope_type: 'group', scope_id: '4' } }, res);

        expect(resolveScope).toHaveBeenCalledTimes(1);
        const data = res.json.mock.calls[0][0].data;
        expect(data.anomalies.peers.noun).toBe('group');
        expect(data.anomalies.headline).toMatch(/group median/);
    });
});

describe('getAnomalies errors', () => {
    test('an unauthorised scope is rejected with the resolver status', async () => {
        resolveScope.mockRejectedValueOnce(new ScopeError('Not authorised for this vehicle', 403));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { scope_type: 'vehicle', scope_id: 'X' } }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(getAnomalyFeatures).not.toHaveBeenCalled();
    });

    test('a failure resolving the peer fleet is not swallowed', async () => {
        resolveScope
            .mockResolvedValueOnce(scope('vehicle', ['V3']))
            .mockRejectedValueOnce(new ScopeError('No fleet assigned', 403));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { scope_type: 'vehicle', scope_id: 'V3' } }, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(getAnomalyFeatures).not.toHaveBeenCalled();
    });

    test('an invalid period type is a 400', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { period_type: 'yearly' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('an unexpected failure is a 500', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        getAnomalyFeatures.mockRejectedValueOnce(new Error('connection reset'));
        const res = makeRes();

        await getAnomalies({ user: USER, query: {} }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(console.error).toHaveBeenCalled();
    });
});

describe('getAnomalies custom periods', () => {
    test('a custom range passes parsed dates to the period resolver', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { period_type: 'custom', from: '2026-09-01', to: '2026-09-07' } }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const args = resolvePeriod.mock.calls[0][0];
        expect(args.periodType).toBe('custom');
        expect(args.from).toBeInstanceOf(Date);
        expect(args.to).toBeInstanceOf(Date);
    });

    test('a custom range without both ends is a 400', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { period_type: 'custom', from: '2026-09-01' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('an unparseable date is a 400', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        const res = makeRes();

        await getAnomalies({ user: USER, query: { period_type: 'custom', from: 'not-a-date', to: '2026-09-07' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('a range the period resolver rejects is a 400, not a 500', async () => {
        resolveScope.mockResolvedValueOnce(scope('fleet', FLEET_IDS));
        resolvePeriod.mockImplementationOnce(() => { throw new Error('from must be before to'); });
        const res = makeRes();

        await getAnomalies({ user: USER, query: { period_type: 'custom', from: '2026-09-07', to: '2026-09-01' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('a rolling period uses the data clock unless an anchor is given', async () => {
        resolveScope.mockResolvedValue(scope('fleet', FLEET_IDS));

        await getAnomalies({ user: USER, query: { period_type: 'current', current_days: '14' } }, makeRes());
        expect(getDataClock).toHaveBeenCalledTimes(1);
        expect(resolvePeriod.mock.calls[0][0].currentDays).toBe(14);

        await getAnomalies({ user: USER, query: { period_type: 'current', anchor: '2026-09-10' } }, makeRes());
        expect(getDataClock).toHaveBeenCalledTimes(1);
        expect(resolvePeriod.mock.calls[1][0].anchor).toEqual(new Date('2026-09-10'));
    });
});