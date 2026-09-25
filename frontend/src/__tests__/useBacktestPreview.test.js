import { renderHook, waitFor, act } from '@testing-library/react';
import useBacktestPreview from '@/hooks/useBacktestPreview';
import { fetchBacktestMock } from '../../__mocks__/backtestMock';

jest.mock('../../__mocks__/backtestMock', () => ({
  fetchBacktestMock: jest.fn(),
}));

const MOCK_RESPONSE = {
  total_alerts: 214,
  vehicles_affected: 9,
  by_day: [{ date: '2026-06-01', count: 5 }],
  samples: [{ vehicle_id: 'VP-1', time: new Date().toISOString(), breach_value: '110', threshold_value: '90' }],
};

describe('useBacktestPreview', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchBacktestMock.mockReset();
    fetchBacktestMock.mockResolvedValue(MOCK_RESPONSE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not fetch when fleetGroupId is not set', () => {
    renderHook(() =>
      useBacktestPreview({ conditionType: 'speed_threshold', params: {}, fleetGroupId: '', enabled: true })
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(fetchBacktestMock).not.toHaveBeenCalled();
  });

  test('does not fetch when enabled is false, even with a fleet group set', () => {
    renderHook(() =>
      useBacktestPreview({ conditionType: 'speed_threshold', params: {}, fleetGroupId: 'fg-1', enabled: false })
    );

    act(() => jest.advanceTimersByTime(1000));

    expect(fetchBacktestMock).not.toHaveBeenCalled();
  });

  test('reports hasRequiredInputs correctly', () => {
    const { result, rerender } = renderHook(
      ({ fleetGroupId }) =>
        useBacktestPreview({ conditionType: 'speed_threshold', params: {}, fleetGroupId, enabled: true }),
      { initialProps: { fleetGroupId: '' } }
    );

    expect(result.current.hasRequiredInputs).toBe(false);

    rerender({ fleetGroupId: 'fg-1' });
    expect(result.current.hasRequiredInputs).toBe(true);
  });

  test('fetches after the debounce delay once enabled with a fleet group', async () => {
    const { result } = renderHook(() =>
      useBacktestPreview({
        conditionType: 'speed_threshold',
        params: { max_speed_kmh: 90 },
        fleetGroupId: 'fg-1',
        enabled: true,
      })
    );

    expect(fetchBacktestMock).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));
    expect(fetchBacktestMock).toHaveBeenCalledTimes(1);
    expect(fetchBacktestMock).toHaveBeenCalledWith(
      {
        condition_type: 'speed_threshold',
        condition_params: { max_speed_kmh: 90 },
        fleet_group_id: 'fg-1',
        days: 30,
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test('debounces rapid param changes into a single fetch', async () => {
    const { result, rerender } = renderHook(
      ({ params }) =>
        useBacktestPreview({ conditionType: 'speed_threshold', params, fleetGroupId: 'fg-1', enabled: true }),
      { initialProps: { params: { max_speed_kmh: 80 } } }
    );

    act(() => jest.advanceTimersByTime(200));
    rerender({ params: { max_speed_kmh: 85 } });
    act(() => jest.advanceTimersByTime(200));
    rerender({ params: { max_speed_kmh: 90 } });
    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));

    expect(fetchBacktestMock).toHaveBeenCalledTimes(1);
    expect(fetchBacktestMock).toHaveBeenCalledWith(
      expect.objectContaining({ condition_params: { max_speed_kmh: 90 } }),
      expect.anything()
    );
  });

  test('re-fetches when params change after settling', async () => {
    const { result, rerender } = renderHook(
      ({ params }) =>
        useBacktestPreview({ conditionType: 'speed_threshold', params, fleetGroupId: 'fg-1', enabled: true }),
      { initialProps: { params: { max_speed_kmh: 80 } } }
    );

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.data).toEqual(MOCK_RESPONSE));

    rerender({ params: { max_speed_kmh: 120 } });
    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(fetchBacktestMock).toHaveBeenCalledTimes(2));
  });

  test('sets loading true while the request is in flight, false after', async () => {
    let resolvePromise;
    fetchBacktestMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const { result } = renderHook(() =>
      useBacktestPreview({ conditionType: 'speed_threshold', params: {}, fleetGroupId: 'fg-1', enabled: true })
    );

    act(() => jest.advanceTimersByTime(500));
    await waitFor(() => expect(result.current.loading).toBe(true));

    act(() => resolvePromise(MOCK_RESPONSE));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  test('sets error when the fetch rejects with a non-abort error', async () => {
    fetchBacktestMock.mockRejectedValueOnce(new Error('Network down'));

    const { result } = renderHook(() =>
      useBacktestPreview({ conditionType: 'speed_threshold', params: {}, fleetGroupId: 'fg-1', enabled: true })
    );

    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(result.current.error).toBe('Network down'));
    expect(result.current.loading).toBe(false);
  });

  test('does not set error for an aborted request', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchBacktestMock.mockRejectedValueOnce(abortError);

    const { result, rerender } = renderHook(
      ({ params }) =>
        useBacktestPreview({ conditionType: 'speed_threshold', params, fleetGroupId: 'fg-1', enabled: true }),
      { initialProps: { params: { max_speed_kmh: 80 } } }
    );

    act(() => jest.advanceTimersByTime(500));
    rerender({ params: { max_speed_kmh: 90 } });
    act(() => jest.advanceTimersByTime(500));

    await waitFor(() => expect(fetchBacktestMock).toHaveBeenCalled());
    expect(result.current.error).toBe('');
  });
});
