import PropTypes from 'prop-types'
import { TrendingDown, TrendingUp, Info } from 'lucide-react'


const COMPARISON_METRICS = [
    'safetyScore', 'totalEvents', 'harshBrakes', 'harshAccelerations', 'harshCornering',
    'crashes', 'overspeedEvents', 'idlingEvents', 'totalDistanceKm', 'utilisationPct',
    'activeVehicles', 'avgEfficiencyKmPerL',
]

const DIRECTION = {
    improved: { label: 'Improved', tone: 'text-fleet-green' },
    deteriorated: { label: 'Worse', tone: 'text-red-600' },
    increased: { label: 'Up', tone: 'text-fleet-secondary' },
    decreased: { label: 'Down', tone: 'text-fleet-secondary' },
    stable: { label: 'Stable', tone: 'text-fleet-secondary' },
    no_baseline: { label: 'No baseline', tone: 'text-fleet-secondary' },
    insufficient_baseline: { label: 'Low baseline data', tone: 'text-amber-700' },
    unavailable: { label: 'No data', tone: 'text-fleet-secondary' },
    improving: { label: 'Improving', tone: 'text-fleet-green' },
    deteriorating: { label: 'Deteriorating', tone: 'text-red-600' },
    increasing: { label: 'Increasing', tone: 'text-fleet-secondary' },
    decreasing: { label: 'Decreasing', tone: 'text-fleet-secondary' },
    volatile: { label: 'Volatile', tone: 'text-amber-700' },
    insufficient_data: { label: 'Too few weeks', tone: 'text-fleet-secondary' },
}

function formatNumber(value) {
    if (value === null || value === undefined) return '-'
    if (typeof value !== 'number') return String(value)
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function withUnit(value, unit) {
    const text = formatNumber(value)
    if (text === '-' || !unit || unit === 'events') return text
    return unit === '%' ? `${text}%` : `${text} ${unit}`
}

function formatPercent(percent) {
    if (percent === null || percent === undefined) return null
    return `${percent > 0 ? '+' : ''}${percent}%`
}

function SubHeading({ children }) {
    return (
        <h3 className="text-xs font-semibold uppercase tracking-wider text-fleet-secondary mb-3">
            {children}
        </h3>
    )
}

SubHeading.propTypes = { children: PropTypes.node.isRequired }

function Note({ children }) {
    return (
        <p className="flex items-start gap-2 text-xs text-fleet-secondary mt-3">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{children}</span>
        </p>
    )
}

Note.propTypes = { children: PropTypes.node.isRequired }

function Finding({ worse, children }) {
    const Icon = worse ? TrendingDown : TrendingUp
    return (
        <li className="flex items-start gap-2 text-sm">
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${worse ? 'text-red-600' : 'text-fleet-green'}`} />
            <span className="text-fleet-text">
                <span className={`font-semibold ${worse ? 'text-red-600' : 'text-fleet-green'}`}>
                    {worse ? 'Worse' : 'Better'}
                </span>
                {' '}
                {children}
            </span>
        </li>
    )
}

Finding.propTypes = { worse: PropTypes.bool.isRequired, children: PropTypes.node.isRequired }

function KeyFindings({ insights, previousPeriod, baselineSufficient }) {
    const changes = insights?.changes || []
    const trends = insights?.trends || []

    return (
        <section data-testid="key-findings">
            <SubHeading>Key findings</SubHeading>

            {previousPeriod && !baselineSufficient && (
                <Note>
                    {previousPeriod.label} saw too little activity for a fair comparison, so changes
                    against it are shown without a verdict.
                </Note>
            )}

            {changes.length === 0 && trends.length === 0 ? (
                <p className="text-sm text-fleet-secondary">
                    {!previousPeriod && 'No comparison period is available for this report.'}
                    {previousPeriod && baselineSufficient
                        && `No significant improvement or deterioration against ${previousPeriod.label}.`}
                    {previousPeriod && !baselineSufficient
                        && 'No verdict can be drawn for this period. The raw figures are in the comparison table below.'}
                </p>
            ) : (
                <ul className="space-y-2">
                    {changes.map((c) => (
                        <Finding key={`change-${c.metric}`} worse={c.direction === 'deteriorated'}>
                            {c.label}: {withUnit(c.previous, c.unit)} → {withUnit(c.current, c.unit)}
                            {' '}
                            <span className="text-fleet-secondary">
                                ({formatPercent(c.percentChange) || 'from zero'})
                            </span>
                        </Finding>
                    ))}
                    {trends.map((t) => (
                        <Finding key={`trend-${t.metric}`} worse={t.direction === 'deteriorating'}>
                            Weekly trend in {t.label.toLowerCase()}: {withUnit(t.first, t.unit)} → {withUnit(t.last, t.unit)}
                            {' '}
                            <span className="text-fleet-secondary">over {t.weeksWithData} weeks</span>
                        </Finding>
                    ))}
                </ul>
            )}
        </section>
    )
}

KeyFindings.propTypes = {
    insights: PropTypes.object,
    previousPeriod: PropTypes.object,
    baselineSufficient: PropTypes.bool,
}

KeyFindings.defaultProps = { insights: null, previousPeriod: null, baselineSufficient: false }

function ComparisonTable({ comparison, previousPeriod }) {
    const rows = COMPARISON_METRICS.map((key) => comparison[key]).filter((row) => row && row.current !== null)
    if (!rows.length) return null

    return (
        <section data-testid="period-comparison">
            <SubHeading>Compared with {previousPeriod.label}</SubHeading>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-fleet-border text-xs uppercase tracking-wider text-fleet-secondary">
                            <th className="py-2 pr-4 text-left font-semibold">Metric</th>
                            <th className="py-2 px-2 text-right font-semibold">This period</th>
                            <th className="py-2 px-2 text-right font-semibold">Previous</th>
                            <th className="py-2 px-2 text-right font-semibold">Change</th>
                            <th className="py-2 pl-2 text-right font-semibold">Direction</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const dir = DIRECTION[row.direction] || DIRECTION.unavailable
                            return (
                                <tr key={row.metric} className="border-b border-fleet-border last:border-0">
                                    <td className="py-2 pr-4 text-fleet-text">{row.label}</td>
                                    <td className="py-2 px-2 text-right tabular-nums">{withUnit(row.current, row.unit)}</td>
                                    <td className="py-2 px-2 text-right tabular-nums text-fleet-secondary">{withUnit(row.previous, row.unit)}</td>
                                    <td className="py-2 px-2 text-right tabular-nums">{formatPercent(row.percentChange) || '-'}</td>
                                    <td className={`py-2 pl-2 text-right font-medium ${dir.tone}`}>{dir.label}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <Note>
                Changes under 5% are treated as stable. Fuel figures are model estimates for the
                vehicles that have fuel data.
            </Note>
        </section>
    )
}

ComparisonTable.propTypes = {
    comparison: PropTypes.object.isRequired,
    previousPeriod: PropTypes.object.isRequired,
}

function TrendTable({ trends }) {
    const metrics = Object.values(trends.metrics || {}).filter((m) => m.classification !== 'insufficient_data')
    if (!metrics.length) return null
    const { coverage } = trends

    return (
        <section data-testid="weekly-trend">
            <SubHeading>Week-by-week trend</SubHeading>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-fleet-border text-xs uppercase tracking-wider text-fleet-secondary">
                            <th className="py-2 pr-4 text-left font-semibold">Metric</th>
                            {trends.weeks.map((w) => (
                                <th key={w.index} className="py-2 px-2 text-right font-semibold" title={w.dateLabel}>
                                    {w.label}
                                    <span className="block font-normal normal-case tracking-normal">{w.dateLabel}</span>
                                </th>
                            ))}
                            <th className="py-2 pl-2 text-right font-semibold">Trend</th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.map((m) => {
                            const dir = DIRECTION[m.classification] || DIRECTION.insufficient_data
                            return (
                                <tr key={m.metric} className="border-b border-fleet-border last:border-0">
                                    <td className="py-2 pr-4 text-fleet-text">{m.label}</td>
                                    {m.points.map((p) => (
                                        <td key={p.index} className="py-2 px-2 text-right tabular-nums">{withUnit(p.value, m.unit)}</td>
                                    ))}
                                    <td className={`py-2 pl-2 text-right font-medium ${dir.tone}`}>{dir.label}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {coverage && (coverage.leadInDays > 0 || coverage.trailingDays > 0) && (
                <Note>
                    Only whole Monday to Sunday weeks are trended ({coverage.firstDate} to {coverage.lastDate}).
                    {' '}
                    {coverage.leadInDays + coverage.trailingDays} day(s) at the edges of the period are
                    included in the totals but not in this table.
                </Note>
            )}
        </section>
    )
}

TrendTable.propTypes = { trends: PropTypes.object.isRequired }

function RankingList({ title, ranking, empty }) {
    const entries = ranking && ranking.status === 'ok' ? ranking.entries : []
    return (
        <div>
            <p className="text-sm font-semibold text-fleet-text mb-2">{title}</p>
            {entries.length === 0 ? (
                <p className="text-xs text-fleet-secondary">{empty}</p>
            ) : (
                <ol className="space-y-1">
                    {entries.map((e) => (
                        <li key={e.id} className="flex justify-between text-sm">
                            <span className="text-fleet-text">{e.rank}. {e.id}{e.tied ? ' (tied)' : ''}</span>
                            <span className="tabular-nums text-fleet-secondary">{withUnit(e.value, ranking.unit)}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}

RankingList.propTypes = {
    title: PropTypes.string.isRequired,
    ranking: PropTypes.object,
    empty: PropTypes.string.isRequired,
}

RankingList.defaultProps = { ranking: null }

function Rankings({ rankings }) {
    return (
        <section data-testid="rankings">
            <SubHeading>Vehicle rankings</SubHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <RankingList
                    title="Requiring attention"
                    ranking={rankings.vehiclesRequiringAttention}
                    empty="No vehicle scored Fair or Poor in this period."
                />
                <RankingList
                    title="Safest vehicles"
                    ranking={rankings.safestVehicles}
                    empty="No vehicle scored Good or Excellent in this period."
                />
                <RankingList
                    title="Most events"
                    ranking={rankings.mostEvents}
                    empty="Too few vehicles with events to rank."
                />
            </div>
            <Note>
                Attention and safest lists use the existing safety classification bands
                (Excellent 90+, Good 75+, Fair 50+, Poor below 50).
            </Note>
        </section>
    )
}

Rankings.propTypes = { rankings: PropTypes.object.isRequired }

export default function ReportAnalysis({ report }) {
    const comparison = {
        ...(report.distance?.comparison || {}),
        ...(report.fuel?.comparison || {}),
        ...(report.safety?.comparison || {}),
    }

    return (
        <div className="space-y-8">
            <KeyFindings
                insights={report.insights}
                previousPeriod={report.previousPeriod}
                baselineSufficient={Boolean(report.coverage?.baselineSufficient)}
            />
            {report.previousPeriod && (
                <ComparisonTable comparison={comparison} previousPeriod={report.previousPeriod} />
            )}
            {report.trends && <TrendTable trends={report.trends} />}
            {report.rankings && <Rankings rankings={report.rankings} />}
        </div>
    )
}

ReportAnalysis.propTypes = {
    report: PropTypes.shape({
        insights: PropTypes.object,
        previousPeriod: PropTypes.object,
        coverage: PropTypes.object,
        safety: PropTypes.object,
        distance: PropTypes.object,
        fuel: PropTypes.object,
        trends: PropTypes.object,
        rankings: PropTypes.object,
    }).isRequired,
}
