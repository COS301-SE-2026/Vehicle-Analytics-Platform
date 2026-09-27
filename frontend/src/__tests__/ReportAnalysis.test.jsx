import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import ReportAnalysis from '../components/reports/ReportAnalysis'

const cmp = (metric, label, unit, current, previous, percentChange, direction) => ({
  metric, label, unit, current, previous, percentChange, direction,
})

const baseReport = (overrides = {}) => ({
  previousPeriod: { label: '7 - 13 Sep 2026' },
  coverage: { baselineSufficient: true },
  safety: {
    comparison: {
      harshBrakes: cmp('harshBrakes', 'Harsh braking', 'events', 2, 4, -50, 'improved'),
      crashes: cmp('crashes', 'Crashes', 'events', 1, 0, null, 'deteriorated'),
      safetyScore: cmp('safetyScore', 'Safety score', null, 92, 92, 0, 'stable'),
    },
  },
  distance: {
    comparison: {
      utilisationPct: cmp('utilisationPct', 'Utilisation', '%', 28.57, 7.14, 300.1, 'improved'),
      totalDistanceKm: cmp('totalDistanceKm', 'Total distance', 'km', 140, 80, 75, 'increased'),
      tripCount: cmp('tripCount', 'Trips', 'trips', 4, 1, 300, 'increased'),
    },
  },
  fuel: { comparison: { avgEfficiencyKmPerL: cmp('avgEfficiencyKmPerL', 'Fuel efficiency', 'km/L', null, 8, null, 'unavailable') } },
  insights: {
    changes: [
      { metric: 'crashes', label: 'Crashes', unit: 'events', direction: 'deteriorated', current: 1, previous: 0, percentChange: null },
      { metric: 'harshBrakes', label: 'Harsh braking', unit: 'events', direction: 'improved', current: 2, previous: 4, percentChange: -50 },
    ],
    trends: [],
  },
  trends: null,
  rankings: {
    vehiclesRequiringAttention: { status: 'ok', unit: null, entries: [{ id: 'V002', rank: 1, value: 73, tied: false }] },
    safestVehicles: { status: 'ok', unit: null, entries: [{ id: 'V001', rank: 1, value: 99, tied: false }] },
    mostEvents: { status: 'insufficient_data', unit: 'events', entries: [] },
  },
  ...overrides,
})

describe('ReportAnalysis - key findings', () => {
  test('lists deteriorations and improvements with previous and current values', () => {
    render(<ReportAnalysis report={baseReport()} />)
    const findings = within(screen.getByTestId('key-findings')).getAllByRole('listitem')

    expect(findings[0]).toHaveTextContent('Worse Crashes: 0 → 1 (from zero)')
    expect(findings[1]).toHaveTextContent('Better Harsh braking: 4 → 2 (-50%)')
  })

  test('says so when nothing changed materially', () => {
    render(<ReportAnalysis report={baseReport({ insights: { changes: [], trends: [] } })} />)
    expect(screen.getByText('No significant improvement or deterioration against 7 - 13 Sep 2026.')).toBeInTheDocument()
  })

  test('warns when the comparison period had too little activity', () => {
    render(<ReportAnalysis report={baseReport({ coverage: { baselineSufficient: false }, insights: { changes: [], trends: [] } })} />)
    expect(screen.getByText(/saw too little activity for a fair comparison/)).toBeInTheDocument()
    // It must not also claim that nothing changed: with a thin baseline no verdict exists.
    expect(screen.queryByText(/No significant improvement or deterioration/)).not.toBeInTheDocument()
    expect(screen.getByText(/No verdict can be drawn for this period/)).toBeInTheDocument()
  })

  test('handles a report without a comparison period', () => {
    render(<ReportAnalysis report={baseReport({ previousPeriod: null, insights: undefined })} />)
    expect(screen.getByText('No comparison period is available for this report.')).toBeInTheDocument()
    expect(screen.queryByTestId('period-comparison')).not.toBeInTheDocument()
  })

  test('shows weekly trend findings', () => {
    const insights = { changes: [], trends: [{ metric: 'harshBrakes', label: 'Harsh braking', unit: 'events', direction: 'improving', first: 4, last: 0, weeksWithData: 3 }] }
    render(<ReportAnalysis report={baseReport({ insights })} />)
    expect(screen.getByText(/Weekly trend in harsh braking: 4 → 0/)).toBeInTheDocument()
  })
})

describe('ReportAnalysis - comparison table', () => {
  test('shows headline metrics with units, change and direction', () => {
    render(<ReportAnalysis report={baseReport()} />)
    const table = screen.getByTestId('period-comparison')

    expect(within(table).getByText('Compared with 7 - 13 Sep 2026')).toBeInTheDocument()
    const utilisation = within(table).getByText('Utilisation').closest('tr')
    expect(utilisation).toHaveTextContent('28.57%7.14%+300.1%Improved')
    const crashes = within(table).getByText('Crashes').closest('tr')
    expect(crashes).toHaveTextContent('10-Worse')
    expect(within(table).getByText('Total distance').closest('tr')).toHaveTextContent('140 km80 km+75%Up')
  })

  test('leaves out metrics with no current value and metrics outside the headline set', () => {
    render(<ReportAnalysis report={baseReport()} />)
    const table = screen.getByTestId('period-comparison')
    expect(within(table).queryByText('Fuel efficiency')).not.toBeInTheDocument()
    expect(within(table).queryByText('Trips')).not.toBeInTheDocument()
  })
})

describe('ReportAnalysis - weekly trend', () => {
  const trends = {
    coverage: { leadInDays: 6, trailingDays: 3, firstDate: '2026-09-07', lastDate: '2026-09-27' },
    weeks: [
      { index: 1, label: 'Week 1', dateLabel: '7 - 13 Sep 2026' },
      { index: 2, label: 'Week 2', dateLabel: '14 - 20 Sep 2026' },
      { index: 3, label: 'Week 3', dateLabel: '21 - 27 Sep 2026' },
    ],
    metrics: {
      harshBrakes: { metric: 'harshBrakes', label: 'Harsh braking', unit: 'events', classification: 'improving', points: [{ index: 1, value: 4 }, { index: 2, value: 2 }, { index: 3, value: 0 }] },
      crashes: { metric: 'crashes', label: 'Crashes', unit: 'events', classification: 'insufficient_data', points: [] },
    },
  }

  test('shows each whole week and the trend classification', () => {
    render(<ReportAnalysis report={baseReport({ trends })} />)
    const table = screen.getByTestId('weekly-trend')
    expect(within(table).getByText('Harsh braking').closest('tr')).toHaveTextContent('420Improving')
    expect(within(table).queryByText('Crashes')).not.toBeInTheDocument()
    expect(within(table).getByText(/9 day\(s\) at the edges of the period/)).toBeInTheDocument()
  })

  test('omits the coverage note when the weeks cover the whole period', () => {
    render(<ReportAnalysis report={baseReport({ trends: { ...trends, coverage: { leadInDays: 0, trailingDays: 0 } } })} />)
    expect(screen.queryByText(/at the edges of the period/)).not.toBeInTheDocument()
  })
})

describe('ReportAnalysis - rankings', () => {
  test('shows attention and safest lists and an empty-state for unrankable lists', () => {
    render(<ReportAnalysis report={baseReport()} />)
    const rankings = screen.getByTestId('rankings')
    expect(within(rankings).getByText('1. V002')).toBeInTheDocument()
    expect(within(rankings).getByText('1. V001')).toBeInTheDocument()
    expect(within(rankings).getByText('Too few vehicles with events to rank.')).toBeInTheDocument()
  })

  test('explains an empty attention list', () => {
    const rankings = { ...baseReport().rankings, vehiclesRequiringAttention: { status: 'ok', entries: [] } }
    render(<ReportAnalysis report={baseReport({ rankings })} />)
    expect(screen.getByText('No vehicle scored Fair or Poor in this period.')).toBeInTheDocument()
  })
})
