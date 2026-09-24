jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));

const mockQuery = jest.fn();
jest.mock('../src/db/pool', () => ({
  pool: { query: mockQuery },
}));

const cron = require('node-cron');
const {
  startSafetyScoreRefreshJob,
  runSafetyScoreRefresh,
} = require('../src/jobs/safetyScoreRefreshJob');

describe('safetyScoreRefreshJob', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('startSafetyScoreRefreshJob()', () => {
    test('schedules a daily cron job', () => {
      startSafetyScoreRefreshJob();
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    test('uses the 02:00 SAST schedule expression', () => {
      startSafetyScoreRefreshJob();
      expect(cron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        expect.objectContaining({ timezone: 'Africa/Johannesburg' })
      );
    });
  });

  describe('runSafetyScoreRefresh()', () => {
    test('calls the refresh_safety_scores_daily procedure', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await runSafetyScoreRefresh();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toMatch(/refresh_safety_scores_daily/);
      expect(sql).toMatch(/CALL/i);
    });

    test('passes an empty JSON string as the config argument', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
      await runSafetyScoreRefresh();
      const params = mockQuery.mock.calls[0][1];
     
      
      expect(params).toEqual(['{}']);
    });

    test('does not throw when the procedure fails', async () => {
      mockQuery.mockRejectedValueOnce(new Error('cron not available'));
      await expect(runSafetyScoreRefresh()).resolves.toBeUndefined();
    });
  });
});
