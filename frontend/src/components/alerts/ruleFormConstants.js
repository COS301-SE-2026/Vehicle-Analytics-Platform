import { Gauge, Clock, AlertTriangle, ShieldAlert, Timer } from 'lucide-react';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EVENT_TYPES = [
  { value: 'harsh_braking', label: 'Harsh braking' },
  { value: 'harsh_acceleration', label: 'Harsh acceleration' },
  { value: 'harsh_cornering', label: 'Harsh cornering' },
];

export const CONDITIONS = [
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
    description: "Trigger when a vehicle's safety score falls below a minimun.",
    icon: ShieldAlert,
  },

  {
    type: 'trip_duration_exceeded',
    title: 'Trip Duration',
    description: 'Flag trips that exceed a standard duration.',
    icon: Timer,
  },

];

export const EMPTY_PARAMS = {
  speed_threshold: {  max_speed_kmh: '' },

  time_based_restriction: { start_time: '', end_time: '', restricted_days: [] },

  repeated_unsafe_events: { event_types: [], count: '', window_minutes: '' },

  safety_score_drop : { min_score: '' },

  trip_duration_exceeded: { max_trip_minutes: '', max_daily_minutes: '' },

};

export const inputClasses =
  'w-full rounded-md border border-fleet-border bg-fleet-surface px-3 py-2 text-sm text-fleet-text ' +
  'placeholder:text-fleet-secondary focus:outline-none focus:ring-2 focus:ring-fleet-blue/40 focus:border-fleet-blue';

export const labelClasses = 'mb-1.5 block text-xs font-medium uppercase tracking-wide text-fleet-secondary';


export function buildConditionParams(conditionType, params) {
  
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