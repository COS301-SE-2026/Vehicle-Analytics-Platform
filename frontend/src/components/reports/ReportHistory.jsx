// import { useState, useEffect, useCallback } from 'react'
// import PropTypes from 'prop-types'
// import { FileDown, Loader2, RefreshCw, Clock, User } from 'lucide-react'
// import { listReportHistory, downloadStoredReportPdf } from '../../services/reportServices'

// const TRIGGER_FILTERS = [
//     { id: '', label: 'All' },
//     { id: 'scheduled', label: 'Automated' },
//     { id: 'manual', label: 'Manual' },
// ]

// const PERIOD_LABEL = {
//     weekly: 'Weekly',
//     monthly: 'Monthly',
//     current: 'Rolling 7 days',
//     custom: 'Custom',
// }

// function formatDate(isoDate){
//     if (!isoDate) return '-'
//     const [y, m, d] = String(isoDate).slice(0, 10).split('-').map(Number)
//     return new Date(y, m - 1, d).toLocaleDateString('en-ZA', {
//         day: '2-digit', month: 'short', year: 'numeric',
//     })
// }

// function formatGenerated(iso){
//     if (!iso) return '-'
//     return new Date(iso).toLocaleString('en-ZA', {
//         day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
//     })
// }

// function TriggerBadge({ trigger }){
//     const automated = trigger === 'scheduled'
//     const Icon = automated ? Clock : User

//     return (
//         <span
//             className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
//                 automated
//                     ? 'bg-fleet-blue/10 text-fleet-blue'
//                     : 'bg-fleet-border text-fleet-secondary'
//             }`}
//         >
//             <Icon className="w-3 h-3" />
//             {automated ? 'Automated' : 'Manual'}
//         </span>
//     )
// }

// TriggerBadge.propTypes = { trigger: PropTypes.string }

// export default function ReportHistory({ refreshKey = 0 }){
//     const [reports, setReports] = useState([])
//     const [trigger, setTrigger] = useState('')
//     const [loading, setLoading] = useState(true)
//     const [error, setError] = useState(null)
//     const [downloadingId, setDownloadingId] = useState(null)

//     const load = useCallback(async () => {
//         setLoading(true)
//         setError(null)
//         try {
//             setReports(await listReportHistory({ trigger: trigger || undefined }))
//         } catch (err) {
//             setError(err.message || 'Failed to load report history')
//             setReports([])
//         } finally {
//             setLoading(false)
//         }
//     }, [trigger])

//     useEffect(() => { load() }, [load, refreshKey])

//     async function handleDownload(id){
//         setDownloadingId(id)
//         try {
//             await downloadStoredReportPdf(id)
//         } catch (err) {
//             setError(err.message || 'Failed to download report')
//         } finally {
//             setDownloadingId(null)
//         }
//     }

//     return (
//         <div className="space-y-4">
//             <div className="flex flex-wrap items-center justify-between gap-3">
//                 <div className="flex items-center gap-1">
//                     {TRIGGER_FILTERS.map((f) => (
//                         <button
//                             key={f.id || 'all'}
//                             type="button"
//                             onClick={() => setTrigger(f.id)}
//                             aria-pressed={trigger === f.id}
//                             className={`text-xs font-medium px-2.5 py-1 rounded-md border ${
//                                 trigger === f.id
//                                     ? 'border-fleet-blue text-fleet-blue'
//                                     : 'border-fleet-border text-fleet-secondary hover:text-fleet-text'
//                             }`}
//                         >
//                             {f.label}
//                         </button>
//                     ))}
//                 </div>

//                 <button
//                     type="button"
//                     onClick={load}
//                     disabled={loading}
//                     className="inline-flex items-center gap-1.5 text-xs font-medium text-fleet-secondary hover:text-fleet-text disabled:opacity-60"
//                 >
//                     <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
//                     Refresh
//                 </button>
//             </div>

//             {error && <p className="text-sm text-red-600">{error}</p>}

//             {loading && !reports.length ? (
//                 <div className="flex items-center justify-center gap-2 py-8 text-sm text-fleet-secondary">
//                     <Loader2 className="w-4 h-4 animate-spin" />
//                     Loading report history&hellip;
//                 </div>
//             ) : !reports.length ? (
//                 <p className="py-8 text-center text-sm text-fleet-secondary">
//                     No stored reports yet. Automated weekly reports appear here every Monday,
//                     or save the current report to keep a copy.
//                 </p>
//             ) : (
//                 <div className="overflow-x-auto border border-fleet-border rounded-2xl">
//                     <table className="w-full text-sm">
//                         <thead>
//                             <tr className="border-b border-fleet-border">
//                                 {['Scope', 'Period', 'Type', 'Source', 'Generated', ''].map((h) => (
//                                     <th
//                                         key={h || 'actions'}
//                                         className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider text-fleet-secondary"
//                                     >
//                                         {h}
//                                     </th>
//                                 ))}
//                             </tr>
//                         </thead>
//                         <tbody>
//                             {reports.map((r) => (
//                                 <tr key={r.id} className="border-b border-fleet-border last:border-0">
//                                     <td className="px-4 py-3 font-medium text-fleet-text">{r.scope.label}</td>
//                                     <td className="px-4 py-3 text-fleet-text tabular-nums">
//                                         {formatDate(r.period.fromDate)} &ndash; {formatDate(r.period.toDate)}
//                                     </td>
//                                     <td className="px-4 py-3 text-fleet-secondary">
//                                         {PERIOD_LABEL[r.period.type] || r.period.type}
//                                     </td>
//                                     <td className="px-4 py-3"><TriggerBadge trigger={r.trigger} /></td>
//                                     <td className="px-4 py-3 text-fleet-secondary tabular-nums">
//                                         {formatGenerated(r.generatedAt)}
//                                     </td>
//                                     <td className="px-4 py-3 text-right">
//                                         <button
//                                             type="button"
//                                             onClick={() => handleDownload(r.id)}
//                                             disabled={downloadingId === r.id}
//                                             className="inline-flex items-center gap-1.5 text-xs font-medium text-fleet-blue hover:underline disabled:opacity-60"
//                                         >
//                                             {downloadingId === r.id
//                                                 ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                                                 : <FileDown className="w-3.5 h-3.5" />}
//                                             PDF
//                                         </button>
//                                     </td>
//                                 </tr>
//                             ))}
//                         </tbody>
//                     </table>
//                 </div>
//             )}
//         </div>
//     )
// }

// ReportHistory.propTypes = {
//     refreshKey: PropTypes.number,
// }
