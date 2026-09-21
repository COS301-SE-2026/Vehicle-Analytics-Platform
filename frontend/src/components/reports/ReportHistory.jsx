import { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { FileDown, Loader2, RefreshCw, Clock, User } from 'lucide-react'
import { listReportHistory, downloadStoredReportPdf } from '../../services/reportServices'

const TRIGGER_FILTERS = [
    { id: '', label: 'All' },
    { id: 'scheduled', label: 'Automated' },
    { id: 'manual', label: 'Manual' },
]

const PERIOD_LABEL = {
    weekly: 'Weekly',
    monthly: 'Monthly',
    current: 'Rolling 7 days',
    custom: 'Custom',
}

function formatDate(isoDate){
    if (!isoDate) return '-'
    const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-ZA', {
        day: '2-digit', month: 'short', year: 'numeric',
    })
}

function formatGenerated(iso) {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('en-ZA', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
}

function TriggerBadge({ trigger }) {
    const automated = trigger === 'scheduled'
    const Icon = automated ? Clock : User

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                automated
                    ? 'bg-fleet-blue/10 text-fleet-blue'
                    : 'bg-fleet-border text-fleet-secondary'
            }`}
        >
            <Icon className="w-3 h-3" />
            {automated ? 'Automated' : 'Manual'}
        </span>
    )
}

TriggerBadge.propTypes = { trigger: PropTypes.string }