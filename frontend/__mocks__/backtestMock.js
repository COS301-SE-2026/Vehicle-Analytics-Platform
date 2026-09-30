// Shared fake backtest response, matching the agreed API contract exactly
// (POST /api/custom-alerts/backtest). Used by the Preview Impact panel
// until the real endpoint lands. 
//
// The mock ignores the actual condition_type/condition_params it's
// called with and always returns the same canned response. Once the
// real endpoint exists, the numbers will naturally vary with the
// rule's settings; until then this just proves the UI wiring works.

const MOCK_BACKTEST_RESPONSE = {
  total_alerts: 214,
  vehicles_affected: 9,
  by_day: [
    { date: '2026-05-14', count: 4 },
    { date: '2026-05-15', count: 6 },
    { date: '2026-05-16', count: 5 },
    { date: '2026-05-17', count: 9 },
    { date: '2026-05-18', count: 7 },
    { date: '2026-05-19', count: 8 },
    { date: '2026-05-20', count: 10 },
    { date: '2026-05-21', count: 6 },
    { date: '2026-05-22', count: 7 },
    { date: '2026-05-23', count: 9 },
    { date: '2026-05-24', count: 12 },
    { date: '2026-05-25', count: 8 },
    { date: '2026-05-26', count: 6 },
    { date: '2026-05-27', count: 11 },
    { date: '2026-05-28', count: 9 },
    { date: '2026-05-29', count: 7 },
    { date: '2026-05-30', count: 10 },
    { date: '2026-05-31', count: 13 },
    { date: '2026-06-01', count: 8 },
    { date: '2026-06-02', count: 9 },
    { date: '2026-06-03', count: 11 },
    { date: '2026-06-04', count: 7 },
    { date: '2026-06-05', count: 6 },
    { date: '2026-06-06', count: 9 },
    { date: '2026-06-07', count: 10 },
    { date: '2026-06-08', count: 8 },
    { date: '2026-06-09', count: 12 },
    { date: '2026-06-10', count: 18 },
    { date: '2026-06-11', count: 9 },
    { date: '2026-06-12', count: 5 },
  ],
  samples: [
    {
      vehicle_id: 'VP-7411',
      time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      breach_value: '124',
      threshold_value: '105',
      latitude: -25.7,
      longitude: 28.2,
    },
    {
      vehicle_id: 'VH-0042',
      time: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      breach_value: '118',
      threshold_value: '105',
      latitude: -25.8,
      longitude: 28.1,
    },
    {
      vehicle_id: 'VP-3882',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      breach_value: '112',
      threshold_value: '105',
      latitude: -25.6,
      longitude: 28.3,
    },
  ],
};

/**
 * Mimics the real backtest endpoint's shape and latency. Accepts the
 * same payload the real POST /api/custom-alerts/backtest would, so
 * callers don't need to change when the real fetch replaces this.
 */
export function fetchBacktestMock(payload, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      resolve(MOCK_BACKTEST_RESPONSE);
    }, 350);

    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
}