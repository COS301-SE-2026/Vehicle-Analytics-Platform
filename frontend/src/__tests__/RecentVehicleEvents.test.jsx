//import React from 'react'
import { render, screen } from '@testing-library/react'
import RecentVehicleEvents from '../components/dashboard/RecentVehicleEvents'

const mockEvents = [
  { id: 'e1', vehicleId: 'VH-001', eventType: 'speeding', description: 'Exceeded speed limit', location: 'N1 Highway', severity: 'HIGH', timestamp: new Date().toISOString() },
]

describe('RecentVehicleEvents', () => {
  test('renders heading', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument()
  })

  test('renders events', () => {
    render(<RecentVehicleEvents events={mockEvents} />)
    expect(screen.getByText(/VH-001/)).toBeInTheDocument()
  })

  test('renders empty when no events', () => {
    render(<RecentVehicleEvents events={[]} />)
    expect(screen.getByText(/Showing last 0 events/)).toBeInTheDocument()
  })

  test('displays Unknown for null timestamp', () => {
    const event = { ...mockEvents[0], timestamp: null }
    render(<RecentVehicleEvents events={[event]} />)
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})
