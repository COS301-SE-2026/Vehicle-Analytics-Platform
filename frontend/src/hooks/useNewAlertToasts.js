import { useEffect, useRef } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/alerts/ToastProvider'; 

// Same fallback as the backend's local port. Never default to production:
// a local run without VITE_API_URL would otherwise poll the live API.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const POLL_INTERVAL_MS = 20000;

// Custom alert rules belong to fleet managers; the endpoint refuses everyone else.
const ALERT_ROLES = new Set(['manager', 'fleet_manager']);

export default function useNewAlertToasts() {
  const toast = useToast();
  const role = useAuthStore((state) => state.role);
  const lastCheckedRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!ALERT_ROLES.has(role)) return undefined;

    let cancelled = false;

    async function poll() {
      try {
        const token = useAuthStore.getState().token;
        const res = await axios.get(`${API_BASE}/api/alerts/triggered/new`, {
          params: { since: lastCheckedRef.current },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const { alerts, checked_at } = res.data.data ?? res.data;
        lastCheckedRef.current = checked_at;

        if (cancelled || !alerts?.length) return;

        if (alerts.length === 1) {
          const a = alerts[0];
          toast.warning(
            'Alert Rule Breached',
            `${a.vehicle_id} breached "${a.rule_snapshot?.name ?? a.condition_type}"`
          );
        } else {
          toast.warning(
            `${alerts.length} New Alerts`,
            `${alerts.length} vehicles breached alert rules. Check the Triggered Alerts tab.`
          );
        }
      } catch (err) {
        console.error('Alert polling failed:', err);
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [toast, role]);
}