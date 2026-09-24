import { useEffect, useState } from 'react';



export default function useLivePulse(lastRefresh, intervalMs = 30000) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

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
