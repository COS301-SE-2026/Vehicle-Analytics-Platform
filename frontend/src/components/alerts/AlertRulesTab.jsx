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
import { describeEventTypes } from '../../utils/ruleFormConstants';


const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

const CONDITION_LABELS = {
  speed_threshold: 'Speed Threshold',

  time_based_restriction: 'Time Based Restriction',

  safety_score_drop: 'Safety Score Drop',

  repeated_unsafe_events: 'Repeated Unsafe Events',

  trip_duration_exceeded: 'Trip Duration Exceeded'
};

function formatDuration(minutes) {
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const THRESHOLD_FORMATTERS = {
  speed_threshold: (p) => (p.max_speed_kmh != null ? `${p.max_speed_kmh} km/h` : null),

  time_based_restriction: (p) =>
    p.start_time && p.end_time ? `${p.start_time}–${p.end_time}` : null,

  repeated_unsafe_events: (p) =>
    p.count != null && p.window_minutes != null
      ? `${p.count}x ${describeEventTypes(p.event_types)} in ${p.window_minutes}m`
      : null,

  safety_score_drop: (p) => (p.min_score != null ? `< ${p.min_score}` : null),

  trip_duration_exceeded: (p) => {
    const parts = [];
    if (p.max_trip_minutes != null) parts.push(`${formatDuration(p.max_trip_minutes)}/trip`);
    if (p.max_daily_minutes != null) parts.push(`${formatDuration(p.max_daily_minutes)}/day`);
    return parts.length ? parts.join(' · ') : null;
  },
};

function formatThreshold(rule) {
  const formatter = THRESHOLD_FORMATTERS[rule.condition_type];
  const params = rule.condition_params ?? {};
  return formatter?.(params) ?? rule.threshold_value ?? '—';
}


export default function AlertRulesTab() {
  const [rules, setRules] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [editingRule, setEditingRule] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);

  const [deletingRule, setDeletingRule] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

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

       const res = await axios.get(`${API_BASE}/api/fleet-groups/my-groups`, { 
          headers: token ? { Authorization: `Bearer ${token}` } : {},

        });      

        setFleetGroups(res.data.data.groups);

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
          <TableCell>{formatThreshold(rule)}</TableCell>
          <TableCell>{rule.fleet_group_name ?? rule.fleet_group_id}</TableCell>

          <TableCell>
            <span
              className={
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ' +
                (rule.status === 'active'
                  ? 'bg-fleet-green/30 text-fleet-green'
                  : 'bg-fleet-alert/30 text-fleet-alert')
              }
            >
              <span
                className={
                  'h-1.5 w-1.5 rounded-full ' +
                  (rule.status === 'active' ? 'bg-fleet-green' : 'bg-fleet-alert')
                }
              />
              {rule.status === 'active' ? 'Active' : 'Inactive'}
            </span> 
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