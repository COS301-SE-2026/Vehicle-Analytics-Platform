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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';


const API_BASE = import.meta.env.VITE_API_URL || '';

const CONDITION_LABELS = {
  speed_threshold: 'Speed Threshold',
  geofence_exit: 'Geofence Exit',
  idle_duration: 'Idle Duration',
  battery_low: 'Battery Low',
};

export default function AlertRulesTab() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRules = useCallback(async () => {

    setLoading(true);

    setError(null);

    try{
      const token = localStorage.getItem('token');
      
      const res = await axios.get(`${API_BASE}/api/custom-alerts/rules`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      
      const payload = res.data.data ?? res.data;

      setRules(payload.data ?? payload ?? []);

    
    } catch (err) {
      setError(err.response?.data?.message || err.message);

    } finally {
      setLoading(false);

    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);


  let tableContent;
  if (loading) {

    tableContent = (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-fleet-secondary py-8">
          Loading rules...
        </TableCell>
      </TableRow>
    );

  } else if (rules.length === 0) {

    tableContent = (
      <TableRow>
        <TableCell colSpan={6} className="text-center text-fleet-secondary py-8">
          No alert rules configured yet.
        </TableCell>
      </TableRow>

    );
  } else {

    tableContent = rules.map((rule) => (

      <TableRow key={rule.id}>
        <TableCell>{rule.rule_name ?? rule.name}</TableCell>

        <TableCell>{CONDITION_LABELS[rule.condition_type] ?? rule.condition_type}</TableCell>

        <TableCell>{rule.threshold_value}</TableCell>

        <TableCell>{rule.fleet_group_name ?? rule.fleet_group_id}</TableCell>

        <TableCell>
          <Badge
            className={
              rule.is_active
                ? 'bg-fleet-green/10 text-fleet-green hover:bg-fleet-green/10'
                : 'bg-fleet-idle/10 text-fleet-secondary hover:bg-fleet-idle/10'
            }
          >
            {rule.is_active ? 'Active' : 'Inactive'}
          </Badge>
        </TableCell>

        <TableCell className="text-right">
          <Button variant="outline" size="sm" disabled>
            Edit
          </Button>
        </TableCell>

      </TableRow>
    ));
  }

  return (
    <div className="bg-fleet-surface border border-fleet-border rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display text-fleet-text">Alert Rules</h2>
        {/* wire create-rule route/modal */}
        <Button size="sm" disabled>
          New Rule
        </Button>
      </div>

      {error && <p className="text-sm text-fleet-alert">Failed to load alert rules: {error}</p>}

      <Table>
        <TableHeader>
          <TableRow>

            <TableHead>Rule Name</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead>Fleet Group</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
            
          </TableRow>
        </TableHeader>

        <TableBody>
            {tableContent}
        </TableBody>

      </Table>
    </div>
  );
}