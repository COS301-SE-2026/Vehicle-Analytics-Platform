import { useState } from 'react';

import TriggeredAlertsTab from '@/components/alerts/TriggeredAlertsTab';
import AlertRulesTab from '@/components/alerts/AlertRulesTab';

// Page-level tabs. Mirrors the pattern used in VehicleProfile.jsx (TABS + activeTab state)
// so the underline-tab styling and switching behavior stays consistent across the app.
const TABS = [
  { id: 'rules', label: 'Alert Rules' },
  { id: 'triggered', label: 'Triggered Alerts' },
];

export default function CustomAlerts() {
  const [activeTab, setActiveTab] = useState('triggered');

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-1 border-b border-fleet-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`custom-alerts-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-fleet-blue text-fleet-text'
                : 'border-transparent text-fleet-secondary hover:text-fleet-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && <AlertRulesTab />}
      {activeTab === 'triggered' && <TriggeredAlertsTab />}
    </div>
  );
}