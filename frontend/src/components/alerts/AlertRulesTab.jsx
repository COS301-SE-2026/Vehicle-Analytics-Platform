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