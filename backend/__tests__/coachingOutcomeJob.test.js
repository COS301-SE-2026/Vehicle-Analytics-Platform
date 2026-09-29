jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const mockServiceInstance = {
  measureCoachingOutcomes: jest.fn(),
};

jest.mock('../src/services/riskPredictionService', () => {
  return jest.fn().mockImplementation(() => mockServiceInstance);
});

const cron = require('node-cron');
const {
  startCoachingOutcomeJob,
  runCoachingOutcomeCheck,
} = require('../src/jobs/coachingOutcomeJob');

describe('coachingOutcomeJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServiceInstance.measureCoachingOutcomes.mockReset();
  });

  describe('startCoachingOutcomeJob()', () => {
    test('schedules a daily cron job', () => {
      startCoachingOutcomeJob();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    test('uses the 04:00 SAST schedule expression', () => {
      startCoachingOutcomeJob();
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 4 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'Africa/Johannesburg' })
      );
    });
  });

  describe('runCoachingOutcomeCheck()', () => {
    test('calls measureCoachingOutcomes on the service', async () => {
      mockServiceInstance.measureCoachingOutcomes.mockResolvedValueOnce({ updated: 5 });
      await runCoachingOutcomeCheck();
      expect(mockServiceInstance.measureCoachingOutcomes).toHaveBeenCalledTimes(1);
    });

    test('does not throw when the service fails', async () => {
      mockServiceInstance.measureCoachingOutcomes.mockRejectedValueOnce(new Error('db down'));
      await expect(runCoachingOutcomeCheck()).resolves.toBeUndefined();
    });

    test('handles a missing updated count gracefully', async () => {
      mockServiceInstance.measureCoachingOutcomes.mockResolvedValueOnce({});
      await expect(runCoachingOutcomeCheck()).resolves.toBeUndefined();
    });
  });
});
