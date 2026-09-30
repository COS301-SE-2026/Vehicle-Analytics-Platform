jest.mock('../src/db/pool', () => ({
  pool: { query: jest.fn() },
}));

const { pool } = require('../src/db/pool');
const RiskPredictionService = require('../src/services/riskPredictionService');

describe('RiskPredictionService scoping', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RiskPredictionService();
    service.pool = { query: pool.query };
  });

  describe('getFleetRisk', () => {
    test('passes null fleetGroupIds when unrestricted', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getFleetRisk(null);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toMatch(/fleet_group_id = ANY/);
      expect(params).toEqual([null]);
    });

    test('passes scoped fleetGroupIds for a manager', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      await service.getFleetRisk([3, 5, 6]);

      const [, params] = pool.query.mock.calls[0];
      expect(params).toEqual([[3, 5, 6]]);
    });
  });

  describe('getVehicleRisk', () => {
    test('includes scope filter in query', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await service.getVehicleRisk('1000', 30, [3]);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toMatch(/fleet_group_id = ANY/);
      expect(params).toEqual(['1000', 30, [3]]);
    });
  });

  describe('getCoachingHistory', () => {
    test('returns empty when vehicle is out of scope', async () => {
      // scope check returns nothing
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getCoachingHistory('1000', [3]);

      expect(result.interventions).toEqual([]);
      expect(result.effectiveness_rate).toBeNull();
      // Only the scope check query runs
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('returns interventions when vehicle is in scope', async () => {
      // Two mock values queued — scope check + interventions query
      pool.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getCoachingHistory('1000', [3]);

      expect(result.interventions).toEqual([]);
      expect(result.effectiveness_rate).toBeNull();
    });
  });

  describe('getSimilarVehicles', () => {
    test('filters both target and similar list by scope', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await service.getSimilarVehicles('1000', 5, [3]);

      const [sql, params] = pool.query.mock.calls[0];
      const scopeFilterCount = (sql.match(/fleet_group_id = ANY/g) || []).length;
      expect(scopeFilterCount).toBeGreaterThanOrEqual(2);
      expect(params).toEqual(['1000', 5, [3]]);
    });
  });
});
