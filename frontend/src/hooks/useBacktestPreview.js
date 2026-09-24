import { useEffect, useRef, useState } from 'react';
import { fetchBacktestMock } from '../services/__mocks__/backtestMock';

const DEBOUNCE_MS = 500;
const DEFAULT_DAYS = 30;

/**
 * Owns the "fetch a backtest preview whenever the rule's settings
 * change" logic in one place. Works for every condition_type without
 * branching, since the backtest API takes the exact same
 * { condition_type, condition_params, fleet_group_id, days } shape
 * regardless of which rule type is selected — the type-specific
 * logic lives entirely server-side 
 *
 * A fleet group must be selected before this fires at all — a rule
 * can't be created without one, so there's nothing meaningful to
 * preview until it's set.
 *
 * @param {object} args
 * @param {string} args.conditionType
 * @param {object} args.params 
 * @param {string|number} args.fleetGroupId
 * @param {number} [args.days]  - defaults to 30 days
 * @param {boolean} [args.enabled] 
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

  const hasRequiredInputs = Boolean(fleetGroupId) && Boolean(conditionType);

  useEffect(() => {
    if (!enabled || !hasRequiredInputs) {
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
        const result = await fetchBacktestMock(
          {
            condition_type: conditionType,
            condition_params: params,
            fleet_group_id: fleetGroupId,
            days,
          },
          { signal: controller.signal }
        );
        setData(result);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load preview');
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceRef.current);
    };
    
  }, [conditionType, JSON.stringify(params), fleetGroupId, days, enabled, hasRequiredInputs]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { data, loading, error, hasRequiredInputs };
}