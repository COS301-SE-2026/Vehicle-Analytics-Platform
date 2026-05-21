import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import RecentVehicleEvents from '../components/dashboard/RecentVehicleEvents'

const makeEvent = (overrides = {}) => ({
  id: 'e1',
  vehicleId: 'VH-001',
  eventType: 'speeding',
  description: 'Exceeded speed limit',
  location: 'N1 Highway',
  severity: 'HIGH',
  timestamp: new Date().toISOString(),
  ...overrides,
})

const mockEvents = [
  makeEvent({ id: 'e1', vehicleId: 'VH-001', eventType: 'speeding',      description: 'Exceeded speed limit', location: 'N1 Highway',  severity: 'HIGH',   timestamp: new Date().toISOString() }),
  makeEvent({ id: 'e2', vehicleId: 'VH-002', eventType: 'harsh_braking', description: 'Harsh braking',        location: 'R21 Highway', severity: 'MEDIUM', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString() }),
  makeEvent({ id: 'e3', vehicleId: 'VH-003', eventType: 'engine_on',     description: 'Engine started',       location: 'Sandton',     severity: 'LOW',    timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString() }),
  makeEvent({ id: 'e4', vehicleId: 'VH-004', eventType: 'engine_off',    description: 'Engine turned off',    location: 'Depot',       severity: 'LOW',    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString() }),
]

// ── Rendering ─────────────────────────────────────────────────────────────────

describe('RecentVehicleEvents – rendering', () => {
  test('renders the heading', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument()
  })

  test('renders all events when under limit', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText(/VH-001/)).toBeInTheDocument()
    expect(screen.getByText(/VH-002/)).toBeInTheDocument()
    expect(screen.getByText(/VH-003/)).toBeInTheDocument()
  })

  test('renders event descriptions', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText(/Exceeded speed limit/)).toBeInTheDocument()
    expect(screen.getByText(/Harsh braking/)).toBeInTheDocument()
  })

  test('renders severity badges', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText('HIGH')).toBeInTheDocument()
    expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    expect(screen.getAllByText('LOW').length).toBeGreaterThan(0)
  })

  test('renders event locations', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText('N1 Highway')).toBeInTheDocument()
    expect(screen.getByText('R21 Highway')).toBeInTheDocument()
  })
})

// ── Limit prop ────────────────────────────────────────────────────────────────

describe('RecentVehicleEvents – limit prop', () => {
  test('respects the limit prop — hides events beyond limit', () => {
    render(<RecentVehicleEvents events={mockEvents} limit={2} />)
    expect(screen.queryByText(/VH-003/)).not.toBeInTheDocument()
  })

  test('shows correct count in subheading when limited', () => {
    render(<RecentVehicleEvents events={mockEvents} limit={2} />)
    expect(screen.getByText(/Showing last 2 events/)).toBeInTheDocument()
  })

  test('shows all when limit exceeds event count', () => {
    render(<RecentVehicleEvents events={mockEvents} limit={100} />)
    expect(screen.getByText(/Showing last 4 events/)).toBeInTheDocument()
  })
})

// ── Empty / missing data ──────────────────────────────────────────────────────

describe('RecentVehicleEvents – empty / missing data', () => {
  test('renders empty list when events is empty array', () => {
    render(<RecentVehicleEvents events={[]} />)
    expect(screen.getByText(/Showing last 0 events/)).toBeInTheDocument()
  })

  test('renders empty list when events is undefined', () => {
    render(<RecentVehicleEvents />)
    expect(screen.getByText(/Showing last 0 events/)).toBeInTheDocument()
  })

  test('renders empty list when events is null', () => {
    render(<RecentVehicleEvents events={null} />)
    expect(screen.getByText(/Showing last 0 events/)).toBeInTheDocument()
  })
})

// ── Event type icons (getEventIcon branches) ──────────────────────────────────

describe('RecentVehicleEvents – all event types render without crashing', () => {
  const types = ['speeding', 'harsh_braking', 'engine_off', 'engine_on', 'unknown_type']

  types.forEach(eventType => {
    test(`renders event of type "${eventType}"`, () => {
      render(<RecentVehicleEvents events={[makeEvent({ eventType })]} />)
      expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument()
    })
  })

  test('handles event with no eventType (uses default icon)', () => {
    render(<RecentVehicleEvents events={[makeEvent({ eventType: undefined })]} />)
    expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument()
  })
})

// ── formatTime branches ───────────────────────────────────────────────────────

describe('RecentVehicleEvents – formatTime branches', () => {
  test('shows seconds ago for very recent events', () => {
    const event = makeEvent({ timestamp: new Date(Date.now() - 10 * 1000).toISOString() })
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText(/\ds ago/)).toBeInTheDocument()
  })

  test('shows mins ago for events a few minutes old', () => {
    const event = makeEvent({ timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString() })
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText(/mins ago/)).toBeInTheDocument()
  })

  test('shows hours ago for events over an hour old', () => {
    const event = makeEvent({ timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString() })
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText(/h ago/)).toBeInTheDocument()
  })

  test('shows Unknown for missing timestamp', () => {
    const event = makeEvent({ timestamp: null })
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})

// ── Severity fallback ─────────────────────────────────────────────────────────

describe('RecentVehicleEvents – severity fallback', () => {
  test('renders event with unknown severity without crashing', () => {
    const event = makeEvent({ severity: 'CRITICAL' })
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })
})

// ── Key fallback (no id) ──────────────────────────────────────────────────────

describe('RecentVehicleEvents – event without id', () => {
  test('renders event with no id using index as key (no crash)', () => {
    const event = makeEvent({ id: undefined })
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText(/VH-001/)).toBeInTheDocument()
  })
})