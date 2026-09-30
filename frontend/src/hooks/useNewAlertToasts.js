import { useEffect, useRef } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { useToast } from '../components/alerts/ToastProvider'; 

const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';
const POLL_INTERVAL_MS = 20000; 

export default function useNewAlertToasts() {
  const toast = useToast();
  const lastCheckedRef = useRef(new Date().toISOString());

  useEffect(() => {
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
  }, [toast]);
}