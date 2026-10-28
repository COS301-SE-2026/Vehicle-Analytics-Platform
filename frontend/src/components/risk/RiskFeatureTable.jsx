import PropTypes from 'prop-types';

const FEATURE_LABELS = {
  safety:   { label: 'Avg safety score (30d)' },
  harsh:    { label: 'Harsh events per trip'  },
  speeding: { label: 'Speeding ratio'         },
  weekend:  { label: 'Weekend trip ratio'     },
  distance: { label: 'Distance (30d, km)'     },
  recency:  { label: 'Days since last trip'   },
};

export default function RiskFeatureTable({ features = {} }) {
  if (!features || Object.keys(features).length === 0) {
    return <p className="text-sm text-gray-400">No feature breakdown available.</p>;
  }

  const rows = Object.entries(FEATURE_LABELS).map(([key, cfg]) => {
    return {
      key,
      label: cfg.label,
      value: features[key],
    };
  });

  return (
    <div className="overflow-hidden rounded-lg border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left font-medium text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Feature</th>
            <th className="text-right font-medium text-xs text-gray-500 uppercase tracking-wider px-3 py-2">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-gray-100">
              <td className="px-3 py-2 text-gray-700">
                {r.label}
              </td>
              <td className="px-3 py-2 text-right text-gray-900 font-medium tabular-nums">
                {typeof r.value === 'number' && !Number.isNaN(r.value)
                  ? r.value.toFixed(2)
                  : '—'}
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
};
