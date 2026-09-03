
const FuelHistoryService = require('../src/services/fuelHistoryService');

const { Pool } = require('pg');





jest.mock('pg', () => {

    const mPool = {

        query: jest.fn(),

        end: jest.fn(),

    };

    return { Pool: jest.fn(() => mPool) };

});



describe('FuelHistoryService', () => {

    let service;

    let mockPool;


    
    beforeEach(() => {
    
        mockPool = new Pool();
    
        service = new FuelHistoryService();
    
        service.pool = mockPool;
    
        jest.clearAllMocks();
    
    });


    
    describe('getVehicleFuelHistory', () => {
    
        test('should return vehicle fuel history', async () => {
    
    
            const mockRows = [
    
                {
    
                    period_start: '2026-08-31',
    
                    period_end: '2026-09-01',
    
                    total_distance: 355.5,
    
                    total_fuel: 41.83,
    
                    avg_efficiency: 8.5,
    
                    trip_count: 7,
    
                    efficiency_change: 0.5
    
                }
    
            ];
    
            mockPool.query.mockResolvedValue({ rows: mockRows });


            
            const result = await service.getVehicleFuelHistory('1000', 'week', 10);
            
            expect(result).toEqual(mockRows);
            
            expect(mockPool.query).toHaveBeenCalled();
        });


        
        
        
        test('should return empty array when no data found', async () => {
        
            mockPool.query.mockResolvedValue({ rows: [] });
        
            const result = await service.getVehicleFuelHistory('9999', 'week', 10);
        
            expect(result).toEqual([]);
        
        });


        
        test('should handle fallback to day when no week data', async () => {
        
            mockPool.query
        
            .mockResolvedValueOnce({ rows: [] })
        
            .mockResolvedValueOnce({ rows: [{ period_start: '2026-08-31', avg_efficiency: 8.5 }] });
        
            
            
            const result = await service.getVehicleFuelHistory('1000', 'month', 10);
            
            expect(result).toBeDefined();
        });





        
        test('should handle database error', async () => {
        
            mockPool.query.mockRejectedValue(new Error('Database error'));
        
            const result = await service.getVehicleFuelHistory('1000', 'week', 10);
        
            expect(result).toEqual([]);
        
        });
    });




    
    describe('getFleetFuelHistory', () => {
    
        test('should return fleet fuel history', async () => {
    
            const mockRows = [
    
                {
    
                    period_start: '2026-08-31',
    
                    total_distance: 355.5,
    
                    total_fuel: 41.83,
    
                    avg_efficiency: 8.5,
    
                    vehicles_tracked: 1
    
                }
    
            ];
    
            mockPool.query.mockResolvedValue({ rows: mockRows });


            
            const result = await service.getFleetFuelHistory('week', 10);
            
            expect(result).toEqual(mockRows);
        });



        
        test('should return empty array on error', async () => {
        
            mockPool.query.mockRejectedValue(new Error('Database error'));
        
            const result = await service.getFleetFuelHistory('week', 10);
        
            expect(result).toEqual([]);
        
        });
    });




    
    
    describe('getVehicleFuelTrend', () => {
    
        test('should return vehicle fuel trend', async () => {
    
            const mockRows = [
    
                {
    
                    period_start: '2026-08-31',
    
                    avg_efficiency: 8.5,
    
                    total_distance: 355.5,
    
                    total_fuel: 41.83,
    
                    trip_count: 7
    
                }
    
    
            ];
    
            mockPool.query.mockResolvedValue({ rows: mockRows });



            
            const result = await service.getVehicleFuelTrend('1000', 30);
            
            expect(result).toEqual(mockRows);
        });





        
        test('should return empty array on error', async () => {
        
            mockPool.query.mockRejectedValue(new Error('Database error'));
        
            const result = await service.getVehicleFuelTrend('1000', 30);
        
            expect(result).toEqual([]);
        
        });
    });




    
    
    describe('calculateAndStoreDailyHistory', () => {
    
        test('should calculate and store daily history', async () => {
    
            mockPool.query.mockResolvedValue({ rows: [] });
    
            await expect(service.calculateAndStoreDailyHistory('1000', new Date('2026-08-31')))
    
            .resolves.not.toThrow();
    
        });


        
        test('should handle error when calculating daily history', async () => {
        
            mockPool.query.mockRejectedValue(new Error('Database error'));
        
            await expect(service.calculateAndStoreDailyHistory('1000', new Date('2026-08-31')))
        
            .rejects.toThrow('Database error');
        
        });
    });
    
});
