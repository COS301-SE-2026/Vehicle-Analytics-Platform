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