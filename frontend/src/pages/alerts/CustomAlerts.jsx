import { useState } from 'react'

import TriggeredAlertsTab from '@/components/alerts/AlertRulesTab';
import AlertRulesTab from '@/components/alerts/TriggeredAlertsTab';

const TABS = [
    { id: 'rules', label: 'Alert Rules'},
    { id: 'triggered', label: 'Triggered Alerts'},
];

export default function CustomAlerts() {
    const [activeTab, SetActiveTab ] = useState('triggered');

    return(
        <div className='p-6 space-y-4'>
            <div className='flex items-center gap-1 border-b border-fleet-border'>
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        data-testid={`custom-alerts-tab-${tab.id}`}
                        onClick={() => SetActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                            activeTab === tab.id
                            ? 'border-fleet-blue text-fleet-text'
                            : 'border-transparent text-fleet-secondary hover:text-fleet-text'
                        }`}
                    >
                        {tab.label}{}
                    </button>
                ))}
            </div>

            {activeTab === 'rules' && <AlertRulesTab />}
            {activeTab === 'triggered' && <TriggeredAlertsTab/>}
        </div>
    );
}