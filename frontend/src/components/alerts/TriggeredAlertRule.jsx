import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import useAuthStore from '@/store/authStore';
import { Button } from '../ui/button';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function AlertRulesTab() {
  const [rules, setRules] = useState([]);
  const [loading, setloading] = useState(true);
  const [error, setError] = useState(null);

  const fetcRules = useCallback(async () => {
    setloading(true);
    setError(null);
    try {
      const token = useAuthStore.getState().token;

      const res = await axios.get(`${API_BASE}/api/custom-alerts/rules`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

    const payload = res.data.data ?? res.data;

    setRules(payload.data ?? payload ?? []);

    } catch (err) {

      setError(err.response?.data?.message || err.message)
    } finally {
      setloading(false);
    }
  }, []);

  useEffect(() => {

    fetcRules();
  }, [fetcRules]);

  return (
    <div className='bg-fleet-surface border border-fleet-border rounded-lg p-6 space-y-4'>
      <h2 className='text-lg font-display text-fleet-text'>Alerts Rules</h2>
      <Button className='bg-fleet-blue/90'>
        Create Alert Rules
      </Button>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rule Name</TableHead>
          <TableHead>Condition</TableHead>
          <TableHead>Threshold</TableHead>
          <TableHead>Fleet Group</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className='text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody />
    </Table>

  </div>
  );
}