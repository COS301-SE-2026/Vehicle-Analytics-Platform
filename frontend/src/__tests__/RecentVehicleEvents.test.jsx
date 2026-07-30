//import React from 'react'
import { render, screen } from '@testing-library/react'
import RecentVehicleEvents from '../components/dashboard/RecentVehicleEvents'
import {getAlerts} from '@/services/vehicleService'

jest.mock('@/services/vehicleService', () => ({
  getAlerts: jest.fn(),
}))

const mockEvents = [
  { id: 'e1', vehicleId: 'VH-001', eventType: 'speeding', description: 'Exceeded speed limit', location: 'N1 Highway', severity: 'HIGH', timestamp: new Date().toISOString() },
]

describe('RecentVehicleEvents', () => {
  test('renders heading', () => {
    getAlerts.mockResolvedValue({ alerts: mockEvents})
    render(<RecentVehicleEvents/>)
    expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument()
  })

  test('renders events', async () => {
    getAlerts.mockResolvedValue({ alerts: mockEvents})
    render(<RecentVehicleEvents/>)
    expect(await screen.findByText(/VH-001/)).toBeInTheDocument()
  })

  test('renders empty when no events', async () => {
    getAlerts.mockResolvedValue({ alerts: []})
    render(<RecentVehicleEvents/>)
    expect(await screen.findByText(/Showing last 0 events/)).toBeInTheDocument()
  })

  test('displays Unknown for null timestamp', async () => {
    const event = { ...mockEvents[0], timestamp: null }
    getAlerts.mockResolvedValue({ alerts: [event ]})
    render(<RecentVehicleEvents/>)
    expect(await screen.findByText('Unknown')).toBeInTheDocument()
  })
})
