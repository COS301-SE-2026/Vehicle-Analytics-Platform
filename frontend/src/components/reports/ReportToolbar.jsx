import PropTypes from 'prop-types'
import { Calendar as CalendarIcon, Sparkles, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'

export const PERIOD_TYPES = [
    { id: 'weekly', label: 'Last complete week' },
    { id: 'monthly', label: 'Last complete month' },
    { id: 'current', label: 'Last 7 days of data' },
    { id: 'custom', label: 'Custom range' },
]

function formatDateLabel(date){
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
}

const FIELD_CLASS =
    'border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white min-w-[200px]'

const LABEL_CLASS =
    'text-xs font-semibold uppercase tracking-wider text-fleet-secondary'

export default function ReportToolbar({
    scopes,
    scopeValue,
    onScopeChange,
    periodType,
    onPeriodTypeChange,
    dateRange,
    onDateRangeChange,
    compareMode,
    onCompareModeChange,
    onGenerate,
    loading,
}) {
    const vehiclesByGroup = scopes.groups.map((group) => ({
        group,
        vehicles: scopes.vehicles.filter((v) => v.groupId === group.id),
    }))

    const ungroupedVehicles = scopes.vehicles.filter((v) => v.groupId === null)
    const rangeLabel = `${formatDateLabel(dateRange?.from)} - ${formatDateLabel(dateRange?.to)}`
    const customIncomplete = periodType === 'custom' && (!dateRange?.from || !dateRange?.to)

    return (
        <div className="bg-white rounded-2xl border border-fleet-border p-5 shadow-sm">
            <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="report-period" className={LABEL_CLASS}>
                        Timeframe
                    </label>
                    <select
                        id="report-period"
                        value={periodType}
                        onChange={(e) => onPeriodTypeChange(e.target.value)}
                        className={FIELD_CLASS}
                    >
                        {PERIOD_TYPES.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                    </select>
                </div>

                {periodType === 'custom' && (
                    <div className="flex flex-col gap-1.5">
                        <span className={LABEL_CLASS}>Dates</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    data-testid="report-calendar-trigger"
                                    className="flex items-center gap-2 border border-fleet-border rounded-lg px-3 py-2 text-sm text-fleet-text bg-white hover:border-fleet-blue"
                                >
                                    <CalendarIcon size={14} className="text-fleet-secondary" />
                                    {rangeLabel}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" align="start">
                                <Calendar
                                    mode="range"
                                    selected={dateRange}
                                    onSelect={onDateRangeChange}
                                    numberOfMonths={2}
                                    captionLayout="dropdown"
                                    fromYear={2020}
                                    toYear={2030}
                                    className="min-w-[220px]"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="report-scope" className={LABEL_CLASS}>
                        Fleet selection
                    </label>
                    <select
                        id="report-scope"
                        value={scopeValue}
                        onChange={(e) => onScopeChange(e.target.value)}
                        className={FIELD_CLASS}
                    >
                        <option value="fleet">Entire fleet</option>

                        {scopes.groups.length > 0 && (
                            <optgroup label="Vehicle groups">
                                {scopes.groups.map((g) => (
                                    <option key={`group-${g.id}`} value={`group:${g.id}`}>{g.name}</option>
                                ))}
                            </optgroup>
                        )}

                        {vehiclesByGroup.map(({ group, vehicles }) => (
                            vehicles.length > 0 && (
                                <optgroup key={`vehicles-${group.id}`} label={`${group.name} - vehicles`}>
                                    {vehicles.map((v) => (
                                        <option key={v.vehicleId} value={`vehicle:${v.vehicleId}`}>
                                            {v.vehicleId}
                                        </option>
                                    ))}
                                </optgroup>
                            )
                        ))}

                        {ungroupedVehicles.length > 0 && (
                            <optgroup label="Ungrouped vehicles">
                                {ungroupedVehicles.map((v) => (
                                    <option key={v.vehicleId} value={`vehicle:${v.vehicleId}`}>
                                        {v.vehicleId}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                </div>

                <div className="flex items-center gap-2 pb-2">
                    <button
                        type="button"
                        role="switch"
                        aria-checked={compareMode}
                        data-testid="report-compare-toggle"
                        onClick={() => onCompareModeChange(!compareMode)}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
                            compareMode ? 'bg-fleet-blue' : 'bg-fleet-border'
                        }`}
                    >
                        <span
                            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                compareMode ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                        />
                    </button>
                    <span className="text-sm text-fleet-text">Compare vehicles</span>
                </div>

                <button
                    type="button"
                    onClick={onGenerate}
                    disabled={loading || customIncomplete}
                    data-testid="report-generate"
                    className="ml-auto bg-fleet-blue text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-fleet-blue/90 disabled:opacity-60 flex items-center gap-2"
                >
                    {loading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Sparkles className="w-4 h-4" />}
                    {loading ? 'Generating...' : 'Generate Analysis'}
                </button>
            </div>

            {customIncomplete && (
                <p className="mt-3 text-xs text-fleet-secondary">
                    Pick both a start and an end date. Both ends are included in the report.
                </p>
            )}

            {scopes.unassignedVehicleCount > 0 && (
                <p className="mt-3 text-xs text-fleet-secondary">
                    {scopes.unassignedVehicleCount} vehicle(s) are not assigned to any group and fall
                    outside every manager-scoped report.
                </p>
            )}
        </div>
    )
}

ReportToolbar.propTypes = {
    scopes: PropTypes.shape({
        groups: PropTypes.array.isRequired,
        vehicles: PropTypes.array.isRequired,
        unassignedVehicleCount: PropTypes.number,
    }).isRequired,
    scopeValue: PropTypes.string.isRequired,
    onScopeChange: PropTypes.func.isRequired,
    periodType: PropTypes.string.isRequired,
    onPeriodTypeChange: PropTypes.func.isRequired,
    dateRange: PropTypes.object,
    onDateRangeChange: PropTypes.func.isRequired,
    compareMode: PropTypes.bool.isRequired,
    onCompareModeChange: PropTypes.func.isRequired,
    onGenerate: PropTypes.func.isRequired,
    loading: PropTypes.bool,
}

ReportToolbar.defaultProps = {
    dateRange: null,
    loading: false,
}