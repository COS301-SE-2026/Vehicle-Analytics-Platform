'use strict';

jest.mock('../src/services/safetyAnalytics', () => ({
    _EVENT_FILTER: "status = 'valid'",
    REPORT_TIMEZONE: 'UTC'
}));

const { getAnomalyFeatures, _buildReporting, _buildVehicle } = require('../src/services/anomalyAnalytics');

describe('anomalyAnalytics', () => {
    let mockDb;
    const mockPeriod = {
        from: new Date('2026-09-01T00:00:00Z'),
        to: new Date('2026-09-07T00:00:00Z'),
        fromDate: '2026-09-01',
        toDate: '2026-09-07',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        
        mockDb = {
            query: jest.fn().mockResolvedValue({ rows: [] }) 
        };
    });

    afterEach(() => {
        console.log.mockRestore();
        console.warn.mockRestore();
    });

    describe('Validation and Edge Cases', () => {
        test('throws if database client is missing', async () => {
            await expect(getAnomalyFeatures(null, ['V1'], mockPeriod))
                .rejects.toThrow(/requires a pg client or pool/);
        });

        test('throws if vehicleIds is not an array', async () => {
            await expect(getAnomalyFeatures(mockDb, 'V1', mockPeriod))
                .rejects.toThrow(/requires a vehicleIds array/);
        });

        test('throws if period is missing or invalid', async () => {
            await expect(getAnomalyFeatures(mockDb, ['V1'], {}))
                .rejects.toThrow(/requires a resolved period with Date bounds/);
        });

        test('returns empty array if vehicleIds is empty', async () => {
            const result = await getAnomalyFeatures(mockDb, [], mockPeriod);
            expect(result).toEqual([]);
            expect(mockDb.query).not.toHaveBeenCalled();
        });
    });

    describe('Database Queries and Fallbacks', () => {
        test('wraps database errors securely for primary queries', async () => {
            const dbError = new Error('Connection timeout');
            dbError.code = '57P01';
            mockDb.query.mockRejectedValueOnce(dbError);

            await expect(getAnomalyFeatures(mockDb, ['V1'], mockPeriod))
                .rejects.toThrow(/exposure query failed/);
        });

        test('handles telemetry distance unavailability gracefully', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [] }); // exposure
            
            const dbError = new Error('Table not found');
            dbError.code = '42P01';
            mockDb.query.mockRejectedValueOnce(dbError); // telemetry
            
            mockDb.query.mockResolvedValueOnce({ rows: [] }); // incidents
            mockDb.query.mockResolvedValueOnce({ rows: [] }); // reporting

            const results = await getAnomalyFeatures(mockDb, ['V1'], mockPeriod);
            
            expect(results[0].telemetryDistanceKm).toBeNull();
            expect(results[0].alignedCounts).toBeNull();
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('telemetry distance unavailable'));
        });

        test('handles missing local dates in period for telemetry', async () => {
            const badPeriod = { ...mockPeriod, fromDate: null };
            
            const results = await getAnomalyFeatures(mockDb, ['V1'], badPeriod);
            
            expect(mockDb.query).toHaveBeenCalledTimes(3); 
            expect(results[0].telemetryDistanceKm).toBeNull();
        });

        test('handles reporting history unavailability gracefully', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [] }) // exposure
                .mockResolvedValueOnce({ rows: [] }) // telemetry
                .mockResolvedValueOnce({ rows: [] }) // incidents
                .mockRejectedValueOnce(new Error('Reporting failed')); // reporting

            const results = await getAnomalyFeatures(mockDb, ['V1'], mockPeriod);
            
            expect(results[0].reporting.checked).toBe(false);
            expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('event reporting history unavailable'));
        });
    });

    describe('Data Aggregation Pipeline', () => {
        test('correctly maps and aggregates all data sources into vehicle objects', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    vehicle_id: 'V1',
                    distance_km: 1500.5,
                    trip_count: 10,
                    active_days: 5,
                    p90_trip_max_speed_kmh: 110,
                    max_speed_kmh: 120
                }]
            });

            mockDb.query.mockResolvedValueOnce({
                rows: [
                    { vehicle_id: 'V1', day: '2026-09-02', km: 200 },
                    { vehicle_id: 'V1', day: '2026-09-03', km: 300 }
                ]
            });

            mockDb.query.mockResolvedValueOnce({
                rows: [
                    {
                        vehicle_id: 'V1',
                        day: '2026-09-02',
                        harsh_brakes: 2,
                        harsh_accelerations: 1,
                        harsh_cornering: 0,
                        overspeed_events: 5,
                        idling_events: 1,
                        crashes: 0,
                        total_events: 9
                    },
                    {
                        vehicle_id: 'V1',
                        day: '2026-09-08', 
                        harsh_brakes: 1,
                        harsh_accelerations: 0,
                        harsh_cornering: 0,
                        overspeed_events: 0,
                        idling_events: 0,
                        crashes: 0,
                        total_events: 1
                    }
                ]
            });

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    vehicle_id: 'V1',
                    harsh_brakes: true,
                    harsh_accelerations: false,
                    harsh_cornering: true,
                    overspeed_events: true,
                    idling_events: false
                }]
            });

            const results = await getAnomalyFeatures(mockDb, ['V1'], mockPeriod);
            
            expect(results).toHaveLength(1);
            const v1 = results[0];
            
            expect(v1.vehicleId).toBe('V1');
            expect(v1.tripDistanceKm).toBe(1500.5);
            expect(v1.tripCount).toBe(10);
            expect(v1.activeDays).toBe(5);
            expect(v1.p90TripMaxSpeedKmh).toBe(110);
            
            expect(v1.telemetryDistanceKm).toBe(500); 
            expect(v1.telemetryDays).toBe(2);

            expect(v1.counts.harshBrakes).toBe(3); 
            expect(v1.counts.totalEvents).toBe(10); 
            
            expect(v1.alignedCounts.harshBrakes).toBe(2);
            expect(v1.alignedCounts.totalEvents).toBe(9);

            expect(v1.reporting.checked).toBe(true);
            expect(v1.reporting.types.harshBrakes).toBe(true);
            expect(v1.reporting.types.harshAccelerations).toBe(false);
        });

        test('handles malformed numbers and nulls gracefully', async () => {
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    vehicle_id: 'V1',
                    distance_km: 'invalid',
                    trip_count: null,
                    active_days: undefined,
                    p90_trip_max_speed_kmh: null,
                }]
            });

            const results = await getAnomalyFeatures(mockDb, ['V1'], mockPeriod);
            const v1 = results[0];

            expect(v1.tripDistanceKm).toBe(0);
            expect(v1.tripCount).toBe(0);
            expect(v1.activeDays).toBe(0);
            expect(v1.p90TripMaxSpeedKmh).toBeNull();
        });
    });

    describe('Internal Helpers', () => {
        test('_buildReporting handles unchecked history', () => {
            const reporting = _buildReporting({ checked: false }, null);
            expect(reporting.checked).toBe(false);
            expect(reporting.types).toBeNull();
        });

        test('_buildVehicle aggregates multiple incidents per day correctly', () => {
            const exposure = { distance_km: 100 };
            const incidents = [
                { day: '2026-09-02', harsh_brakes: 2, total_events: 2 },
                { day: '2026-09-02', harsh_brakes: 3, total_events: 3 }
            ];
            const distance = new Map([['2026-09-02', 50]]);
            const telemetry = { available: true };
            
            const v = _buildVehicle('V1', exposure, incidents, distance, telemetry, mockPeriod, null);
            
            expect(v.counts.harshBrakes).toBe(5);
            expect(v.alignedCounts.harshBrakes).toBe(5);
        });
    });
});