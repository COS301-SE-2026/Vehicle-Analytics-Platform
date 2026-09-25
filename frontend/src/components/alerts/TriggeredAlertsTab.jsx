import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Info,
  MapPin,
  Clock,
  CheckCircle2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { describeEventTypes } from './ruleFormConstants';

const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

const LIMIT = 10;

const RESOLVED_WINDOW_HOURS = 48;
const RESOLVED_WINDOW_MS = RESOLVED_WINDOW_HOURS * 60 * 60 * 1000;

const EXPIRY_TICK_MS = 60 * 1000;

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },
];

const CONDITION_OPTIONS = [
  { label: 'All Conditions', value: 'all' },
  { label: 'Speed Threshold', value: 'speed_threshold' },
  { label: 'Time Based Restriction', value: 'time_based_restriction' },
  { label: 'Repeated Unsafe Events', value: 'repeated_unsafe_events' },
  { label: 'Safety Score Drop', value: 'safety_score_drop' },
  { label: 'Trip Duration Exceeded', value: 'trip_duration_exceeded' },
];

const CONDITION_LABELS = {
  speed_threshold: 'Speed Threshold',

  time_based_restriction: 'Time Based Restriction',

  repeated_unsafe_events: 'Repeated Unsafe Events',

  safety_score_drop: 'Safety Score Drop',

  trip_duration_exceeded: 'Trip Duration Exceeded',
};

function snapshotParams(alert) {
  let snapshot = alert.rule_snapshot ?? {};

  if (typeof snapshot === 'string') {
    try {
      snapshot = JSON.parse(snapshot);
    } catch {
      return {};
    }
  }

  return snapshot?.condition_params ?? snapshot ?? {};
}

function formatBreach(alert) {
  const { condition_type, breach_value, threshold_value } = alert;

  switch (condition_type) {
    case 'speed_threshold':
      return `Vehicle ${alert.vehicle_id} exceeded ${threshold_value} km/h (recorded ${breach_value} km/h)`;

    case 'time_based_restriction':
      return `Vehicle ${alert.vehicle_id} active outside permitted window`;

    case 'repeated_unsafe_events': {
      const params = snapshotParams(alert);

      const kind = describeEventTypes(params.event_types);

      const window = params.window_minutes ? ` in ${params.window_minutes} min` : '';

      return `Vehicle ${alert.vehicle_id} recorded ${breach_value} ${kind} events${window} - rule fires at ${threshold_value}`;
    }

    case 'safety_score_drop':
      return `Vehicle ${alert.vehicle_id} safety score dropped to ${breach_value} (min ${threshold_value})`;

    case 'trip_duration_exceeded':
      return `Vehicle ${alert.vehicle_id} trip duration ${breach_value} min (limit ${threshold_value} min)`;

    default:
      return `Vehicle ${alert.vehicle_id}: ${breach_value ?? '—'} vs ${threshold_value ?? '—'}`;
  }
}

function formatTime(value) {
  if (!value) {
    return null;
  }
  return new Date(value).toLocaleTimeString([], { 
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function authHeaders(){
  const token = useAuthStore.getState().token;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isExpiredResolved(alert, now) {
  if (alert.status !== 'resolved')
    return false;

  const timestamp = alert.resolved_at ?? alert.updated_at;

  if (!timestamp)
    return false;

  const resolvedAt = new Date(timestamp).getTime();

  if (Number.isNaN(resolvedAt))
    return false;

  return now - resolvedAt > RESOLVED_WINDOW_MS;
}

function getAlertCardStateClass(isResolved, isNew) {
  if (isResolved) 
    return 'border-fleet-border opacity-60';

  if (isNew) 
    return 'border-fleet-alert/40 border-l-4 border-l-fleet-alert';

  return 'border-fleet-border';
}

export default function TriggeredAlertsTab() {
  const [activeStatus, setActiveStatus] = useState('all');

  const [conditionType, setConditionType] = useState('all');

  const [vehicleSearch, setVehicleSearch] = useState('');

  const [offset, setOffset] = useState(0);

  const [alerts, setAlerts] = useState([]);

  const [pagination, setPagination] = useState({ total: 0, hasMore: false });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [actioningId, setActioningId] = useState(null);

  const [now, setNow] = useState(() => Date.now());

  const fetchAlerts = useCallback(async () => {

    setLoading(true);

    setError(null);

    try {
      const params = {
        limit: LIMIT,
        offset,
        resolved_within_hours: RESOLVED_WINDOW_HOURS,
      };
      if (activeStatus !== 'all') 
        params.status = activeStatus;

      if (conditionType !== 'all') 
        params.condition_type = conditionType;

      if (vehicleSearch) 
        params.vehicle_id = vehicleSearch;

      const res = await axios.get(`${API_BASE}/api/alerts/triggered`, {
        params,
        headers: authHeaders(),
      });

      const { data, pagination } = res.data.data ?? res.data;

      setAlerts(data ?? []);

      setPagination(pagination ?? { total: 0, hasMore: false });

    } catch (err) {
      setError(err.response?.data?.message || err.message);

    } finally {
      setLoading(false);
    }
  }, [activeStatus, conditionType, vehicleSearch, offset]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    setOffset(0);
  }, [activeStatus, conditionType, vehicleSearch]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), EXPIRY_TICK_MS);

    return () => clearInterval(id);
  }, []);

  const visibleAlerts = useMemo(
    () => alerts.filter((alert) => !isExpiredResolved(alert, now)),
    [alerts, now]
  );

  const expiredCount = alerts.length - visibleAlerts.length;

  async function handleAcknowledge(alertId){

    setActioningId(alertId);

    try {
      await axios.put(
        `${API_BASE}/api/alerts/triggered/${alertId}/acknowledge`,
        {},
        { headers: authHeaders() }
      );

      await fetchAlerts();

    } catch (err) {
      setError(err.response?.data?.message || err.message);

    } finally {
      setActioningId(null);
    }
  }

  async function handleResolve(alertId) {
    setActioningId(alertId);
    try {
      await axios.put(
        `${API_BASE}/api/alerts/triggered/${alertId}/resolve`,
        {},
        { headers: authHeaders() }
      );

      await fetchAlerts();

    } catch (err) {
      setError(err.response?.data?.message || err.message);

    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="space-y-4">

      {/* Filters */}
      <div className="bg-fleet-surface border border-fleet-border rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const active = activeStatus === tab.value;
            return (

              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveStatus(tab.value)}
                className={
                  'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ' +
                  (active
                    ? 'bg-fleet-blue text-white'
                    : 'bg-fleet-panel text-fleet-secondary hover:text-fleet-text')
                }
              >
                {tab.label}
              </button>

            );
          })}

          <Select value={conditionType} onValueChange={setConditionType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Conditions" />
            </SelectTrigger>
            <SelectContent className="bg-fleet-surface border border-fleet-border shadow-md z-50">
              {CONDITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>


          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fleet-secondary" />
            <Input
              placeholder="Search Vehicle ID..."
              className="pl-9 w-[220px]"
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
            />
          </div>
          
        </div>
      </div>

    
      <div className="flex items-start gap-2 rounded-lg border border-fleet-green/30 bg-fleet-green/10 px-4 py-3 text-sm text-fleet-text">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-fleet-green" />
        <p>
          Acknowledge an alert to confirm you've seen it, then Resolve once it's been fully dealt
          with. Resolved alerts drop off this list {RESOLVED_WINDOW_HOURS} hours after they're
          resolved.
        </p>
      </div>

      {error && <p className="text-sm text-fleet-alert px-1">{error}</p>}

    
      <div className="space-y-3">
        {loading && (
          <div className="text-center text-fleet-secondary py-12 bg-fleet-surface border border-fleet-border rounded-lg">
            Loading alerts...
          </div>
        )}

        {!loading && visibleAlerts.length === 0 && (
          <div className="text-center text-fleet-secondary py-12 bg-fleet-surface border border-fleet-border rounded-lg">
            {expiredCount > 0
              ? `Every alert on this page was resolved more than ${RESOLVED_WINDOW_HOURS} hours ago. Use Next to keep looking.`
              : 'No alerts match these filters.'}
          </div>
        )}

        {!loading &&
          visibleAlerts.map((alert) => {
            const isNew = alert.status === 'new';

            const isAcknowledged = alert.status === 'acknowledged';

            const isResolved = alert.status === 'resolved';

            const busy = actioningId === alert.id;

            const hasLocation = alert.latitude != null && alert.longitude != null;

            return (
              <div
                key={alert.id}
                className={'rounded-lg border bg-fleet-surface px-5 py-4 transition-opacity ' 
                  + getAlertCardStateClass(isResolved, isNew)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={'h-4 w-4 ' + (isNew ? 'text-fleet-alert' : 'text-fleet-secondary')}
                    />
                    <span
                      className={
                        'text-xs font-semibold uppercase tracking-wide ' +
                        (isNew ? 'text-fleet-alert' : 'text-fleet-secondary')
                      }
                    >
                      {CONDITION_LABELS[alert.condition_type] ?? alert.condition_type}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-xs text-fleet-secondary flex-shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(alert.created_at)}
                  </span>
                </div>

                <p className="mt-2 text-sm text-fleet-text">{formatBreach(alert)}</p>

                {hasLocation && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-fleet-secondary">
                    <MapPin className="h-3.5 w-3.5" />
                    {Number(alert.latitude).toFixed(4)}, {Number(alert.longitude).toFixed(4)}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    {isAcknowledged && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-fleet-green/10 px-3 py-1 text-xs font-medium text-fleet-green">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Acknowledged{alert.acknowledged_at ? ` · ${formatTime(alert.acknowledged_at)}` : ''}
                      </span>
                    )}

                    {isResolved && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-fleet-secondary">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Resolved{alert.resolved_at ? ` · ${formatTime(alert.resolved_at)}` : ''}
                      </span>
                    )}

                  </div>

                  {!isResolved && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!isNew || busy}
                        onClick={() => handleAcknowledge(alert.id)}
                        className="rounded-md bg-fleet-blue px-3.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Acknowledge
                      </button>

                      <button
                        type="button"
                        disabled={!isAcknowledged || busy}
                        onClick={() => handleResolve(alert.id)}
                        className="rounded-md border border-fleet-border px-3.5 py-1.5 text-xs font-medium text-fleet-text hover:bg-fleet-panel disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Resolve
                      </button>
                      
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {!loading && alerts.length > 0 && (
        <div className="flex items-center justify-between border-t border-fleet-border pt-3">

          <p className="text-xs text-fleet-secondary">
            Showing {visibleAlerts.length} of {pagination.total}
            {expiredCount > 0 && (
              <span> · {expiredCount} resolved over {RESOLVED_WINDOW_HOURS}h ago hidden</span>
            )}
          </p>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => setOffset((prev) => Math.max(prev - LIMIT, 0))}
              disabled={offset === 0}
              className="flex items-center gap-1 rounded-md border border-fleet-border px-3 py-1.5 text-xs font-medium text-fleet-text hover:bg-fleet-panel disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </button>

            <button
              type="button"
              onClick={() => setOffset((prev) => prev + LIMIT)}
              disabled={!pagination.hasMore}
              className="flex items-center gap-1 rounded-md border border-fleet-border px-3 py-1.5 text-xs font-medium text-fleet-text hover:bg-fleet-panel disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            
          </div>
        </div>
      )}
   
    </div>
  );
}