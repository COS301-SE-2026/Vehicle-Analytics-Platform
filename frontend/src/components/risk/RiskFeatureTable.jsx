import PropTypes from 'prop-types';



const BAR_GRADIENT = 'linear-gradient(to right, #1e3a5f, #14304F)';

const FEATURE_LABELS = {
  safety:   { label: 'Avg safety score (30d)' },
  harsh:    { label: 'Harsh events per trip'  },
  speeding: { label: 'Speeding ratio'         },
  weekend:  { label: 'Weekend trip ratio'     },
  distance: { label: 'Distance (30d, km)'     },
  recency:  { label: 'Days since last trip'   },
};

export default function RiskFeatureTable({ features = {}, topFactors = [] }) {
  if (!features || Object.keys(features).length === 0) {
    return <p className="text-sm text-gray-400">No feature breakdown available.</p>;
  }

  const weightByName = {};
  (topFactors || []).forEach((f) => {
    weightByName[f.name] = f.weight;
  });

  const maxKnownWeight = Math.max(
    0.01,
    ...Object.values(weightByName).filter((w) => Number.isFinite(w))
  );

  const rows = Object.entries(FEATURE_LABELS).map(([key, cfg]) => {
    const value = features[key];
    let weight = weightByName[cfg.label];

    const inTop3 = Number.isFinite(weight);
    if (!inTop3) weight = 0;

    return {
      key,
      label: cfg.label,
      value,
      weight,
      inTop3,
      barWidthPct: inTop3 ? Math.min(100, (weight / maxKnownWeight) * 100) : 0,
    };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left font-medium text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Feature</th>
            <th className="text-right font-medium text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Value</th>
            <th className="text-right font-medium text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-gray-100">
              <td className="px-3 py-2 text-gray-700">
                {r.label}
                {!r.inTop3 && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400">
                    not in top 3
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right text-gray-900 font-medium tabular-nums">
                {typeof r.value === 'number' && !Number.isNaN(r.value)
                  ? r.value.toFixed(2)
                  : '—'}
              </td>
              <td className="px-3 py-2 text-right">
                {r.inTop3 ? (
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${r.barWidthPct}%`,
                          background: BAR_GRADIENT,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 tabular-nums w-10 text-right">
                      {r.weight.toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

RiskFeatureTable.propTypes = {
  features: PropTypes.object,
  topFactors: PropTypes.array,
};
