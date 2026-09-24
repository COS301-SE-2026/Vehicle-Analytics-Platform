import { AlertTriangle, AlertOctagon, ShieldCheck, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const TIER_CONFIG = {
  low:      { label: 'Low',      Icon: ShieldCheck,   bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
  medium:   { label: 'Medium',   Icon: Shield,        bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200'   },
  high:     { label: 'High',     Icon: AlertTriangle, bg: 'bg-orange-50',  text: 'text-orange-700',  ring: 'ring-orange-200'  },
  critical: { label: 'Critical', Icon: AlertOctagon,  bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-200'    },
};

export default function RiskBadge({ tier, score, size = 'sm' }) {
  // Fall back to 'low' when tier is missing or unrecognised so the
  // data-testid and visual style stay consistent.
  const resolvedTier = TIER_CONFIG[tier] ? tier : 'low';
  const cfg = TIER_CONFIG[resolvedTier];
  const Icon = cfg.Icon;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      data-testid={`risk-badge-${resolvedTier}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1',
        cfg.bg,
        cfg.text,
        cfg.ring,
        pad
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {score !== undefined ? `${Math.round(score)} · ${cfg.label}` : cfg.label}
    </span>
  );
}
