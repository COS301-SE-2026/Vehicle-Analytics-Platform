jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock('../src/db/pool', () => ({
  pool: { query: mockQuery },
}));



const mockFuelServiceInstance = {
  calculateAndStoreDailyHistory: jest.fn(),
};

jest.mock('../src/services/fuelHistoryService', () => {
  return jest.fn().mockImplementation(() => mockFuelServiceInstance);
});

const cron = require('node-cron');
const {
  startFuelCalculationJob,
  calculateFuelForAllVehicles,
} = require('../src/jobs/fuelCalculationJob');

describe('fuelCalculationJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    mockFuelServiceInstance.calculateAndStoreDailyHistory.mockReset();
  });

  describe('startFuelCalculationJob()', () => {
    test('schedules a daily cron job', () => {
      startFuelCalculationJob();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    test('uses the 02:00 SAST schedule expression', () => {
      startFuelCalculationJob();
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'Africa/Johannesburg' })
      );
    });
  });

  describe('calculateFuelForAllVehicles()', () => {
    test('queries the vehicles table for all vehicles', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ vehicle_id: 'V001' }, { vehicle_id: 'V002' }], rowCount: 2 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });  // the fuel_calculation_log insert
      mockFuelServiceInstance.calculateAndStoreDailyHistory.mockResolvedValue(undefined);

      await calculateFuelForAllVehicles();

      expect(mockQuery).toHaveBeenCalled();
      const firstSql = mockQuery.mock.calls[0][0];
      expect(firstSql).toMatch(/FROM vehicles/i);
    });

    test('calls calculateAndStoreDailyHistory once per vehicle', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ vehicle_id: 'V001' }, { vehicle_id: 'V002' }], rowCount: 2 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockFuelServiceInstance.calculateAndStoreDailyHistory.mockResolvedValue(undefined);

      await calculateFuelForAllVehicles();

      expect(mockFuelServiceInstance.calculateAndStoreDailyHistory).toHaveBeenCalledTimes(2);
    });

    test('continues when a single vehicle fails (partial success)', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ vehicle_id: 'V001' }, { vehicle_id: 'V002' }], rowCount: 2 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });

      mockFuelServiceInstance.calculateAndStoreDailyHistory
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('fuel calc failed'));

      await expect(calculateFuelForAllVehicles()).resolves.toBeUndefined();
      expect(mockFuelServiceInstance.calculateAndStoreDailyHistory).toHaveBeenCalledTimes(2);
    });

    test('logs the run to fuel_calculation_log', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ vehicle_id: 'V001' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 });
      mockFuelServiceInstance.calculateAndStoreDailyHistory.mockResolvedValue(undefined);

      await calculateFuelForAllVehicles();

      const logInsert = mockQuery.mock.calls.find((c) =>
        String(c[0]).includes('fuel_calculation_log')
      );
      expect(logInsert).toBeDefined();
    });

    test('does not throw when the vehicles query fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db down'));
      await expect(calculateFuelForAllVehicles()).resolves.toBeUndefined();
    });
  });
});
