import { useCallback, useState } from 'react'
import {
    generateReport, downloadReportPdf, getStoredReport, downloadStoredReportPdf,
} from '../services/reportServices'



export function requestFromReport(report){
    const custom = report.period.type === 'custom'
    return {
        scopeType: report.report.scope.type,
        scopeId: report.report.scope.id ?? undefined,
        periodType: report.period.type,
        anchor: custom ? undefined : (report.period.anchor || undefined),
        from: custom ? report.period.fromDate : undefined,
        to: custom ? report.period.toDate : undefined,
    }
}

function withoutStoredId(result){
    const dataset = { ...result }
    delete dataset.storedReportId
    return dataset
}



export default function useReportArchive({ report, setReport, setError }){
    const [storedReport, setStoredReport] = useState(null)
    const [busy, setBusy] = useState(null)
    const [historyKey, setHistoryKey] = useState(0)

    const resetStored = useCallback(() => setStoredReport(null), [])

    async function runAction(kind, action){
        setBusy(kind)
        setError(null)
        try {
            await action()
        } catch (err) {
            setError(err.message || 'Action failed')
        } finally {
            setBusy(null)
        }
    }

    function downloadPdf(){
        if (storedReport) {
            return runAction('pdf', () => downloadStoredReportPdf(storedReport.id))
        }
        return runAction('pdf', () => downloadReportPdf(requestFromReport(report)))
    }



    
    function saveReport(){
        return runAction('save', async () => {
            const result = await generateReport({ ...requestFromReport(report), save: true })
            setReport(withoutStoredId(result))
            setStoredReport({ id: result.storedReportId, trigger: 'manual', generatedAt: result.report?.generatedAt })
            setHistoryKey((key) => key + 1)
        })
    }

    function viewStored(reportId){
        return runAction('view', async () => {
            const stored = await getStoredReport(reportId)
            setReport(stored.dataset)
            setStoredReport({ id: stored.id, trigger: stored.trigger, generatedAt: stored.generatedAt })
        })
    }

    function closeStored(){
        setReport(null)
        setStoredReport(null)
    }

    return { storedReport, busy, historyKey, resetStored, downloadPdf, saveReport, viewStored, closeStored }
}
