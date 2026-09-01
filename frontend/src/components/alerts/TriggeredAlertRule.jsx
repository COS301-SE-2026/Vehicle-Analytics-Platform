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
import CreateAlertRuleModal from './CreateRuleModal';
import EditAlertRuleModal from './EditRuleModal';


const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

const CONDITION_LABELS = {
  speed_threshold: 'Speed Threshold',

  time_based_restriction: 'Time Based Restriction',

  safety_score_drop: 'Safety Score Drop',

  repeated_unsafe_events: 'Repeated Unsafe Events',

  trip_duration_exceeded: 'Trip Duration Exceeded'
};

export default function AlertRulesTab() {
  const [rules, setRules] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [editingRule, setEditingRule] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);

  const [fleetGroups, setFleetGroups] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {

    fetchRules();
  }, [fetchRules]);

   useEffect(() => {
    async function fetchFleetGroups() {
      try {
       const token = useAuthStore.getState().token;

       const res = await axios.get(`${API_BASE}/api/fleet-groups`, { //check actual endpoint route
          headers: token ? { Authorization: `Bearer ${token}` } : {},

        });      

        const payload = res.data.data ?? res.data;

        setFleetGroups(payload.data ?? payload ?? []);

      } catch (err) {
        console.error('Failed to load fleet groups:', err);
      }
    }
    fetchFleetGroups();
  }, []);

  let tableContent;

  if (loading) {
    tableContent = (

      <TableRow>
        <TableCell colSpan={6} className='text-center text-fleet-secondary py-8'>
          Loading rules...
        </TableCell>
      </TableRow>

    );
  } else if (rules.length === 0) {
    tableContent = (

      <TableRow>
        <TableCell colSpan={6} className='text-center text-fleet-secondary py-8'>
          No alert rules configured yet.
        </TableCell>
      </TableRow>

    )

  } else {
      tableContent = rules.map((rule) => (

        <TableRow key={rule.id}>
          <TableCell>{rule.rule_name ?? rule.name}</TableCell>
          <TableCell>{CONDITION_LABELS[rule.condition_type] ?? rule.condition_type}</TableCell>
          <TableCell>{rule.threshold_value}</TableCell>
          <TableCell>{rule.fleet_group_name ?? rule.fleet_group_id}</TableCell>
          <TableCell>{rule.is_active ? 'Active': 'Inactive'}</TableCell>
          <TableCell className='text-right'>
            <Button 
              variant='outline' 
              size='sm' 
              onClick={() => { setEditingRule(rule); setEditModalOpen(true); }}
            >
              Edit
            </Button>
          </TableCell>
        </TableRow>
      ))
  }

  return (
    <div className='bg-fleet-surface border border-fleet-border rounded-lg p-6 space-y-4'>
      <h2 className='text-lg font-display text-fleet-text'>Alerts Rules</h2>
      <Button className='bg-fleet-blue/90' onClick={() => setModalOpen(true)}>
        Create Alert Rules
      </Button>

      {error && <p className='text-sm text-fleet-alert'>Failed to load alert rules: {error} </p>}

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
      <TableBody>{tableContent}</TableBody>
    </Table>

    <CreateAlertRuleModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      onCreated={() => fetchRules()}
      fleetGroups={fleetGroups}
    />

    <EditAlertRuleModal
      isOpen={editModalOpen}
      rule={editingRule}
      onClose={() => setEditModalOpen(false)}
      onUpdated={() => fetchRules()}
      fleetGroups={fleetGroups}
    />

  </div>
  );
}