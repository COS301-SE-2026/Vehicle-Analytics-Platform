jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));



const mockServiceInstance = {
  predictAll: jest.fn(),
};

jest.mock('../src/services/riskPredictionService', () => {
  return jest.fn().mockImplementation(() => mockServiceInstance);
});

const cron = require('node-cron');
const {
  startRiskPredictionJob,
  runDailyRiskPrediction,
} = require('../src/jobs/riskPredictionJob');

describe('riskPredictionJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceInstance.predictAll.mockReset();
  });

  describe('startRiskPredictionJob()', () => {
    test('schedules a daily cron job', () => {
      startRiskPredictionJob();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    test('uses the 03:00 SAST schedule expression', () => {
      startRiskPredictionJob();
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 3 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'Africa/Johannesburg' })
      );
    });
  });

  describe('runDailyRiskPrediction()', () => {
    test('calls predictAll on the service', async () => {
      mockServiceInstance.predictAll.mockResolvedValueOnce({ scored: 115, alerts: 79 });
      await runDailyRiskPrediction();
      expect(mockServiceInstance.predictAll).toHaveBeenCalledTimes(1);
    });

    test('does not throw when the service fails', async () => {
      mockServiceInstance.predictAll.mockRejectedValueOnce(new Error('model missing'));
      await expect(runDailyRiskPrediction()).resolves.toBeUndefined();
    });

    test('handles missing scored/alerts gracefully', async () => {
      mockServiceInstance.predictAll.mockResolvedValueOnce({});
      await expect(runDailyRiskPrediction()).resolves.toBeUndefined();
    });
  });
});
