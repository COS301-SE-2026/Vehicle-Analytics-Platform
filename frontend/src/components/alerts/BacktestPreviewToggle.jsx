import { Sparkles, ChevronRight } from 'lucide-react';

/**
 * The collapsed "Preview Impact" tab that peeks from the modal's right
 * edge. Disabled (with an explanatory tooltip) until a fleet group is
 * selected, since a backtest is scoped to a fleet group the same way
 * the rule itself will be.
 */
export default function BacktestPreviewToggle({
  onClick,
  hasRequiredInputs,
  totalAlerts,
  loading,
}) {
  const tooltip = hasRequiredInputs
    ? 'Click to preview simulated alert impact over the last 30 days'
    : 'Select a fleet group first to preview impact';

    function getAlertCountLabel(loading, totalAlerts) {
      if (loading)
        return '…';

      if (totalAlerts != null) 
       return `${totalAlerts} alerts`;

      return '—';
    }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!hasRequiredInputs}
      title={tooltip}
      aria-label={tooltip}
      className={
        'absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%-1px)] ' +
        'flex items-center gap-2 rounded-r-lg border border-l-0 border-fleet-border ' +
        'bg-fleet-surface px-3 py-2 text-sm shadow-lg transition-colors ' +
        (hasRequiredInputs
          ? 'text-fleet-text hover:bg-fleet-panel cursor-pointer'
          : 'text-fleet-secondary cursor-not-allowed opacity-70')
      }
    >
      <Sparkles className="h-4 w-4 text-fleet-blue shrink-0" />
      <span className="flex flex-col items-start leading-tight">
        <span className="font-medium">Preview Impact</span>
        <span className="text-[10px] uppercase tracking-wide text-fleet-secondary">
          30-Day Simulation
        </span>
      </span>
      {hasRequiredInputs && (
        <span className="ml-1 rounded-full bg-fleet-blue/10 px-2 py-0.5 text-xs font-semibold text-fleet-blue">
          {getAlertCountLabel(loading, totalAlerts)}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-fleet-secondary shrink-0" />
    </button>
  );
}