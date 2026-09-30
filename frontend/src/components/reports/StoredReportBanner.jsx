import PropTypes from 'prop-types'
import { Archive, X } from 'lucide-react'

function formatGeneratedAt(iso){
    if (!iso) return ''
    return new Date(iso).toLocaleString('en-ZA', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
}

export default function StoredReportBanner({ stored, onClose }){
    const source = stored.trigger === 'scheduled' ? 'automated' : 'manual'
    return (
        <div
            data-testid="stored-report-banner"
            className="flex flex-wrap items-center justify-between gap-3 bg-fleet-blue/5 border border-fleet-blue/20 rounded-2xl px-4 py-3"
        >
            <p className="flex items-center gap-2 text-sm text-fleet-text">
                <Archive className="w-4 h-4 text-fleet-blue shrink-0" />
                Stored {source} report, generated {formatGeneratedAt(stored.generatedAt)}.
            </p>
            <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 text-xs font-medium text-fleet-secondary hover:text-fleet-text"
            >
                <X className="w-3.5 h-3.5" />
                Close
            </button>
        </div>
    )
}

StoredReportBanner.propTypes = {
    stored: PropTypes.shape({
        id: PropTypes.number,
        trigger: PropTypes.string,
        generatedAt: PropTypes.string,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
}
