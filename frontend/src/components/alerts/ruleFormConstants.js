import { Gauge, Clock, AlertTriangle, ShieldAlert, Timer } from 'lucide-react';

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EVENT_TYPES = [
  { value: 'harsh_braking', label: 'Harsh braking' },
  { value: 'harsh_acceleration', label: 'Harsh acceleration' },
  { value: 'harsh_cornering', label: 'Harsh cornering' },
];