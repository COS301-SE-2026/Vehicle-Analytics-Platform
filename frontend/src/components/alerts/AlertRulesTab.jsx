import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const LIMIT = 10;

const STATUS_TABS = [
  { label: 'All', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Acknowledged', value: 'acknowledged' },
  { label: 'Resolved', value: 'resolved' },   
];

const CONDITION_LABELS = {
  speed_threshold: 'Speed Threshold',
  time_based_restriction: 'Time Based Restriction',
  repeated_unsafe_events: 'Repeated Unsafe Events',
  safety_score_drop: 'Safety Score Drop',
  trip_duration_exceeded: 'Trip Duration Exceeded' 
};

const STATUS_BADGE = {
  new:
  { 
    label: 'New', 
    className: 'bg-fleet-alert/10 text-fleet-alert hover:bg-fleet-alert/10' 
  },

  acknowledged:
  { 
    label: "Ack'd", 
    className: 'bg-fleet-idle/10 text-fleet-secondary hover:bg-fleet-idle/10' 
  },

  resolved: 
  { 
    label: 'Resolved', 
    className: 'bg-fleet-green/10 text-fleet-green hover:bg-fleet-green/10'
  },
};

