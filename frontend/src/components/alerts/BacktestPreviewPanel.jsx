import { Sparkles, X } from 'lucide-react';

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

/**
 * Purely presentational — renders whatever data/loading/error it's
 * given. Has no idea what rule type is selected or how the data was
 * fetched; that's useBacktestPreview's job. This keeps the panel
 * reusable across every condition_type without branching here either.
 */
export default function BacktestPreviewPanel({ data, loading, error, onClose }) {
  const maxDay = data?.by_day?.length
    ? data.by_day.reduce((max, d) => (d.count > max.count ? d : max), data.by_day[0])
    : null;
  const maxCount = maxDay?.count ?? 1;

  return (
    <div className="flex w-[340px] flex-col rounded-xl bg-fleet-surface animate-in fade-in slide-in-from-left-2 duration-150">
      <div className="flex items-center justify-between border-b border-fleet-border px-6 py-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fleet-blue" />
          <h3 className="font-display text-xl font-semibold text-fleet-text">
            Impact Simulation
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Simulation"
          className="text-fleet-secondary hover:text-fleet-text"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {error && (
          <div className="rounded-md border border-fleet-alert/30 bg-fleet-alert/10 px-3 py-2 text-sm text-fleet-alert">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-fleet-blue/5 border border-fleet-blue/20 px-4 py-3">
          <div className="text-2xl font-bold text-fleet-text">
            {loading ? '…' : data?.total_alerts ?? '—'}
          </div>
          <div className="text-xs text-fleet-secondary">
            Estimated Triggers
            {typeof data?.vehicles_affected === 'number' && !loading && (
              <span> · {data.vehicles_affected} vehicles affected</span>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wide text-fleet-secondary">
              30-Day Trigger Frequency
            </span>
            {maxDay && !loading && (
              <span className="text-fleet-secondary">
                Peak: {maxDay.count} alerts
              </span>
            )}
          </div>
          <div className="flex items-end gap-[3px] h-20">
            {loading || !data?.by_day
              ? Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-fleet-border animate-pulse"
                    style={{ height: '40%' }}
                  />
                ))
              : data.by_day.map((d, i) => (
                  <div
                    key={d.date ?? i}
                    title={`${d.date}: ${d.count} alerts`}
                    className="flex-1 rounded-sm bg-fleet-blue"
                    style={{ height: `${Math.max(8, (d.count / maxCount) * 100)}%` }}
                  />
                ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-fleet-secondary">
            Sample Qualifying Breach Events {data?.samples ? `(${data.samples.length} Most Severe)` : ''}
          </div>
          <div className="space-y-2">
            {loading || !data?.samples
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-fleet-border animate-pulse" />
                ))
              : data.samples.map((s, i) => (
                  <div
                    key={`${s.vehicle_id}-${i}`}
                    className="flex items-center justify-between rounded-md border border-fleet-border px-3 py-2"
                  >
                    <span className="rounded bg-fleet-blue/10 px-2 py-0.5 text-xs font-mono font-semibold text-fleet-blue">
                      {s.vehicle_id}
                    </span>
                    <span className="rounded bg-fleet-alert/10 px-2 py-0.5 text-xs font-semibold text-fleet-alert">
                      {s.breach_value} km/h (+{Math.round(s.breach_value - s.threshold_value)})
                    </span>
                    <span className="text-xs text-fleet-secondary">{timeAgo(s.time)}</span>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}