import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Brain, Activity } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getVehicleRisk } from '@/services/riskService';
import RiskBadge from './RiskBadge';
import RiskFeatureTable from './RiskFeatureTable';

const BAR_GRADIENT = 'linear-gradient(to right, #1e3a5f, #14304F)';

function scoreColor(score) {
  if (score >= 75) return '#EF4444';
  if (score >= 50) return '#F97316';
  if (score >= 25) return '#F59E0B';
  return '#10B981';
}

export default function RiskPredictionCard({ vehicleId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getVehicleRisk(vehicleId, 30)
      .then((d) => {
        if (cancelled) return;
        // null means "no prediction available" - the empty state handles it
        setData(d || null);
      })
      .catch((err) => {
        console.warn('RiskPredictionCard: failed to load prediction', err?.message);
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [vehicleId]);

  if (loading) {
    return <div className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse h-64" />;
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-violet-50">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Predictive Risk</h3>
        </div>
        <p className="text-sm text-gray-500">
          No prediction available yet. The model scores every vehicle daily at 03:00 SAST.
        </p>
      </div>
    );
  }

  const { latest, trend } = data;
  const prev = trend.length > 1 ? trend[trend.length - 2].risk_score : latest.risk_score;
  const delta = latest.risk_score - prev;
  const DeltaIcon = delta > 3 ? TrendingUp : delta < -3 ? TrendingDown : Minus;
  const deltaColor = delta > 3 ? 'text-rose-500' : delta < -3 ? 'text-emerald-500' : 'text-gray-400';

  const maxWeight = Math.max(
    0.01,
    ...(latest.top_factors || []).map((f) => Number(f.weight) || 0)
  );

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_20px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-50">
            <Brain className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Predictive Risk Engine</h3>
            <p className="text-xs text-gray-400">
              Logistic regression · re-scored daily
            </p>
          </div>
        </div>
        <RiskBadge tier={latest.risk_tier} score={latest.risk_score} size="md" />
      </div>

      <div className="flex items-baseline gap-3 mb-6">
        <span
          className="text-5xl font-bold tracking-tight"
          style={{ color: scoreColor(latest.risk_score) }}
        >
          {Math.round(latest.risk_score)}
        </span>
        <span className="text-sm text-gray-400">/ 100</span>
        <span className={`ml-auto inline-flex items-center gap-1 text-sm font-medium ${deltaColor}`}>
          <DeltaIcon className="w-4 h-4" />
          {delta > 0 ? '+' : ''}{Math.round(delta)} pts vs prior day
        </span>
      </div>

      {trend.length > 1 && (
        <div className="h-32 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
                }
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9CA3AF' }} width={28} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', fontSize: 12 }} />
              <ReferenceLine y={75} stroke="#EF4444" strokeDasharray="3 3" />
              <ReferenceLine y={50} stroke="#F97316" strokeDasharray="3 3" />
              <ReferenceLine y={25} stroke="#F59E0B" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="risk_score"
                stroke={scoreColor(latest.risk_score)}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Top Contributing Factors
          </span>
        </div>
        {latest.top_factors && latest.top_factors.length > 0 ? (
          <ul className="space-y-2.5 mb-5">
            {latest.top_factors.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 flex-1">{f.name}</span>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (Number(f.weight) / maxWeight) * 100)}%`,
                      background: BAR_GRADIENT,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 w-12 text-right">
                  {f.value}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No factor breakdown available.</p>
        )}

        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            Full Feature Breakdown
          </span>
        </div>
        <RiskFeatureTable
          features={latest.features}
          topFactors={latest.top_factors}
        />
      </div>
    </div>
  );
}
