


import { useEffect, useState } from 'react';
import { getFleetRisk } from '@/services/riskService';

const TIER_RING = {
  critical: '#e11d48',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
};

export function useFleetRiskLookup() {
  const [lookup, setLookup] = useState({});

  useEffect(() => {
    let cancelled = false;
    getFleetRisk()
      .then((rows) => {
        if (cancelled) return;
        const map = {};
        rows.forEach((v) => {
          map[v.vehicle_id] = {
            score: v.risk_score,
            tier: v.risk_tier,
          };
        });
        setLookup(map);
      })
      .catch((err) => console.error('useFleetRiskLookup:', err));
    return () => { cancelled = true; };
  }, []);

  return lookup;
}

export function tierRing(tier) {
  return TIER_RING[tier] || '#9ca3af';
}

export function tierLabel(tier) {
  if (!tier) return '';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}
