import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, AlertTriangle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useToast } from './ToastProvider';

const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

export default function DeleteAlertRuleModal({ isOpen, onClose, onDeleted, rule }) {
  const toast = useToast();

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');

  function handleClose(){
    if (submitting) 
      return;

    setError('');

    onClose();
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') 
        handleClose();
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const ruleName = rule?.rule_name ?? rule?.name ?? 'this rule';

  async function handleDelete() {
    if (!rule?.id) return setError('missing rule id');

    setError('');

    setSubmitting(true);

    try {
      const token = useAuthStore.getState().token;

      await axios.delete(`${API_BASE}/api/custom-alerts/rules/${rule.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      onDeleted?.(rule.id);

      onClose();

      toast.success('Alert Rule Deleted Successfully.', `"${ruleName}" has been removed.`);

    } catch (err) {
      const message = err.response?.data?.message || err.message;

      setError(message);

      toast.error('Failed to Delete Rule.', 'Please check your connection and try again.');

    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-fleet-blue/40 p-4"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-[440px] flex-col rounded-xl bg-fleet-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between rounded-t-xl border-b border-fleet-border px-6 py-5">
          <h2 className="font-display text-xl font-semibold text-fleet-text">
            Delete Alert Rule
          </h2>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-fleet-secondary hover:text-fleet-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-md border border-fleet-alert/30 bg-fleet-alert/10 px-3 py-2 text-sm text-fleet-alert">
              {error}
            </div>
          )}

          <div className="flex items-start gap-3">

            <span className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-full bg-fleet-alert/10 flex items-center justify-center text-fleet-alert">
              <AlertTriangle className="h-5 w-5" />
            </span>

            <p className="text-sm text-fleet-text">
              Are you sure you want to delete <span className="font-semibold">{ruleName}</span>?
              This rule will stop evaluating immediately and this action cannot be undone.
            </p>
            
          </div>
        </div>

        <div className="flex justify-end gap-3 rounded-b-xl border-t border-fleet-border px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md border border-fleet-border px-4 py-2 text-sm font-medium text-fleet-text hover:bg-fleet-panel disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-md bg-fleet-alert px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Deleting…' : 'Delete Rule'}
          </button>

        </div>
      </div>
    </div>
  );
}