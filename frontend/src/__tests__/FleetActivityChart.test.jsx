import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('recharts', () => {
  const Recharts = jest.requireActual('recharts')
  const mockReact = require('react')  // ✅ require instead of import
  return {
    ...Recharts,
    ResponsiveContainer: ({ children, height }) => (
      <div style={{ width: 800, height }}>
        {mockReact.cloneElement(mockReact.Children.only(children), { width: 800, height })}
      </div>
    ),
  }
})

import FleetActivityChart from '@/components/dashboard/FleetActivityChart'

beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const SAMPLE_DATA = [
  { time: '06:00', vehicles: 3 },
  { time: '08:00', vehicles: 9 },
  { time: '10:00', vehicles: 11 },
  { time: '12:00', vehicles: 8 },
  { time: '14:00', vehicles: 12 },
  { time: '16:00', vehicles: 11 },
  { time: '18:00', vehicles: 7 },
  { time: '20:00', vehicles: 4 },
]

describe('FleetActivityChart', () => {
  test('shows no-data message when data prop is omitted', () => {
    render(<FleetActivityChart />)
    expect(screen.getByText(/no fleet activity data available/i)).toBeInTheDocument()
  })

  test('shows no-data message when data is an empty array', () => {
    render(<FleetActivityChart data={[]} />)
    expect(screen.getByText(/no fleet activity data available/i)).toBeInTheDocument()
  })

  test('does not render the chart heading in the empty state', () => {
    render(<FleetActivityChart data={[]} />)
    expect(screen.queryByText('Fleet Activity Today')).not.toBeInTheDocument()
  })

  test('renders the chart heading when data is provided', () => {
    render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getByText('Fleet Activity Today')).toBeInTheDocument()
  })

  test('renders the Active Vehicles legend label', () => {
    render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getByText('Active Vehicles')).toBeInTheDocument()
  })

  test('does not show the no-data message when data is provided', () => {
    render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.queryByText(/no fleet activity data available/i)).not.toBeInTheDocument()
  })

  test('renders an SVG chart element', () => {
    const { container } = render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  test('renders the Time of Day X-axis label', () => {
    render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getByText('Time of Day')).toBeInTheDocument()
  })

  test('renders the Vehicles Active Y-axis label', () => {
    render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getByText('Vehicles Active')).toBeInTheDocument()
  })

  test('renders time tick labels from the data', () => {
    render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getAllByText('06:00').length).toBeGreaterThan(0)
  })

  test('renders without crashing with a single data point', () => {
    render(<FleetActivityChart data={[{ time: '09:00', vehicles: 5 }]} />)
    expect(screen.getByText('Fleet Activity Today')).toBeInTheDocument()
  })

  test('renders without crashing when vehicles value is zero', () => {
    render(<FleetActivityChart data={[{ time: '00:00', vehicles: 0 }]} />)
    expect(screen.getByText('Fleet Activity Today')).toBeInTheDocument()
  })

  test('switches from chart to empty state when data changes to empty', () => {
    const { rerender } = render(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getByText('Fleet Activity Today')).toBeInTheDocument()
    rerender(<FleetActivityChart data={[]} />)
    expect(screen.getByText(/no fleet activity data available/i)).toBeInTheDocument()
  })

  test('switches from empty state to chart when data is provided', () => {
    const { rerender } = render(<FleetActivityChart data={[]} />)
    expect(screen.getByText(/no fleet activity data available/i)).toBeInTheDocument()
    rerender(<FleetActivityChart data={SAMPLE_DATA} />)
    expect(screen.getByText('Fleet Activity Today')).toBeInTheDocument()
  })
})