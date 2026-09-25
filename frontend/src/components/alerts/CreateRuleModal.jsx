import { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { useToast } from './ToastProvider';
import RuleConditionFields from './RuleConditionFields';
import useRuleForm from '../../hooks/useRuleForm';
import useBacktestPreview from '../../hooks/useBacktestPreview';
import BacktestPreviewToggle from './BacktestPreviewToggle';
import BacktestPreviewPanel from './BacktestPreviewPanel';
import { EMPTY_PARAMS } from './ruleFormConstants';

const API_BASE = import.meta.env.VITE_API_URL || 'https://8cvbs5cpn9.execute-api.af-south-1.amazonaws.com/prod';

export default function CreateAlertRuleModal({ isOpen, onClose, onCreated, fleetGroups = [] }) {
  const toast = useToast();
  const form = useRuleForm();
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const preview = useBacktestPreview({
    conditionType: form.conditionType,
    params: form.params,
    fleetGroupId: form.fleetGroupId,
    enabled: previewOpen,
  });

  if (!isOpen) return null;

  function handleClose() {
    setPreviewOpen(false);
    form.reset();
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    form.setError('');

    if (!form.name.trim()) return form.setError('name is required');
    if (!form.fleetGroupId) return form.setError('fleet_group_id is required');

    setSubmitting(true);

    try {
      const token = useAuthStore.getState().token;

      const res = await axios.post(
        `${API_BASE}/api/custom-alerts/rules`,
        {
          name: form.name.trim(),
          fleet_group_id: form.fleetGroupId,
          condition_type: form.conditionType,
          condition_params: form.buildConditionParams(),
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      onCreated?.(res.data.data ?? res.data);
      handleClose();
      toast.success('Alert Rule Created Successfully.', 'Your new rule is now active.');
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      form.setError(message);
      toast.error('Failed to Create Rule.', 'Please check your connection and try again.');
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
        onClick={handleClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') handleClose();
        }}
      />

      <div className="relative flex items-stretch rounded-xl bg-fleet-surface shadow-2xl overflow-visible max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* form half */}
        <div className="flex w-full max-w-[520px] flex-col">
          <div className="flex items-center justify-between border-b border-fleet-border px-6 py-5">
            <h2 className="font-display text-xl font-semibold text-fleet-text">
              Create New Custom Alert
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

          <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <RuleConditionFields
              conditionType={form.conditionType}
              params={form.params}
              error={form.error}
              name={form.name}
              fleetGroupId={form.fleetGroupId}
              fleetGroups={fleetGroups}
              onSelectCondition={(type) => form.selectCondition(type, EMPTY_PARAMS[type])}
              onNameChange={form.setName}
              onFleetGroupChange={form.setFleetGroupId}
              onUpdateParam={form.updateParam}
              onToggleFromList={form.toggleFromList}
            />
          </form>

          <div className="relative flex justify-end gap-3 border-t border-fleet-border px-6 py-4">
            <button
              type="button"
              onClick={handleClose}
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
              {submitting ? 'Creating…' : 'Create Alert Rule'}
            </button>
          </div>
        </div>

        {!previewOpen && (
              <BacktestPreviewToggle
                onClick={() => setPreviewOpen(true)}
                hasRequiredInputs={preview.hasRequiredInputs}
                totalAlerts={preview.data?.total_alerts}
                loading={preview.loading}
              />
        )}

        {previewOpen && (
          <div className="border-l border-fleet-border">
            <BacktestPreviewPanel
              data={preview.data}
              loading={preview.loading}
              error={preview.error}
              onClose={() => setPreviewOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}