import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Gauge, Clock, AlertTriangle, ShieldAlert, Timer } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_TYPES = [

  { value: 'harsh_braking', label: 'Harsh braking' },

  { value: 'harsh_acceleration', label: 'Harsh acceleration' },

  { value: 'harsh_cornering', label: 'Harsh cornering' },
];

const CONDITIONS = [
  {
    type: 'speed_threshold',

    title: 'Speed Threshold',

    description: 'Trigger alerts when vehicles exceed a specific speed limit.',

    icon: Gauge,
  },

  {
    type: 'time_based_restriction',

    title: 'Time Restriction',

    description: 'Flag vehicle activity during restricted hours or days.',

    icon: Clock,
  },

  {
    type: 'repeated_unsafe_events',


    title: 'Repeated Unsafe Events',

    description: 'Monitor for patterns like harsh braking or rapid acceleration.',

    icon: AlertTriangle,
  },

  {
    type: 'safety_score_drop',

    title: 'Safety Score Drop',



    description: "Trigger when a vehicle's safety score falls below a minimum.",

    icon: ShieldAlert,
  },

  {
    type: 'trip_duration_exceeded',

    title: 'Trip Duration',

    description: 'Flag trips that exceed a standard duration.',

    icon: Timer,
  },

];

const EMPTY_PARAMS = {
  speed_threshold: { max_speed_kmh: '' },

  time_based_restriction: { start_time: '', end_time: '', restricted_days: [] },

  repeated_unsafe_events: { event_types: [], count: '', window_minutes: '' },

  safety_score_drop: { min_score: '' },

  trip_duration_exceeded: { max_trip_minutes: '', max_daily_minutes: '' },
};

const inputClasses =
  'w-full rounded-md border border-fleet-border bg-fleet-surface px-3 py-2 text-sm text-fleet-text ' +
  'placeholder:text-fleet-secondary focus:outline-none focus:ring-2 focus:ring-fleet-blue/40 focus:border-fleet-blue';

const labelClasses = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-fleet-secondary';


function paramsFromRule(rule, type){

  const base = EMPTY_PARAMS[type];

  const source = rule?.condition_params ?? {};

  if(rule?.condition_type !== type) 
    return base;

  return Object.keys(base).reduce((acc, key) => {

    acc[key] = source[key] ?? base[key];

    return acc;
  }, {});
}

export default function EditAlertRuleModal({ isOpen, onClose, onUpdated, rule, fleetGroups = [] }) {

  const toast = useToast();

  const [conditionType, setConditionType] = useState('speed_threshold');

  const [name, setName] = useState('');

  const [fleetGroupId, setFleetGroupId] = useState('');

  const [params, setParams] = useState(EMPTY_PARAMS.speed_threshold);

  const [status, setStatus] = useState('active');

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  useEffect(() => {

    if (!rule) return;

    const type = rule.condition_type ?? 'speed_threshold';

    setConditionType(type);

    setName(rule.name ?? rule.rule_name ?? '');

    setFleetGroupId(rule.fleet_group_id ?? '');

    setParams(paramsFromRule(rule, type));

    setStatus(rule.status ?? 'active');

    setError('');

  }, [rule]);

  if (!isOpen) return null;

  function selectCondition(type){

    setConditionType(type);

    setParams(paramsFromRule(rule, type));

    setError('');
  }

  function updateParam(key, value) {
    setParams((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFromList(key, value) {
    setParams((prev) => {

      const list = prev[key] || [];

      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

      return { ...prev, [key]: next };
    });
  }

  function buildConditionParams() {
    switch (conditionType) {

      case 'speed_threshold':
        return { max_speed_kmh: Number(params.max_speed_kmh) };

      case 'time_based_restriction':
        return {
          start_time: params.start_time,
          end_time: params.end_time,
          ...(params.restricted_days.length ? { restricted_days: params.restricted_days } : {}),
        };

      case 'repeated_unsafe_events':
        return {
          event_types: params.event_types,
          count: Number(params.count),
          window_minutes: Number(params.window_minutes),
        };

      case 'safety_score_drop':
        return { min_score: Number(params.min_score) };

      case 'trip_duration_exceeded': {
        const out = {};
        if (params.max_trip_minutes !== '') 
          out.max_trip_minutes = Number(params.max_trip_minutes);
        if (params.max_daily_minutes !== '') 
          out.max_daily_minutes = Number(params.max_daily_minutes);
        return out;
      }

      default:
        return {};
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if(!name.trim()) 
      return setError('name is required');

    if(!fleetGroupId) 
      return setError('fleet_group_id is required');

    if(!rule?.id) 
      return setError('missing rule id');

    setSubmitting(true);

    try {
      const token = useAuthStore.getState().token;

      const res = await axios.put(
        `${API_BASE}/api/custom-alerts/rules/${rule.id}`,
        {
          name: name.trim(),
          fleet_group_id: fleetGroupId,
          condition_type: conditionType,
          condition_params: buildConditionParams(),
          status,
        },

        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      onUpdated?.(res.data.data ?? res.data);

      onClose();

      toast.success('Alert Rule Updated Successfully.', `Changes to "${name.trim()}" have been saved.`);

    } catch (err) {

      const message = err.response?.data?.message || err.message;

      setError(message);

      toast.error('Failed to Update Rule.', 'Please check your connection and try again.');

    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-fleet-blue/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-[520px] flex-col rounded-xl bg-fleet-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-xl border-b border-fleet-border px-6 py-5">
          <h2 className="font-display text-xl font-semibold text-fleet-text">
            Edit Custom Alert
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-fleet-secondary hover:text-fleet-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5 [scrollbar-gutter:stable]">
          <section>

            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fleet-text">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fleet-blue text-xs text-white"> 1 </span>
              Select Condition
            </div>

            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => {
                const active = conditionType === c.type;
                const Icon = c.icon;
                return (
                  <button
                    type="button"
                    key={c.type}
                    onClick={() => selectCondition(c.type)}
                    className={
                      'flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors ' +
                      (active
                        ? 'border-fleet-blue bg-fleet-panel'
                        : 'border-fleet-border bg-fleet-surface hover:border-fleet-secondary')
                    }
                  >
                    <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-fleet-blue" strokeWidth={1.6} />
                    <span>
                      <span className="block text-sm font-semibold text-fleet-text">{c.title}</span>
                      <span className="mt-0.5 block text-xs text-fleet-secondary">{c.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

          </section>

          <section>

            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fleet-text">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-fleet-blue text-xs text-white"> 2 </span>
              Configure Parameters
            </div>

            {error && (
              <div className="mb-4 rounded-md border border-fleet-alert/30 bg-fleet-alert/10 px-3 py-2 text-sm text-fleet-alert">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className={labelClasses} htmlFor="alert-name">Alert Name</label>
              <input
                id="alert-name"
                className={inputClasses}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Highway Speeding"
                required
              />
            </div>

            <div className="mb-4">
              <label className={labelClasses} htmlFor="fleet-group">Fleet Group</label>
              <select
                id="fleet-group"
                className={inputClasses}
                value={fleetGroupId}
                onChange={(e) => setFleetGroupId(e.target.value)}
                required
              >
                <option value="">Select a fleet group</option>
                {fleetGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>

            {conditionType === 'speed_threshold' && (
              <div className="mb-4">
                <label className={labelClasses} htmlFor="max-speed">Speed Limit (km/h)</label>
                <input
                  id="max-speed"
                  type="number"
                  min="1"
                  className={inputClasses}
                  value={params.max_speed_kmh}
                  onChange={(e) => updateParam('max_speed_kmh', e.target.value)}
                  required
                />
              </div>
            )}

            {conditionType === 'time_based_restriction' && (
              <>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses} htmlFor="start-time">Start Time</label>
                    <input
                      id="start-time"
                      type="time"
                      className={inputClasses}
                      value={params.start_time}
                      onChange={(e) => updateParam('start_time', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClasses} htmlFor="end-time">End Time</label>
                    <input
                      id="end-time"
                      type="time"
                      className={inputClasses}
                      value={params.end_time}
                      onChange={(e) => updateParam('end_time', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <span id="restricted-days-label" className={labelClasses}>Restricted Days</span>
                  <div className="flex flex-wrap gap-2" role="group" aria-labelledby="restricted-days-label">
                    {DAYS.map((d) => {
                      const active = params.restricted_days.includes(d);
                      return (
                        <button
                          type="button"
                          key={d}
                          onClick={() => toggleFromList('restricted_days', d)}
                          className={
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
                            (active
                              ? 'border-fleet-blue bg-fleet-blue text-white'
                              : 'border-fleet-border bg-fleet-surface text-fleet-text hover:border-fleet-secondary')
                          }
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {conditionType === 'repeated_unsafe_events' && (
              <>
                <div className="mb-4">
                  <label className={labelClasses}>Event Types</label>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_TYPES.map((ev) => {
                      const active = params.event_types.includes(ev.value);
                      return (
                        <button
                          type="button"
                          key={ev.value}
                          onClick={() => toggleFromList('event_types', ev.value)}
                          className={
                            'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ' +
                            (active
                              ? 'border-fleet-blue bg-fleet-blue text-white'
                              : 'border-fleet-border bg-fleet-surface text-fleet-text hover:border-fleet-secondary')
                          }
                        >
                          {ev.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClasses} htmlFor="count">Occurrences</label>
                    <input
                      id="count"
                      type="number"
                      min="1"
                      className={inputClasses}
                      value={params.count}
                      onChange={(e) => updateParam('count', e.target.value)}
                      required
                    />
                  </div>

              
                  <div>
                    <label className={labelClasses} htmlFor="window">Within (minutes)</label>
                    <input
                      id="window"
                      type="number"
                      min="1"
                      className={inputClasses}
                      value={params.window_minutes}
                      onChange={(e) => updateParam('window_minutes', e.target.value)}
                      required
                    />
                  </div>
                </div>

              </>

            )}

            {conditionType === 'safety_score_drop' && (
              <div className="mb-4">
                <label className={labelClasses} htmlFor="min-score">Minimum Safety Score</label>
                <input
                  id="min-score"
                  type="number"
                  min="0"
                  max="100"
                  className={inputClasses}
                  value={params.min_score}
                  onChange={(e) => updateParam('min_score', e.target.value)}
                  required
                />
              </div>
            )}

            {conditionType === 'trip_duration_exceeded' && (
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClasses} htmlFor="max-trip">Max Trip Duration (min)</label>
                  <input
                    id="max-trip"
                    type="number"
                    min="1"
                    className={inputClasses}
                    value={params.max_trip_minutes}
                    onChange={(e) => updateParam('max_trip_minutes', e.target.value)}
                  />
                </div>

                <div>
                  <label className={labelClasses} htmlFor="max-daily">Max Daily Duration (min)</label>
                  <input
                    id="max-daily"
                    type="number"
                    min="1"
                    className={inputClasses}
                    value={params.max_daily_minutes}
                    onChange={(e) => updateParam('max_daily_minutes', e.target.value)}
                  />
                </div>

              </div>

            )}

            <div className="mb-1 flex items-center justify-between rounded-md border border-fleet-border px-3.5 py-3">

              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium text-fleet-text">Rule Status</p>
                <p className="text-xs text-fleet-secondary">Inactive rules stop evaluating but keep their configuration.</p>
              </div>

              <div className="inline-flex overflow-hidden rounded-md border border-fleet-border">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  aria-pressed={status === 'active'}
                  className={
                    'px-4 py-1.5 text-sm font-medium transition-colors ' +
                    (status === 'active'
                      ? 'bg-fleet-green/30 text-fleet-green'
                      : 'bg-fleet-surface text-fleet-secondary hover:bg-fleet-panel')
                  }
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  aria-pressed={status === 'inactive'}
                  className={
                    'px-4 py-1.5 text-sm font-medium transition-colors border-l border-fleet-border ' +
                    (status === 'inactive'
                      ? 'bg-fleet-alert/30 text-fleet-alert'
                      : 'bg-fleet-surface text-fleet-secondary hover:bg-fleet-panel')
                  }
                >
                  Inactive
                </button>
              </div>

            </div>

          </section>
        </form>

        <div className="flex justify-end gap-3 rounded-b-xl border-t border-fleet-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-fleet-border px-4 py-2 text-sm font-medium text-fleet-text hover:bg-fleet-panel"
          >
            Cancel
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-fleet-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>

        </div>
        
      </div>

    </div>
  );
}