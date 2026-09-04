import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import Reports from '../pages/reports/Reports'
import { getReportScopes, generateReport } from '../services/reportServices'

jest.mock('../services/reportServices')
jest.mock('../components/reports/SafetySummaryCards', () => ({ __esModule: true, default: ({ summary }) => <div data-testid="summary-cards" data-score={String(summary.safetyScore)} /> }))
jest.mock('../components/reports/SafetyVehicleTable', () => ({ __esModule: true, default: ({ vehicles }) => <div data-testid="safety-table">{vehicles.map(v => v.vehicleId).join(',')}</div> }))
jest.mock('../components/reports/VehicleComparisonChart', () => ({ __esModule: true, default: ({ vehicles }) => <div data-testid="comparison-chart">{vehicles.map(v => v.vehicleId).join(',')}</div> }))
jest.mock('../components/reports/ReportToolbar', () => ({
  __esModule: true,
  default: ({ scopeValue, periodType, loading, compareMode, candidateVehicles, selectedVehicleIds, onScopeChange, onPeriodTypeChange, onDateRangeChange, onCompareModeChange, onToggleVehicle, onGenerate }) => (
    <div data-testid="toolbar">
      <span data-testid="toolbar-scope">{scopeValue}</span><span data-testid="toolbar-period">{periodType}</span>
      <span data-testid="toolbar-loading">{String(loading)}</span><span data-testid="toolbar-compare">{String(compareMode)}</span>
      <span data-testid="toolbar-candidates">{candidateVehicles.map(v => v.vehicleId).join(',')}</span>
      <span data-testid="toolbar-selected">{selectedVehicleIds.join(',')}</span>
      {['group:1', 'vehicle:V001', 'fleet'].map(s => <button key={s} onClick={() => onScopeChange(s)}>set-{s.split(':')[0]}</button>)}
      {['custom', 'monthly'].map(p => <button key={p} onClick={() => onPeriodTypeChange(p)}>set-{p}</button>)}
      <button onClick={() => onDateRangeChange({ from: new Date(2026, 7, 3), to: new Date(2026, 7, 9) })}>set-dates</button>
      <button onClick={() => onCompareModeChange(!compareMode)}>toggle-compare</button>
      {['V001', 'V002'].map(v => <button key={v} onClick={() => onToggleVehicle(v)}>pick-{v}</button>)}
      <button onClick={onGenerate}>generate</button>
    </div>
  )
}))

const SCOPES = {
  groups: [{ id: 1, name: 'Delivery' }],
  vehicles: [{ vehicleId: 'V001', groupId: 1 }, { vehicleId: 'V002', groupId: 1 }, { vehicleId: 'V005', groupId: null }],
  unassignedVehicleCount: 1,
}

const buildReport = (overrides = {}) => ({
  report: { scope: { label: 'Assigned fleet' } },
  period: { label: '3 - 9 Aug 2026', fromDate: '2026-08-03', toDate: '2026-08-09' },
  coverage: { hasTelemetry: true, vehiclesInScope: 3, vehiclesWithEvents: 2, activeVehicles: 3 },
  safety: { summary: { safetyScore: 78 }, vehicles: [{ vehicleId: 'V001' }, { vehicleId: 'V002' }], comparison: {} },
  distance: { summary: { totalDistanceKm: 4821.6 }, vehicles: [], comparison: {} },
  fuel: { summary: { totalFuelLiters: 512.4 }, vehicles: [], comparison: {} },
  rankings: { entities: [{ vehicleId: 'V001', safetyScore: 92 }, { vehicleId: 'V002', safetyScore: 64 }] },
  ...overrides,
})

async function setupAndGenerate(overrides = {}) {
  const user = userEvent.setup()
  render(<Reports />)
  await waitFor(() => expect(getReportScopes).toHaveBeenCalled())
  if (!overrides.skipGenerate) {
    await user.click(screen.getByText('generate'))
    if (!overrides.expectError) await waitFor(() => expect(screen.getByTestId('safety-table')).toBeInTheDocument())
  }
  return user
}

beforeEach(() => {
  jest.clearAllMocks()
  getReportScopes.mockResolvedValue(SCOPES)
  generateReport.mockResolvedValue(buildReport())
})

describe('Reports - initial load', () => {
  test('renders heading, loads scopes, and defaults correctly', async () => {
    render(<Reports />)
    expect(screen.getByText('Fleet Reports')).toBeInTheDocument()
    expect(screen.getByText(/Choose a timeframe and a scope/i)).toBeInTheDocument()
    expect(screen.getByTestId('toolbar-period')).toHaveTextContent('weekly')
    expect(screen.getByTestId('toolbar-scope')).toHaveTextContent('fleet')
    await waitFor(() => expect(getReportScopes).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('toolbar-candidates')).toHaveTextContent('V001,V002,V005')
    expect(screen.queryByText('Export CSV')).not.toBeInTheDocument()
  })

  test('falls back to empty scopes on failure', async () => {
    getReportScopes.mockRejectedValue(new Error('403'))
    render(<Reports />)
    await waitFor(() => expect(screen.getByTestId('toolbar-candidates')).toHaveTextContent(''))
  })
})

describe('Reports - candidate vehicles follow the scope', () => {
  test.each([
    ['set-group', 'V001,V002'],
    ['set-vehicle', 'V001'],
    ['set-fleet', 'V001,V002,V005']
  ])('%s narrows candidates to %s', async (btn, expected) => {
    const user = await setupAndGenerate({ skipGenerate: true })
    if (btn === 'set-fleet') await user.click(screen.getByText('set-group')) // Trigger reset
    await user.click(screen.getByText(btn))
    expect(screen.getByTestId('toolbar-candidates')).toHaveTextContent(expected)
  })
})

describe('Reports - request construction & compare mode', () => {
  test.each([
    ['default fleet', [], { scopeType: 'fleet', scopeId: undefined, periodType: 'weekly' }],
    ['group scope', ['set-group'], { scopeType: 'group', scopeId: '1' }],
    ['vehicle scope', ['set-vehicle'], { scopeType: 'vehicle', scopeId: 'V001' }],
    ['monthly period', ['set-monthly'], { periodType: 'monthly' }],
    ['preset omits dates', ['set-dates'], { from: undefined, to: undefined }],
    ['custom dates', ['set-custom', 'set-dates'], { periodType: 'custom', from: '2026-08-03', to: '2026-08-09' }],
    ['half custom dates', ['set-custom'], { from: undefined, to: undefined }],
    ['compare picked', ['toggle-compare', 'pick-V001', 'pick-V002'], { scopeType: 'vehicles', scopeId: ['V001', 'V002'] }],
    ['compare fallback', ['toggle-compare'], { scopeType: 'fleet' }],
    ['compare deselect', ['toggle-compare', 'pick-V001', 'pick-V002', 'pick-V001'], { scopeId: ['V002'] }],
  ])('requests %s correctly', async (_, clicks, expected) => {
    const user = await setupAndGenerate({ skipGenerate: true })
    for (const c of clicks) await user.click(screen.getByText(c))
    await user.click(screen.getByText('generate'))
    expect(generateReport).toHaveBeenCalledWith(expect.objectContaining(expected))
  })
})

describe('Reports - loading, errors, and layout', () => {
  test('handles loading state and displays header metadata', async () => {
    let resolve
    generateReport.mockReturnValue(new Promise(r => { resolve = r }))
    const user = await setupAndGenerate({ skipGenerate: true })
    await user.click(screen.getByText('generate'))
    
    expect(screen.getByText(/Calculating analytics/i)).toBeInTheDocument()
    expect(screen.getByTestId('toolbar-loading')).toHaveTextContent('true')
    resolve(buildReport())
    
    await waitFor(() => expect(screen.getByTestId('safety-table')).toBeInTheDocument())
    expect(screen.getByTestId('toolbar-loading')).toHaveTextContent('false')
    expect(screen.getByText('Assigned fleet')).toBeInTheDocument()
    expect(screen.getByText(/2 of 3 vehicles/i)).toBeInTheDocument()
    expect(screen.getByTestId('summary-cards')).toHaveAttribute('data-score', '78')
  })

  test('surfaces API errors and recovers', async () => {
    generateReport.mockRejectedValueOnce(new Error('API Failure'))
    const user = await setupAndGenerate({ skipGenerate: true })
    await user.click(screen.getByText('generate'))
    await waitFor(() => expect(screen.getByText('API Failure')).toBeInTheDocument())
    
    generateReport.mockResolvedValueOnce(buildReport())
    await user.click(screen.getByText('generate'))
    await waitFor(() => expect(screen.queryByText('API Failure')).not.toBeInTheDocument())
  })
})

describe('Reports - no telemetry', () => {
  test('shows fallback explanation without failing', async () => {
    generateReport.mockResolvedValue(buildReport({ coverage: { hasTelemetry: false } }))
    await setupAndGenerate({ expectError: true })
    await waitFor(() => expect(screen.getByText(/No telemetry available/i)).toBeInTheDocument())
    expect(screen.queryByTestId('summary-cards')).not.toBeInTheDocument()
  })
})

describe('Reports - vehicle plotting', () => {
  test('toggles all, clear, and individual chips', async () => {
    const user = await setupAndGenerate()
    expect(screen.getByText('2 of 2 plotted')).toBeInTheDocument()
    
    await user.click(screen.getByText('Clear'))
    expect(screen.getByText('0 of 2 plotted')).toBeInTheDocument()
    
    const panel = screen.getByText('Vehicle comparison').closest('div.bg-white')
    await user.click(within(panel).getByRole('button', { name: 'V001' }))
    expect(screen.getByText('1 of 2 plotted')).toBeInTheDocument()
    expect(screen.getByTestId('comparison-chart')).toHaveTextContent('V001')
    
    await user.click(screen.getByText('Select all'))
    expect(screen.getByText('2 of 2 plotted')).toBeInTheDocument()
  })

  test('plots nothing automatically for large fleets', async () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ vehicleId: `V${i}` }))
    generateReport.mockResolvedValue(buildReport({ rankings: { entities: many } }))
    await setupAndGenerate()
    expect(screen.getByText('0 of 20 plotted')).toBeInTheDocument()
  })
})

describe('Reports - CSV export', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:report')
    global.URL.revokeObjectURL = jest.fn()
  })

  test('generates, downloads, and revokes CSV blob', async () => {
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
      expect(this.download).toBe('vapor-report-2026-08-03-to-2026-08-09.csv')
    })
    const user = await setupAndGenerate()
    await user.click(screen.getByText('Export CSV'))
    
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:report')
    clickSpy.mockRestore()
  })
})