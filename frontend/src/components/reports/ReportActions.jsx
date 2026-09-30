import PropTypes from 'prop-types'
import { Loader2, FileDown, Save } from 'lucide-react'

const BUTTON = 'flex items-center gap-2 rounded-lg px-3 py-2 text-sm disabled:opacity-60'

export default function ReportActions({ canSave, busy = null, onSave, onDownloadPdf }){
    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {canSave && (
                <button
                    type="button"
                    onClick={onSave}
                    disabled={busy !== null}
                    className={`${BUTTON} border border-fleet-border text-fleet-text bg-white hover:border-fleet-blue`}
                >
                    {busy === 'save'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Save className="w-4 h-4 text-fleet-secondary" />}
                    {busy === 'save' ? 'Saving...' : 'Save to history'}
                </button>
            )}

            <button
                type="button"
                onClick={onDownloadPdf}
                disabled={busy !== null}
                className={`${BUTTON} bg-fleet-blue text-white hover:bg-fleet-blue/90`}
            >
                {busy === 'pdf'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <FileDown className="w-4 h-4" />}
                {busy === 'pdf' ? 'Preparing...' : 'Download PDF'}
            </button>
        </div>
    )
}

ReportActions.propTypes = {
    canSave: PropTypes.bool.isRequired,
    busy: PropTypes.string,
    onSave: PropTypes.func.isRequired,
    onDownloadPdf: PropTypes.func.isRequired,
}
