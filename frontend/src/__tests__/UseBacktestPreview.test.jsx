import { renderHook, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import useBacktestPreview from '@/hooks/useBacktestPreview';

jest.mock('axios');

jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: { getState: () => ({ token: 'test-token' }) },
}));

const MOCK_RESPONSE = {
  total_alerts: 214,
  vehicles_affected: 9,
  by_day: [{ date: '2026-06-01', count: 5 }],
  samples: [
    { vehicle_id: 'VP-1', time: new Date().toISOString(), breach_value: '110', threshold_value: '90' },
  ],
};

// speed_threshold needs max_speed_kmh before the hook will fetch at all,
// so every test that expects a request has to supply it.
const COMPLETE_PARAMS = { max_speed_kmh: 90 };

describe('useBacktestPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    axios.post.mockReset();
    axios.post.mockResolvedValue({ data: MOCK_RESPONSE });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not fetch when fleetGroupId is not set', () => {
    renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: '',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('does not fetch when enabled is false, even with a fleet group set', () => {
    renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: false,
      })
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('does not fetch when the params for the condition type are incomplete', () => {
    renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: {},
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('reports hasRequiredInputs correctly', () => {
    const { result, rerender } = renderHook(
      ({ fleetGroupId }) =>
        useBacktestPreview({
          conditionType: 'speed_threshold',
          params: COMPLETE_PARAMS,
          fleetGroupId,
          enabled: true,
        }),
      { initialProps: { fleetGroupId: '' } }
    );

    expect(result.current.hasRequiredInputs).toBe(false);

    rerender({ fleetGroupId: 'fg-1' });
    expect(result.current.hasRequiredInputs).toBe(true);
  });

  test('reports paramsComplete separately from hasRequiredInputs', () => {
    const { result, rerender } = renderHook(
      ({ params }) =>
        useBacktestPreview({
          conditionType: 'speed_threshold',
          params,
          fleetGroupId: 'fg-1',
          enabled: true,
        }),
      { initialProps: { params: {} } }
    );

    expect(result.current.paramsComplete).toBe(false);
    expect(result.current.hasRequiredInputs).toBe(false);

    rerender({ params: COMPLETE_PARAMS });
    expect(result.current.paramsComplete).toBe(true);
    expect(result.current.hasRequiredInputs).toBe(true);
  });

  test('fetches after the debounce delay once enabled with a fleet group', async () => {
    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    expect(axios.post).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));
    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/custom-alerts/backtest'),
      {
        condition_type: 'speed_threshold',
        condition_params: COMPLETE_PARAMS,
        fleet_group_id: 'fg-1',
        days: 30,
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test('sends the bearer token from the auth store', async () => {
    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
    );
  });

  test('debounces rapid param changes into a single fetch', async () => {
    const { result, rerender } = renderHook(
      ({ params }) =>
        useBacktestPreview({
          conditionType: 'speed_threshold',
          params,
          fleetGroupId: 'fg-1',
          enabled: true,
        }),
      { initialProps: { params: { max_speed_kmh: 80 } } }
    );

    act(() => jest.advanceTimersByTime(200));
    rerender({ params: { max_speed_kmh: 85 } });
    act(() => jest.advanceTimersByTime(200));
    rerender({ params: { max_speed_kmh: 90 } });
    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));

    expect(axios.post).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ condition_params: { max_speed_kmh: 90 } }),
      expect.anything()
    );
  });

  test('re-fetches when params change after settling', async () => {
    const { result, rerender } = renderHook(
      ({ params }) =>
        useBacktestPreview({
          conditionType: 'speed_threshold',
          params,
          fleetGroupId: 'fg-1',
          enabled: true,
        }),
      { initialProps: { params: { max_speed_kmh: 80 } } }
    );

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));

    rerender({ params: { max_speed_kmh: 120 } });
    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(axios.post).toHaveBeenCalledTimes(2));
  });

  test('clears data when the inputs stop being valid', async () => {
    const { result, rerender } = renderHook(
      ({ fleetGroupId }) =>
        useBacktestPreview({
          conditionType: 'speed_threshold',
          params: COMPLETE_PARAMS,
          fleetGroupId,
          enabled: true,
        }),
      { initialProps: { fleetGroupId: 'fg-1' } }
    );

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));

    rerender({ fleetGroupId: '' });
    await waitFor(() => expect(result.current.data).toBeNull());
  });

  test('sets loading true while the request is in flight, false after', async () => {
    let resolvePromise;
    axios.post.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.loading).toBe(true));

    await act(async () => {
      resolvePromise({ data: MOCK_RESPONSE });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  test('sets error when the fetch rejects with a non-abort error', async () => {
    axios.post.mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.error).toBe('Network down'));
    expect(result.current.loading).toBe(false);
  });

  test('prefers the API error message over the axios message', async () => {
    axios.post.mockRejectedValueOnce({
      message: 'Request failed with status code 400',
      response: { data: { message: 'fleet_group_id is required' } },
    });

    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.error).toBe('fleet_group_id is required'));
  });

  test('does not set error for a cancelled request', async () => {
    const cancelled = Object.assign(new Error('canceled'), {
      name: 'CanceledError',
      code: 'ERR_CANCELED',
    });
    axios.post.mockRejectedValueOnce(cancelled);

    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: COMPLETE_PARAMS,
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(result.current.error).toBe('');
  });
});