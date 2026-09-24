import { useEffect, useState } from 'react';

/**
 * Tracks "Xs ago" since lastRefresh and re-renders every second so the UI
 * ticks like a live feed. Also returns a refetch trigger on an interval.
 */
export default function useLivePulse(lastRefresh, intervalMs = 30000) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

 
  

  if (tick < 0) return { label: '—', refetchDue: false };
  if (!lastRefresh) return { label: '—', refetchDue: false };

  const elapsedMs = Date.now() - lastRefresh.getTime();
  const secs = Math.floor(elapsedMs / 1000);

  let label;
  if (secs < 5) label = 'just now';
  else if (secs < 60) label = `${secs}s ago`;
  else {
    const mins = Math.floor(secs / 60);
    label = `${mins}m ago`;
  }

  return { label, refetchDue: elapsedMs >= intervalMs };
}
