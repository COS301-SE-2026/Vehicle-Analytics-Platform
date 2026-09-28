import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';

const DEBOUNCE_MS = 500;
const DEFAULT_DAYS = 30;
const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

/**
 * Checks whether the rule's own required fields are actually filled
 * in for its condition_type, before we ever send it to the backtest
 * endpoint. Prevents sending e.g. an empty start_time/end_time for a
 * time_based_restriction rule, which the backend can't parse and
 * currently 500s on.
 */
function isParamsComplete(conditionType, params) {
  if (!params) return false;

  switch (conditionType) {
    case 'speed_threshold':
      return params.max_speed_kmh !== '' && params.max_speed_kmh != null;

    case 'time_based_restriction':
      return Boolean(params.start_time) && Boolean(params.end_time);

    case 'repeated_unsafe_events':
      return (
        Array.isArray(params.event_types) &&
        params.event_types.length > 0 &&
        params.count !== '' &&
        params.count != null &&
        params.window_minutes !== '' &&
        params.window_minutes != null
      );

    case 'safety_score_drop':
      return params.min_score !== '' && params.min_score != null;

    case 'trip_duration_exceeded':
      return (
        (params.max_trip_minutes !== '' && params.max_trip_minutes != null) ||
        (params.max_daily_minutes !== '' && params.max_daily_minutes != null)
      );

    default:
      return false;
  }
}

/**
 * Owns the "fetch a backtest preview whenever the rule's settings
 * change" logic in one place. Works for every condition_type without
 * branching on the fetch itself — only isParamsComplete varies per
 * type, since each rule type has different required fields.
 *
 * A fleet group and a fully-configured set of params must both be
 * present before this fires at all, so we never send an incomplete
 * request the backend can't handle.
 */
export default function useBacktestPreview({
  conditionType,
  params,
  fleetGroupId,
  days = DEFAULT_DAYS,
  enabled = true,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const paramsComplete = isParamsComplete(conditionType, params);
  const hasRequiredInputs = Boolean(fleetGroupId) && Boolean(conditionType) && paramsComplete;

  useEffect(() => {
    if (!enabled || !hasRequiredInputs) {
     
      setData(null);
      setError('');
      setLoading(false);
      return undefined;
    }

    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError('');

      try {
        const token = useAuthStore.getState().token;

        const res = await axios.post(
          `${API_BASE}/api/custom-alerts/backtest`,
          {
            condition_type: conditionType,
            condition_params: params,
            fleet_group_id: fleetGroupId,
            days,
          },
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          }
        );

        setData(res.data.data ?? res.data);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
          const message = err.response?.data?.message || err.message || 'Failed to load preview';
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conditionType, JSON.stringify(params), fleetGroupId, days, enabled, hasRequiredInputs]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { data, loading, error, hasRequiredInputs, paramsComplete };
}