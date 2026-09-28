import { useEffect, useState } from 'react';
import { getCoachingHistory } from '@/services/riskService';

function outcomeMeta(item) {
  if (item.outcome_delta === null) {
    return { text: 'Outcome pending', cls: 'text-gray-500' };
  }
  if (item.outcome_delta < 0) {
    return {
      text: `Risk fell ${Math.abs(Math.round(item.outcome_delta))} pts`,
      cls: 'text-emerald-600',
    };
  }
  return {
    text: `Risk rose ${Math.round(item.outcome_delta)} pts`,
    cls: 'text-rose-600',
  };
}

export default function CoachingPanel({ vehicleId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getCoachingHistory(vehicleId)
      .then((d) => {
        if (cancelled) return;
        const safe =
          d && Array.isArray(d.interventions)
            ? d
            : { vehicle_id: vehicleId, interventions: [], effectiveness_rate: null };
        setData(safe);
      })
      .catch((err) => {
        console.warn('CoachingPanel: failed to load history', err?.message);
        if (!cancelled) {
          setData({ vehicle_id: vehicleId, interventions: [], effectiveness_rate: null });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vehicleId]);

  if (loading) return <div className="text-sm text-gray-500">Loading coaching history…</div>;

  if (!data?.interventions || data.interventions.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No coaching interventions recorded — this vehicle has stayed below the HIGH threshold.
      </div>
    );
  }

  return (
    <div>
      {data.effectiveness_rate !== null && (
        <div className="text-sm mb-3 px-3 py-2 rounded bg-gray-50 text-gray-800">
          <strong>{Math.round(data.effectiveness_rate * 100)}%</strong> of past coaching
          nudges led to a measurable drop in risk within 7 days.
        </div>
      )}
      <ul className="space-y-3">
        {data.interventions.map((item) => {
          const outcome = outcomeMeta(item);
          return (
            <li key={item.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-xs text-gray-500">
                  {new Date(item.created_at).toLocaleDateString()} · {item.primary_factor}
                </span>
                <span className={`text-xs font-semibold ${outcome.cls}`}>
                  {outcome.text}
                </span>
              </div>
              <p className="text-sm text-gray-800 m-0">{item.recommendation}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
