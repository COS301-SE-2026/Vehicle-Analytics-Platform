import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RefreshCw, ArrowUpDown, ChevronLeft, ChevronRight,
  AlertOctagon, AlertTriangle, Shield, ShieldCheck, Download, Radio,
  MapPin, Brain,
} from 'lucide-react';
import { getFleetRisk } from '@/services/riskService';
import RiskBadge from '@/components/risk/RiskBadge';
import RiskModal from '@/components/risk/RiskModal';
import Sparkline from '@/components/risk/Sparkline';
import useLivePulse from '@/hooks/useLivePulse';

const TIER_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const TIER_META = {
  critical: { label: 'Critical', Icon: AlertOctagon,  color: 'text-rose-600',    bg: 'bg-rose-50',    ring: 'ring-rose-100',    bar: 'bg-rose-500' },
  high:     { label: 'High',     Icon: AlertTriangle, color: 'text-orange-600',  bg: 'bg-orange-50',  ring: 'ring-orange-100',  bar: 'bg-orange-500' },
  medium:   { label: 'Medium',   Icon: Shield,        color: 'text-amber-600',   bg: 'bg-amber-50',   ring: 'ring-amber-100',   bar: 'bg-amber-500' },
  low:      { label: 'Low',      Icon: ShieldCheck,   color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100', bar: 'bg-emerald-500' },
};

const PAGE_SIZE = 15;
const REFRESH_MS = 30000;

function tierSummary(vehicles) {
  const out = { critical: 0, high: 0, medium: 0, low: 0 };
  vehicles.forEach((v) => {
    if (out[v.risk_tier] !== undefined) out[v.risk_tier] += 1;
  });
  return out;
}

function pageNumbers(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
}

function exportCSV(vehicles) {
  const header = ['rank', 'vehicle_id', 'risk_score', 'risk_tier', 'top_factor'];
  const rows = vehicles.map((v, i) => [
    i + 1,
    v.vehicle_id,
    Math.round(Number(v.risk_score)),
    v.risk_tier,
    (v.top_factors?.[0]?.name || '').replace(/,/g, ';'),
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `fleet-risk-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function FleetRiskPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('risk_score');
  const [sortDir, setSortDir] = useState('desc');
  const [tierFilter, setTierFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [openVehicle, setOpenVehicle] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await getFleetRisk();
      setVehicles(rows);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load fleet risk');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  useEffect(() => {
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  // Auto-open the modal if ?focus=<id> is in the URL, then clean the URL.
  useEffect(() => {
    const focus = searchParams.get('focus');
    if (!focus) return
    setOpenVehicle(focus)
    // Remove the query param so a refresh doesn't re-open the modal
    const next = new URLSearchParams(searchParams)
    next.delete('focus')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const live = useLivePulse(lastRefresh, REFRESH_MS);

  useEffect(() => { setPage(1); }, [tierFilter, sortKey, sortDir]);

  const summary = useMemo(() => tierSummary(vehicles), [vehicles]);

  const filtered = useMemo(() => {
    const list = tierFilter === 'all'
      ? vehicles
      : vehicles.filter((v) => v.risk_tier === tierFilter);

    return [...list].sort((a, b) => {
      if (sortKey === 'vehicle_id') {
        const cmp = a.vehicle_id.localeCompare(b.vehicle_id);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      if (sortKey === 'risk_tier') {
        const cmp = (TIER_ORDER[a.risk_tier] ?? 9) - (TIER_ORDER[b.risk_tier] ?? 9);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = Number(a.risk_score) - Number(b.risk_score);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [vehicles, tierFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice(start, end);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const goToPage = (p) => {
    setPage(Math.max(1, Math.min(totalPages, p)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeeOnMap = (vehicleId) => {
    setOpenVehicle(null);
    navigate(`/map?focus=${encodeURIComponent(vehicleId)}`);
  };

  const handleOpenModal = (vehicleId) => {
    setOpenVehicle(vehicleId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-fleet-secondary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-fleet-alert text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-fleet-text">Fleet Risk Forecast</h1>
          <p className="text-sm text-fleet-secondary mt-1">
            Predicted risk for every vehicle, based on the last 30 days of telemetry. Updated daily at 03:00 SAST.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 ring-1 ring-emerald-100 text-xs font-medium text-emerald-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="w-3 h-3" />
            Live - {live.label}
          </span>
          <button
            type="button"
            onClick={() => load(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-fleet-border bg-white text-xs font-medium text-fleet-text hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => exportCSV(filtered)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-fleet-border bg-white text-xs font-medium text-fleet-text hover:bg-gray-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['critical', 'high', 'medium', 'low']).map((key) => {
          const meta = TIER_META[key];
          const Icon = meta.Icon;
          const count = summary[key];
          const total = vehicles.length || 1;
          const pct = Math.round((count / total) * 100);
          const active = tierFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTierFilter(active ? 'all' : key)}
              title={`${meta.label} = risk score ${
                key === 'critical' ? '>= 75' :
                key === 'high'     ? '50-74' :
                key === 'medium'   ? '25-49' :
                                     '0-24'
              }. Click to filter.`}
              className={`text-left rounded-2xl p-5 border transition-all duration-150 ${
                active
                  ? `${meta.bg} ${meta.ring} border-transparent ring-2 shadow-sm scale-[1.02]`
                  : 'bg-white ring-1 ring-fleet-border border-transparent hover:ring-fleet-blue/30 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider ${active ? meta.color : 'text-fleet-secondary'}`}>
                  <Icon className="w-3.5 h-3.5" />
                  {meta.label}
                </span>
                {active && (
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.color}`}>filter</span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold tabular-nums ${meta.color}`}>{count}</span>
                <span className="text-xs text-fleet-secondary">{pct}%</span>
              </div>
              <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${meta.bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {tierFilter !== 'all' && (
        <div className="flex items-center gap-3 text-sm text-fleet-secondary bg-white border border-fleet-border rounded-lg px-4 py-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-fleet-blue" />
          <span>
            Filtered to <strong className="text-fleet-text">{TIER_META[tierFilter].label}</strong> - {filtered.length} vehicles
          </span>
          <button
            type="button"
            className="ml-auto text-fleet-blue hover:underline text-xs font-medium"
            onClick={() => setTierFilter('all')}
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-fleet-border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fleet-border bg-gray-50/70">
              <th className="text-left font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3 w-16">#</th>
              <th className="text-left font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3">
                <button type="button" className="inline-flex items-center gap-1.5 hover:text-fleet-text" onClick={() => toggleSort('vehicle_id')}>
                  Vehicle
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === 'vehicle_id' ? 'text-fleet-blue' : 'opacity-40'}`} />
                </button>
              </th>
              <th className="text-left font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3">
                <button type="button" className="inline-flex items-center gap-1.5 hover:text-fleet-text" onClick={() => toggleSort('risk_score')}>
                  Risk score
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === 'risk_score' ? 'text-fleet-blue' : 'opacity-40'}`} />
                </button>
              </th>
              <th className="text-left font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3">
                <button type="button" className="inline-flex items-center gap-1.5 hover:text-fleet-text" onClick={() => toggleSort('risk_tier')}>
                  Tier
                  <ArrowUpDown className={`w-3 h-3 ${sortKey === 'risk_tier' ? 'text-fleet-blue' : 'opacity-40'}`} />
                </button>
              </th>
              <th className="text-left font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3">Top factor</th>
              <th className="text-left font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3">Trend (14d)</th>
              <th className="text-right font-medium text-xs text-fleet-secondary uppercase tracking-wider px-5 py-3 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map((v, i) => {
              const rank = start + i + 1;
              return (
                <tr
                  key={v.vehicle_id}
                  className="border-b border-fleet-border last:border-0 hover:bg-fleet-blue/[0.03] transition-colors"
                >
                  <td className="px-5 py-3.5 text-xs font-medium text-fleet-secondary tabular-nums">{rank}</td>
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-fleet-text">{v.vehicle_id}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="tabular-nums font-medium text-fleet-text">
                      {Math.round(Number(v.risk_score))}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <RiskBadge tier={v.risk_tier} score={v.risk_score} />
                  </td>
                  <td className="px-5 py-3.5 text-fleet-secondary text-xs">
                    {v.top_factors?.[0]?.name || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Sparkline data={v.trend} tier={v.risk_tier} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSeeOnMap(v.vehicle_id)}
                        title="See on map"
                        aria-label={`See vehicle ${v.vehicle_id} on map`}
                        className="w-8 h-8 flex items-center justify-center rounded-md border border-fleet-border bg-white text-fleet-secondary hover:text-fleet-blue hover:border-fleet-blue/40 transition"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModal(v.vehicle_id)}
                        title="Predictive risk details"
                        aria-label={`View predictive risk for vehicle ${v.vehicle_id}`}
                        className="w-8 h-8 flex items-center justify-center rounded-md bg-fleet-blue text-white hover:bg-fleet-blue/90 transition"
                      >
                        <Brain className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-fleet-secondary">
                  No vehicles match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-fleet-border bg-gray-50/50">
            <span className="text-xs text-fleet-secondary">
              Showing <strong className="text-fleet-text">{start + 1}</strong>-
              <strong className="text-fleet-text">{end}</strong> of{' '}
              <strong className="text-fleet-text">{filtered.length}</strong> vehicles
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
                className="w-8 h-8 flex items-center justify-center rounded-md border border-fleet-border bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {pageNumbers(page, totalPages).map((p, i, arr) => (
                <span key={p} className="flex items-center">
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="px-1 text-fleet-secondary text-xs">...</span>
                  )}
                  <button
                    type="button"
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition ${
                      p === page
                        ? 'bg-fleet-blue text-white'
                        : 'border border-fleet-border bg-white text-fleet-text hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
                className="w-8 h-8 flex items-center justify-center rounded-md border border-fleet-border bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {openVehicle && (
        <RiskModal
          vehicleId={openVehicle}
          onClose={() => setOpenVehicle(null)}
        />
      )}
    </div>
  );
}
