import { renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import useNewAlertToasts from '../hooks/useNewAlertToasts';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/alerts/ToastProvider';

jest.mock('axios');
jest.mock('../store/authStore');
jest.mock('../components/alerts/ToastProvider');

const POLL_INTERVAL_MS = 20000;

describe('useNewAlertToasts', () => {
  let mockToast;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    mockToast = {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      dismiss: jest.fn(),
    };
    useToast.mockReturnValue(mockToast);

    useAuthStore.getState = jest.fn().mockReturnValue({ token: 'test-token' });

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    console.error.mockRestore();
  });

  test('does not poll before the interval elapses', () => {
    renderHook(() => useNewAlertToasts());
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('polls the endpoint with the Authorization header after the interval elapses', async () => {
    axios.get.mockResolvedValue({
      data: { data: { alerts: [], checked_at: '2026-09-02T18:00:00.000Z' } },
    });

    renderHook(() => useNewAlertToasts());

    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/alerts/triggered/new'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer test-token' },
      })
    );
  });

  test('omits the Authorization header when there is no token', async () => {
    useAuthStore.getState.mockReturnValue({ token: null });
    axios.get.mockResolvedValue({
      data: { data: { alerts: [], checked_at: '2026-09-02T18:00:00.000Z' } },
    });

    renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    expect(axios.get).toHaveBeenCalledWith(expect.any(String), {
      params: expect.any(Object),
      headers: {},
    });
  });

  test('does not show a toast when there are no new alerts', async () => {
    axios.get.mockResolvedValue({
      data: { data: { alerts: [], checked_at: '2026-09-02T18:00:00.000Z' } },
    });

    renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    expect(mockToast.error).not.toHaveBeenCalled();
  });

    test('shows a single-alert toast when exactly one new alert comes back', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          alerts: [
            {
              id: 1,
              vehicle_id: 'VH-001',
              condition_type: 'safety_score_drop',
              rule_snapshot: { name: 'Safety Score Rule' },
            },
          ],
          checked_at: '2026-09-02T18:00:00.000Z',
        },
      },
    });

    renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(mockToast.warning).toHaveBeenCalledTimes(1));

    expect(mockToast.warning).toHaveBeenCalledWith(
      'Alert Rule Breached',
      expect.stringContaining('VH-001')
    );
    expect(mockToast.warning).toHaveBeenCalledWith(
      'Alert Rule Breached',
      expect.stringContaining('Safety Score Rule')
    );
  });

  test('falls back to condition_type when rule_snapshot has no name', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          alerts: [
            { id: 1, vehicle_id: 'VH-002', condition_type: 'speed_threshold', rule_snapshot: null },
          ],
          checked_at: '2026-09-02T18:00:00.000Z',
        },
      },
    });

    renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(mockToast.warning).toHaveBeenCalledTimes(1));

    expect(mockToast.warning).toHaveBeenCalledWith(
      'Alert Rule Breached',
      expect.stringContaining('speed_threshold')
    );
  });

  test('shows a single batched toast when multiple new alerts come back', async () => {
    axios.get.mockResolvedValue({
      data: {
        data: {
          alerts: [
            { id: 1, vehicle_id: 'VH-001', condition_type: 'speed_threshold', rule_snapshot: {} },
            { id: 2, vehicle_id: 'VH-002', condition_type: 'safety_score_drop', rule_snapshot: {} },
            { id: 3, vehicle_id: 'VH-003', condition_type: 'trip_duration_exceeded', rule_snapshot: {} },
          ],
          checked_at: '2026-09-02T18:00:00.000Z',
        },
      },
    });

    renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(mockToast.warning).toHaveBeenCalledTimes(1));

    expect(mockToast.warning).toHaveBeenCalledWith(
      '3 New Alerts',
      expect.stringContaining('3 vehicles')
    );
  });

  
  test('uses checked_at from the previous response as "since" on the next poll', async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { data: { alerts: [], checked_at: '2026-09-02T18:00:00.000Z' } },
      })
      .mockResolvedValueOnce({
        data: { data: { alerts: [], checked_at: '2026-09-02T18:00:30.000Z' } },
      });

    renderHook(() => useNewAlertToasts());

    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2));

    expect(axios.get.mock.calls[1][1].params.since).toBe('2026-09-02T18:00:00.000Z');
  });

  test('logs the error and does not throw when the request fails', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));

    renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);

    await waitFor(() => expect(console.error).toHaveBeenCalled());
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  test('stops polling after unmount', async () => {
    axios.get.mockResolvedValue({
      data: { data: { alerts: [], checked_at: '2026-09-02T18:00:00.000Z' } },
    });

    const { unmount } = renderHook(() => useNewAlertToasts());
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

    unmount();
    jest.advanceTimersByTime(POLL_INTERVAL_MS * 3);

    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});