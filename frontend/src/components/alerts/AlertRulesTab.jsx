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
import DeleteAlertRuleModal from './DeleteRuleModal';
import { Pencil, Trash2 } from 'lucide-react';


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

  const [deletingRule, setDeletingRule] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [togglingId, setTogglingId] = useState(null);

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

  
async function handleToggleActive(rule) {

  const nextActive = !rule.is_active;

  setTogglingId(rule.id);
 
  setRules((prev) =>
    prev.map((r) => (r.id === rule.id ? { ...r, is_active: nextActive } : r))
  );

  try {
    const token = useAuthStore.getState().token;

    await axios.patch(
      `${API_BASE}/api/custom-alerts/rules/${rule.id}/status`,
      { is_active: nextActive },
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );

  } catch (err) {
    
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, is_active: rule.is_active } : r))
    );

    setError(err.response?.data?.message || err.message);

  } finally {
    setTogglingId(null);
  }
}

function formatThreshold(rule) {
  const params = rule.condition_params ?? {};

  switch (rule.condition_type) {
    case 'speed_threshold':
      return params.max_speed_kmh != null ? `${params.max_speed_kmh} km/h` : '—';

    case 'time_based_restriction':
      return params.start_time && params.end_time
        ? `${params.start_time}–${params.end_time}`
        : '—';

    case 'repeated_unsafe_events':
      return params.count != null && params.window_minutes != null
        ? `${params.count}x in ${params.window_minutes}m`
        : '—';

    case 'safety_score_drop':
      return params.min_score != null ? `< ${params.min_score}` : '—';

    case 'trip_duration_exceeded':
      if (params.max_trip_minutes != null) return `${params.max_trip_minutes} min/trip`;
      if (params.max_daily_minutes != null) return `${params.max_daily_minutes} min/day`;
      return '—';

    default:
      return rule.threshold_value ?? '—';
  }
}

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
          <TableCell>{formatThreshold(rule)}</TableCell>
          <TableCell>{rule.fleet_group_name ?? rule.fleet_group_id}</TableCell>
           <TableCell>
              <button
                type="button"
                role="switch"
                aria-checked={rule.is_active}
                disabled={togglingId === rule.id}
                onClick={() => handleToggleActive(rule)}
                className={
                      'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 ' +
                      (rule.is_active ? 'bg-fleet-blue' : 'bg-fleet-border')
                }
              >
              <span
                className={
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ' +
                  (rule.is_active ? 'translate-x-5' : 'translate-x-0.5')
                }
              />
            </button>
          </TableCell>
          <TableCell className='text-right'>
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit rule"
                  onClick={() => { setEditingRule(rule); setEditModalOpen(true); }}
                >
                <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete rule"
                  className="text-fleet-alert hover:text-fleet-alert"
                  onClick={() => { setDeletingRule(rule); setDeleteModalOpen(true); }}
                >
                <Trash2 className="h-4 w-4" />
                </Button>
              </div>
          </TableCell>
        </TableRow>
      ))
  }

  return (
    <div className='bg-fleet-surface border border-fleet-border rounded-lg p-6 space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-display text-fleet-text'>Alerts Rules</h2>
        <Button className='bg-fleet-blue/90' onClick={() => setModalOpen(true)}>
          Create Alert Rules
        </Button>
      </div>

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

    <DeleteAlertRuleModal
      isOpen={deleteModalOpen}
      rule={deletingRule}
      onClose={() => setDeleteModalOpen(false)}
      onDeleted={() => fetchRules()}
    />

  </div>
  );
}