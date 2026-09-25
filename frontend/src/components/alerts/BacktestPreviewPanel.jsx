import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, ChevronLeft, ChevronRight } from 'lucide-react';

const SAMPLES_PER_PAGE = 4;

function timeAgo(isoString) {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

function formatDuration(minutes) {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}


function getBreachColumn(conditionType) {
  switch (conditionType) {
    case 'speed_threshold':
      return { header: 'Speed Recorded', format: (v, t) => `${v} km/h (+${Math.round(v - t)})` };
    case 'trip_duration_exceeded':
      return {
        header: 'Trip Duration',
        format: (v, t) => `${formatDuration(v)} (+${formatDuration(Math.max(v - t, 0))})`,
      };
    case 'safety_score_drop':
      return {
        header: 'Safety Score',
        format: (v, t) => `${Math.round(v)}% (−${Math.round(t - v)}% below min)`,
      };
    case 'repeated_unsafe_events':
      return { header: 'Events in Window', format: (v, t) => `${v} events (+${Math.round(v - t)} over)` };
    case 'time_based_restriction':
      return { header: 'Time of Breach', format: (v) => `${v}` };
    default:
      return { header: 'Breach Value', format: (v) => `${v}` };
  }
}


function TrendSparkline({ byDay }) {
  const width = 340;
  const height = 72;
  const padding = 6;
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  const maxCount = byDay.reduce((max, d) => Math.max(max, d.count), 1) || 1;

  const coords = byDay.map((d, i) => {
    const x = byDay.length > 1 ? (i / (byDay.length - 1)) * width : width / 2;
    const y = height - (d.count / maxCount) * (height - padding * 2) - padding;
    return { x, y, ...d };
  });

  const points = coords.map((c) => `${c.x},${c.y}`).join(' ');

  function handleMouseMove(e) {
    if (!svgRef.current || byDay.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relativeX = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const dist = Math.abs(c.x - relativeX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex != null ? coords[hoverIndex] : null;

  return (
    <div className="relative text-fleet-blue">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-18"
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={hoverIndex === i ? 4 : c.count === maxCount && maxCount > 0 ? 3 : 0}
            fill="currentColor"
          />
        ))}
        {hovered && (
          <line
            x1={hovered.x}
            x2={hovered.x}
            y1={0}
            y2={height}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3,3"
            opacity="0.35"
          />
        )}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -top-9 -translate-x-1/2 rounded-md bg-fleet-text px-2 py-1 text-[11px] font-medium text-white shadow-lg whitespace-nowrap"
          style={{ left: `${(hovered.x / width) * 100}%` }}
        >
          {hovered.date} · {hovered.count} alert{hovered.count === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}


export default function BacktestPreviewPanel({ data, loading, error, conditionType, onClose }) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [data]);

  const maxDay = data?.by_day?.length
    ? data.by_day.reduce((max, d) => (d.count > max.count ? d : max), data.by_day[0])
    : null;
  const breachColumn = getBreachColumn(conditionType);

  const samples = data?.samples ?? [];
  const pageCount = Math.max(1, Math.ceil(samples.length / SAMPLES_PER_PAGE));
  const pagedSamples = samples.slice(page * SAMPLES_PER_PAGE, page * SAMPLES_PER_PAGE + SAMPLES_PER_PAGE);

  return (
    <div className="flex w-[460px] flex-col bg-fleet-surface animate-in fade-in slide-in-from-left-2 duration-150">
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

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
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
            Estimated Triggers (last 30 days)
            {typeof data?.vehicles_affected === 'number' && !loading && (
              <span> · {data.vehicles_affected} vehicles affected</span>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="uppercase tracking-wide text-fleet-secondary">
              30-Day Trigger Trend
            </span>
            {maxDay && !loading && (
              <span className="text-fleet-secondary">
                Peak: {maxDay.count} alerts on {maxDay.date}
              </span>
            )}
          </div>
          {loading || !data?.by_day ? (
            <div className="h-18 rounded-md bg-fleet-border animate-pulse" />
          ) : (
            <TrendSparkline byDay={data.by_day} />
          )}
          {!loading && data?.by_day && (
            <div className="mt-1 flex justify-between text-[10px] text-fleet-secondary">
              <span>{data.by_day[0]?.date}</span>
              <span>{data.by_day[data.by_day.length - 1]?.date}</span>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-fleet-secondary">
            Sample Qualifying Breach Events {samples.length ? `(${samples.length} Most Severe)` : ''}
          </div>

          {!loading && samples.length > 0 && (
            <div className="mb-1.5 grid grid-cols-[70px_1fr_60px] gap-2 px-3 text-[10px] uppercase tracking-wide text-fleet-secondary">
              <span>Vehicle</span>
              <span>{breachColumn.header}</span>
              <span className="text-right">When</span>
            </div>
          )}

          <div className="space-y-2">
            {loading || !data?.samples
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-fleet-border animate-pulse" />
                ))
              : pagedSamples.map((s, i) => (
                  <div
                    key={`${s.vehicle_id}-${page}-${i}`}
                    className="grid grid-cols-[70px_1fr_60px] items-center gap-2 rounded-md border border-fleet-border px-3 py-2"
                  >
                    <span className="rounded bg-fleet-blue/10 px-2 py-0.5 text-xs font-mono font-semibold text-fleet-blue w-fit">
                      {s.vehicle_id}
                    </span>
                    <span className="rounded bg-fleet-alert/10 px-2 py-0.5 text-xs font-semibold text-fleet-alert w-fit">
                      {breachColumn.format(s.breach_value, s.threshold_value)}
                    </span>
                    <span className="text-right text-xs text-fleet-secondary">{timeAgo(s.time)}</span>
                  </div>
                ))}
          </div>

          {!loading && samples.length > SAMPLES_PER_PAGE && (
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 rounded-md border border-fleet-border px-2.5 py-1.5 text-xs font-medium text-fleet-text hover:bg-fleet-panel disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>

              <div className="flex gap-1">
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    aria-label={`Page ${i + 1}`}
                    aria-current={page === i ? 'page' : undefined}
                    className={
                      'h-1.5 w-1.5 rounded-full transition-colors ' +
                      (page === i ? 'bg-fleet-blue' : 'bg-fleet-border hover:bg-fleet-secondary')
                    }
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                className="flex items-center gap-1 rounded-md border border-fleet-border px-2.5 py-1.5 text-xs font-medium text-fleet-text hover:bg-fleet-panel disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}