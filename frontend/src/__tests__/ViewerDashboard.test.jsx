jest.mock('../components/map/FleetMap', () => ({ default: () => 'FleetMap' }))
jest.mock('../components/dashboard/mapPlaceholder', () => ({ default: () => 'MapSection' }))
jest.mock('../components/dashboard/DonutChart', () => ({ default: () => 'DonutChart' }))
jest.mock('../components/dashboard/StatCard', () => ({ default: ({ label }) => label }))
jest.mock('lucide-react', () => ({
  Truck: () => 'Truck',
  Waypoints: () => 'Waypoints',
  RefreshCw: () => 'RefreshCw',
}))
jest.mock('../services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
}))

import { render, screen, waitFor } from '@testing-library/react'
import ViewerDashboard from '../pages/dashboard/ViewerDashboard'

const { getKPIs, getVehicleLocations } = require('../services/vehicleService')

const mockKpis = { activeVehicles: 3, totalVehicles: 6, idleVehicles: 2, offlineVehicles: 1 }
const mockLocations = {
  vehicles: [
    { id: 'VH-001', status: 'active' },
    { id: 'VH-002', status: 'idle' },
    { id: 'VH-003', status: 'offline' },
  ]
}

beforeEach(() => {
  getKPIs.mockResolvedValue(mockKpis)
  getVehicleLocations.mockResolvedValue(mockLocations)
  jest.clearAllMocks()
})

describe('ViewerDashboard', () => {
  test('shows loading state initially', () => {
    render(<ViewerDashboard />)
    expect(screen.getByText('RefreshCw')).toBeInTheDocument()
  })

  test('polls for data every 10 seconds', async () => {
    jest.useFakeTimers()
    render(<ViewerDashboard />)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))
    jest.advanceTimersByTime(10000)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(2))
    jest.useRealTimers()
  })
})