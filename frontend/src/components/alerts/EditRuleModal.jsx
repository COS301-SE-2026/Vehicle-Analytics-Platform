import { useState, useEffect } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useToast } from './ToastProvider';
import RuleConditionFields from './RuleConditionFields';
import useRuleForm from '../../hooks/useRuleForm';
import { paramsFromRule } from './ruleFormConstants';

const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

export default function EditAlertRuleModal({ isOpen, onClose, onUpdated, rule, fleetGroups = [] }) {

  const toast = useToast();

  const form = useRuleForm();

  const [status, setStatus] = useState('active');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {

    if(!rule) 
      return;

    const type = rule.condition_type ?? 'speed_threshold';

    form.reset({
      conditionType: type,

      name: rule.name ?? rule.rule_name ?? '',

      fleetGroupId: rule.fleet_group_id ?? '',

      params: paramsFromRule(rule, type),
    });

    setStatus(rule.status ?? 'active');
   
  }, [rule]);

  if(!isOpen)
    return null;

  async function handleSubmit(e) {
    e.preventDefault();

    form.setError('');

    if(!form.name.trim()) 
      return form.setError('name is required');

    if(!form.fleetGroupId) 
      return form.setError('fleet_group_id is required');

    if(!rule?.id) 
      return form.setError('missing rule id');

    setSubmitting(true);

    try {
      const token = useAuthStore.getState().token;

      const res = await axios.put(
        `${API_BASE}/api/custom-alerts/rules/${rule.id}`,
        {
          name: form.name.trim(),
          fleet_group_id: form.fleetGroupId,
          condition_type: form.conditionType,
          condition_params: form.buildConditionParams(),
          status,
        },

        { headers: token ? { Authorization: `Bearer ${token}` } : {} }

      );

      onUpdated?.(res.data.data ?? res.data);

      onClose();

      toast.success('Alert Rule Updated Successfully.', `Changes to "${form.name.trim()}" have been saved.`);

    } catch (err) {

      const message = err.response?.data?.message || err.message;

      form.setError(message);

      toast.error('Failed to Update Rule.', 'Please check your connection and try again.');

    } finally {
      setSubmitting(false);
    }
  }

  return (
    
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-fleet-blue/40 cursor-default"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-[520px] flex-col rounded-xl bg-fleet-surface shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between rounded-t-xl border-b border-fleet-border px-6 py-5">
          <h2 className="font-display text-xl font-semibold text-fleet-text">
            Edit Custom Alert
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-fleet-secondary hover:text-fleet-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5 [scrollbar-gutter:stable]">
          <RuleConditionFields
            conditionType={form.conditionType}
            params={form.params}
            error={form.error}
            name={form.name}
            fleetGroupId={form.fleetGroupId}
            fleetGroups={fleetGroups}
            onSelectCondition={(type) => form.selectCondition(type, paramsFromRule(rule, type))}
            onNameChange={form.setName}
            onFleetGroupChange={form.setFleetGroupId}
            onUpdateParam={form.updateParam}
            onToggleFromList={form.toggleFromList}
          >
            <div className="mb-1 flex items-center justify-between rounded-md border border-fleet-border px-3.5 py-3">
              <div className="flex-1 min-w-0 pr-3">
                <p className="text-sm font-medium text-fleet-text">Rule Status</p>
                <p className="text-xs text-fleet-secondary">Inactive rules stop evaluating but keep their configuration.</p>
              </div>

              <div className="inline-flex overflow-hidden rounded-md border border-fleet-border">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  aria-pressed={status === 'active'}
                  className={
                    'px-4 py-1.5 text-sm font-medium transition-colors ' +
                    (status === 'active'
                      ? 'bg-fleet-green/30 text-fleet-green'
                      : 'bg-fleet-surface text-fleet-secondary hover:bg-fleet-panel')
                  }
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  aria-pressed={status === 'inactive'}
                  className={
                    'px-4 py-1.5 text-sm font-medium transition-colors border-l border-fleet-border ' +
                    (status === 'inactive'
                      ? 'bg-fleet-alert/30 text-fleet-alert'
                      : 'bg-fleet-surface text-fleet-secondary hover:bg-fleet-panel')
                  }
                >
                  Inactive
                </button>
              </div>
            </div>
          </RuleConditionFields>
        </form>

        <div className="flex justify-end gap-3 rounded-b-xl border-t border-fleet-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-fleet-border px-4 py-2 text-sm font-medium text-fleet-text hover:bg-fleet-panel"
          >
            Cancel
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-md bg-fleet-blue px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}