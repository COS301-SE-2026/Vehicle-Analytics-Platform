jest.mock('../src/middleware/auth');
jest.mock('@aws-sdk/client-cognito-identity-provider');

const { mockPool, mockQuery, setupMockData } = require('./setup/mockDb');
jest.mock('../src/db/pool', () => ({ pool: mockPool }));

const RiskPredictionService = require('../src/services/riskPredictionService');


const BASE_MODEL = {
  id: 1,
  trained_at: new Date(),
  training_rows: 5000,
  training_days: 90,
  intercept: 0,
  w_safety: -1,
  w_harsh: 1,
  w_speeding: 1,
  w_crashes: 0,
  w_weekend: 0,
  mean_safety: 50,
  std_safety: 10,
  mean_harsh: 2,
  std_harsh: 1,
  mean_speeding: 0.1,
  std_speeding: 0.1,
  mean_crashes: 0,
  std_crashes: 1,
  mean_weekend: 0,
  std_weekend: 1,
  precision_at_high: 0.85,
  recall_at_high: 0.9,
};

const BASE_FEATURES = {
  vehicle_id: 'V001',
  safety_feature: 50,
  harsh_feature: 2,
  speeding_feature: 0.1,
  weekend_feature: 0,
  distance_feature: 100,
  recency_feature: 1,
};

describe('RiskPredictionService', () => {
  let service;

  beforeEach(() => {
    setupMockData();
    jest.clearAllMocks();
    service = new RiskPredictionService();
    service.pool = mockPool;
  });

  describe('getModel()', () => {
    test('returns null when risk_model_weights is empty', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const model = await service.getModel();
      expect(model).toBeNull();
    });

    test('returns the latest trained model', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [BASE_MODEL], rowCount: 1 });
      const model = await service.getModel();
      expect(model).toEqual(BASE_MODEL);
    });
  });

  describe('scoreFeatures()', () => {
    test('returns a value between 0 and 100', () => {
      const score = service.scoreFeatures(BASE_MODEL, BASE_FEATURES);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('baseline features produce ~50 (sigmoid(0) = 0.5)', () => {
      const score = service.scoreFeatures(BASE_MODEL, BASE_FEATURES);
      expect(score).toBeCloseTo(50, 0);
    });

    test('higher harsh events produce a higher score', () => {
      const base = service.scoreFeatures(BASE_MODEL, BASE_FEATURES);
      const elevated = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        harsh_feature: 10,
      });
      expect(elevated).toBeGreaterThan(base);
    });

    test('lower safety score produces a higher risk', () => {
      const healthy = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        safety_feature: 90,
      });
      const unhealthy = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        safety_feature: 10,
      });
      expect(unhealthy).toBeGreaterThan(healthy);
    });

    test('higher speeding ratio produces a higher score', () => {
      const low = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        speeding_feature: 0.05,
      });
      const high = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        speeding_feature: 0.9,
      });
      expect(high).toBeGreaterThan(low);
    });

    test('null or undefined features are treated as zero (no NaN)', () => {
      const score = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        safety_feature: null,
        harsh_feature: undefined,
      });
      expect(Number.isFinite(score)).toBe(true);
    });

    test('non-numeric string features are coerced to zero', () => {
      const score = service.scoreFeatures(BASE_MODEL, {
        ...BASE_FEATURES,
        safety_feature: 'not a number',
        harsh_feature: 'also invalid',
      });
      expect(Number.isFinite(score)).toBe(true);
    });

    test('null model weights are treated as zero', () => {
      const brokenModel = { ...BASE_MODEL, w_safety: null, mean_safety: null };
      const score = service.scoreFeatures(brokenModel, BASE_FEATURES);
      expect(Number.isFinite(score)).toBe(true);
    });

    test('rounds to two decimals', () => {
      const score = service.scoreFeatures(BASE_MODEL, BASE_FEATURES);
      expect(Number.isFinite(score)).toBe(true);
      const decimals = String(score).split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe('classifyTier()', () => {
    test.each([
      [100, 'critical'],
      [80, 'critical'],
      [75, 'critical'],
      [74, 'high'],
      [55, 'high'],
      [50, 'high'],
      [49, 'medium'],
      [30, 'medium'],
      [25, 'medium'],
      [24, 'low'],
      [0, 'low'],
    ])('score %i maps to %s', (score, expected) => {
      expect(service.classifyTier(score)).toBe(expected);
    });
  });

  describe('buildTopFactors()', () => {
    test('returns at most 3 factors', () => {
      const factors = service.buildTopFactors(BASE_MODEL, BASE_FEATURES);
      expect(factors.length).toBeLessThanOrEqual(3);
    });

    test('factors are sorted descending by weight', () => {
      const factors = service.buildTopFactors(BASE_MODEL, {
        ...BASE_FEATURES,
        harsh_feature: 10,
        safety_feature: 10,
        speeding_feature: 0.9,
      });
      for (let i = 1; i < factors.length; i++) {
        expect(factors[i - 1].weight).toBeGreaterThanOrEqual(factors[i].weight);
      }
    });

    test('every factor has name, weight and value', () => {
      const factors = service.buildTopFactors(BASE_MODEL, BASE_FEATURES);
      factors.forEach((f) => {
        expect(f).toHaveProperty('name');
        expect(typeof f.name).toBe('string');
        expect(typeof f.weight).toBe('number');
        expect(typeof f.value).toBe('number');
      });
    });

    test('factor names match the neutral label set', () => {
      const factors = service.buildTopFactors(BASE_MODEL, {
        ...BASE_FEATURES,
        harsh_feature: 10,
        safety_feature: 10,
      });
      const allowed = new Set([
        'Avg safety score (30d)',
        'Harsh events per trip',
        'Speeding ratio',
        'Distance (30d, km)',
        'Days since last trip',
      ]);
      factors.forEach((f) => expect(allowed.has(f.name)).toBe(true));
    });

    test('handles null features without producing NaN weights', () => {
      const factors = service.buildTopFactors(BASE_MODEL, {
        ...BASE_FEATURES,
        safety_feature: null,
        harsh_feature: undefined,
      });
      factors.forEach((f) => {
        expect(Number.isFinite(f.weight)).toBe(true);
        expect(Number.isFinite(f.value)).toBe(true);
      });
    });
  });

  describe('recommendationFor()', () => {
    test.each([
      'Avg safety score (30d)',
      'Harsh events per trip',
      'Speeding ratio',
      'Days since last trip',
      'Distance (30d, km)',
    ])('returns a non-empty string for known factor "%s"', (factor) => {
      const rec = service.recommendationFor(factor);
      expect(typeof rec).toBe('string');
      expect(rec.length).toBeGreaterThan(10);
    });

    test('returns a fallback for unknown factors', () => {
      const rec = service.recommendationFor('Something totally unknown');
      expect(typeof rec).toBe('string');
      expect(rec.length).toBeGreaterThan(0);
    });
  });

  describe('predictAll()', () => {
    test('throws when no trained model exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      await expect(service.predictAll()).rejects.toThrow(/No trained model/);
    });

    test('upserts a prediction for every vehicle in the feature view', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [BASE_MODEL], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { ...BASE_FEATURES, vehicle_id: 'V001' },
            { ...BASE_FEATURES, vehicle_id: 'V002', harsh_feature: 10 },
          ],
          rowCount: 2,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await service.predictAll();
      expect(result.scored).toBe(2);
      expect(result).toHaveProperty('alerts');
      expect(typeof result.alerts).toBe('number');
    });

    test('creates coaching for HIGH/CRITICAL vehicles only', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [BASE_MODEL], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { ...BASE_FEATURES, vehicle_id: 'V001', safety_feature: 95, harsh_feature: 0, speeding_feature: 0 },
            { ...BASE_FEATURES, vehicle_id: 'V002', safety_feature: 5, harsh_feature: 15, speeding_feature: 1 },
          ],
          rowCount: 2,
        })
        .mockResolvedValue({ rows: [], rowCount: 0 });

      const result = await service.predictAll();
      expect(result.scored).toBe(2);
      expect(result.alerts).toBeLessThanOrEqual(2);
    });
  });

  describe('getVehicleRisk()', () => {
    test('returns null when no predictions exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await service.getVehicleRisk('NOPE');
      expect(result).toBeNull();
    });

    test('returns latest + trend for a vehicle with predictions', async () => {
      const rows = [
        {
          prediction_date: '2026-09-24',
          risk_score: 85,
          risk_tier: 'critical',
          top_factors: [{ name: 'Harsh events per trip', weight: 5, value: 10 }],
          feature_safety: 30,
          feature_harsh: 8,
          feature_speeding: 0.5,
          feature_weekend: 0.2,
          feature_distance: 500,
          feature_recency: 0,
        },
        {
          prediction_date: '2026-09-23',
          risk_score: 78,
          risk_tier: 'critical',
          top_factors: [],
          feature_safety: 35,
          feature_harsh: 6,
          feature_speeding: 0.4,
          feature_weekend: 0.1,
          feature_distance: 450,
          feature_recency: 0,
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

      const result = await service.getVehicleRisk('V001', 30);
      expect(result.vehicle_id).toBe('V001');
      expect(result.latest.risk_score).toBe(85);
      expect(result.latest.risk_tier).toBe('critical');
      expect(result.latest.features).toEqual({
        safety: 30, harsh: 8, speeding: 0.5, weekend: 0.2, distance: 500, recency: 0,
      });
      expect(result.trend).toHaveLength(2);
      expect(result.trend[0].date).toBe('2026-09-23');
      expect(result.trend[1].date).toBe('2026-09-24');
    });
  });

  describe('getFleetRisk()', () => {
    test('returns empty array when there are no predictions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await service.getFleetRisk();
      expect(result).toEqual([]);
    });

    test('returns ranked list with trend data', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { vehicle_id: 'V001', risk_score: 90, risk_tier: 'critical', top_factors: [{ name: 'Harsh events per trip', weight: 5, value: 10 }], prediction_date: '2026-09-24' },
            { vehicle_id: 'V002', risk_score: 40, risk_tier: 'medium', top_factors: [], prediction_date: '2026-09-24' },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [
            { vehicle_id: 'V001', prediction_date: '2026-09-23', risk_score: 85 },
            { vehicle_id: 'V001', prediction_date: '2026-09-24', risk_score: 90 },
            { vehicle_id: 'V002', prediction_date: '2026-09-24', risk_score: 40 },
          ],
          rowCount: 3,
        });

      const result = await service.getFleetRisk();
      expect(result).toHaveLength(2);
      expect(result[0].vehicle_id).toBe('V001');
      expect(result[0].risk_score).toBe(90);
      expect(result[0].trend).toHaveLength(2);
      expect(result[1].trend).toHaveLength(1);
    });
  });

  describe('getCoachingHistory()', () => {
    test('returns empty interventions when none exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await service.getCoachingHistory('V001');
      expect(result.vehicle_id).toBe('V001');
      expect(result.interventions).toEqual([]);
      expect(result.effectiveness_rate).toBeNull();
    });

    test('computes effectiveness rate from measured interventions', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 1, created_at: new Date(), recommendation_text: 'A', primary_factor: 'X', risk_score_before: 80, risk_score_after_7d: 70, outcome_delta: -10 },
          { id: 2, created_at: new Date(), recommendation_text: 'B', primary_factor: 'Y', risk_score_before: 75, risk_score_after_7d: 60, outcome_delta: -15 },
          { id: 3, created_at: new Date(), recommendation_text: 'C', primary_factor: 'Z', risk_score_before: 60, risk_score_after_7d: 65, outcome_delta: 5 },
          { id: 4, created_at: new Date(), recommendation_text: 'D', primary_factor: 'W', risk_score_before: 70, risk_score_after_7d: null, outcome_delta: null },
        ],
        rowCount: 4,
      });

      const result = await service.getCoachingHistory('V001');
      expect(result.effectiveness_rate).toBeCloseTo(2 / 3, 2);
      expect(result.interventions).toHaveLength(4);
    });
  });

  describe('measureCoachingOutcomes()', () => {
    test('returns the updated row count', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 7 });
      const result = await service.measureCoachingOutcomes();
      expect(result.updated).toBe(7);
    });
  });

  describe('getSimilarVehicles()', () => {
    test('returns empty array when no vehicles match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      const result = await service.getSimilarVehicles('V001', 5);
      expect(result).toEqual([]);
    });

    test('returns mapped vehicles with distance and features', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: 'V002',
            safety_feature: 40, harsh_feature: 5, speeding_feature: 0.3,
            weekend_feature: 0.1, distance_feature: 300, recency_feature: 1,
            risk_score: 75, risk_tier: 'high',
            distance: 12.345,
          },
        ],
        rowCount: 1,
      });

      const result = await service.getSimilarVehicles('V001', 5);
      expect(result).toHaveLength(1);
      expect(result[0].vehicle_id).toBe('V002');
      expect(result[0].distance).toBe(12.35);
      expect(result[0].risk_tier).toBe('high');
      expect(result[0].features.safety).toBe(40);
    });

    test('handles vehicles without a prediction (null risk_score)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            vehicle_id: 'V003',
            safety_feature: 50, harsh_feature: 2, speeding_feature: 0.1,
            weekend_feature: 0, distance_feature: 100, recency_feature: 0,
            risk_score: null, risk_tier: null,
            distance: 5.0,
          },
        ],
        rowCount: 1,
      });

      const result = await service.getSimilarVehicles('V001', 5);
      expect(result[0].risk_score).toBeNull();
      expect(result[0].risk_tier).toBeNull();
    });
  });
});
