import React from 'react'
import { render, screen } from '@testing-library/react'
import RecentVehicleEvents from '../components/dashboard/RecentVehicleEvents'

const mockEvents = [
  { id: 'e1', vehicleId: 'VH-001', eventType: 'speeding',      description: 'Exceeded speed limit', location: 'N1 Highway', severity: 'HIGH',   timestamp: new Date().toISOString() },
  { id: 'e2', vehicleId: 'VH-002', eventType: 'harsh_braking', description: 'Harsh braking',        location: 'R21 Highway', severity: 'MEDIUM', timestamp: new Date().toISOString() },
  { id: 'e3', vehicleId: 'VH-003', eventType: 'engine_on',     description: 'Engine started',       location: 'Sandton',     severity: 'LOW',    timestamp: new Date().toISOString() },
]

describe('RecentVehicleEvents', () => {
  test('renders the heading', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument()
  })

  test('renders all events', () => {
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
    expect(screen.getByText('LOW')).toBeInTheDocument()
  })

  test('renders event locations', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText('N1 Highway')).toBeInTheDocument()
    expect(screen.getByText('R21 Highway')).toBeInTheDocument()
  })

  test('respects the limit prop', () => {
    render(<RecentVehicleEvents events={mockEvents} limit={2} />)
    expect(screen.getByText(/Showing last 2 events/)).toBeInTheDocument()
    expect(screen.queryByText(/VH-003/)).not.toBeInTheDocument()
  })

  test('renders empty list when no events passed', () => {
    render(<RecentVehicleEvents events={[]} />)
    expect(screen.getByText(/Showing last 0 events/)).toBeInTheDocument()
  })

  test('renders empty list when events is undefined', () => {
    render(<RecentVehicleEvents />)
    expect(screen.getByText(/Showing last 0 events/)).toBeInTheDocument()
  })

  test('shows time ago for recent events', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getAllByText(/ago/).length).toBeGreaterThan(0)
  })
})