import { useState, useEffect, useCallback } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import useAuthStore from '@/store/authStore';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { data } from 'react-router-dom';
import { daysToWeeks } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_URL || '';

const LIMIT = 10;

const STATUS_TABS = [
  { label: 'ALL', value: 'all' },
  { label: 'New', value: 'new'},
  { label: 'Acknowledged', value: 'acknowledged'},
  { label: 'Resolved', value: 'resolved'},
];

export default function TriggeredAlertsTab(){

  const [activeStatus, setActiveStatus] = useState('all');

  const [conditionType, setConditionType] = useState('all');

  const [vehicleSearch, setVehicleSearch] = useState('');

  const [offset, setOffset] = useState(0);

  const [alerts, setAlerts] = useState ([]);

  const [pagination, setPagination] = useState({ total: 0, hasMore: false });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  function formatBreach(alert) {
     const {condition_type, breach_value, threshold_value } = alerts;

     switch(condition_type) {
      case 'speed_threshold':
        return `${breach_value} km/h vs ${threshold_value} km/h`;
      case 'time_based_restriction':
        return `${breach_value} min vs ${threshold_value} min`;
      case 'repeated_unsafe_events':
        return `${breach_value} vs ${threshold_value} `;
       case 'safety_score_drop':
        return `${breach_value} vs ${threshold_value} `;
      case 'trip_duration_exceeded':
        return `${breach_value}% vs ${threshold_value}%`;
      
      default:
        return threshold_value != null ? `${breach_value} vs ${threshold_value}` : `${breach_value}`;
     }
  }

  function formatTimeStamp(createdAt) {
    const date = new Date(createdAt);

    const now = new Date();

    const yesterday = new Dte(now);

    yesterday.setDate(now.getDate() - 1);

    if(date.toDateString() === now.toDateString()) {
      return data.toLocalTimeString([], {hour: 'numeric', minute: '2-digit'});
    }

    if(data.toDateString() === yesterday.toDateString()) 
      return 'Yesterday';

    return date.toLocaleDateString([], {month: 'short', day: 'numeric' });
  }

  const fetchAlerts = useCallback(async () => {
    setLoading(true);

    setError(null);

    try {

      const params = { limit: LIMIT, offset };

      if(activeStatus !== 'all') 
        params.status = activeStatus;

      if(conditionType !== 'all') 
        params.condition_type = conditionType;

      if(vehicleSearch)
        params.vehicle_id = vehicleSearch;

      const token = useAuthStore.getState().token;

      const res = await axios.get(`${API_BASE}/api/alerts/triggered`, {
        params,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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

  const rangeStart = pagination.total === 0 ? 0 : offset + 1;

  const rangeEnd = Math.min(offset + LIMIT, pagination.total);

  return (
    <div className='space-y-6'>
      <div className='bg-fleet-surface border border-fleet rounded-lg p-6 space-y-4'>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle ID</TableHead>
              <TableHead>Alert Name</TableHead>
              <TableHead>Breach Value</TableHead>
              <TableHead>Fleet Group</TableHead>
              <TableHead>Timestamp</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody/>

        </Table>

      </div>
    </div>
  );
}