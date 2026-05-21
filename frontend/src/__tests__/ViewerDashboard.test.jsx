jest.mock('../components/dashboard/mapPlaceholder', () => ({
  __esModule: true,
  default: () => <span>MapSection</span>,
}))
jest.mock('../components/dashboard/DonutChart', () => ({
  __esModule: true,
  default: () => <span>DonutChart</span>,
}))
jest.mock('../components/dashboard/StatCard', () => ({
  __esModule: true,
  default: ({ label }) => <span>{label}</span>,
}))
jest.mock('../components/map/FleetMap', () => ({
  __esModule: true,
  default: () => <span>FleetMap</span>,
}))
jest.mock('lucide-react', () => ({
  Truck: () => 'Truck',
  Waypoints: () => 'Waypoints',
  RefreshCw: () => 'RefreshCw',
}))
jest.mock('../services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
}))

import { render, screen, waitFor, act } from '@testing-library/react'
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
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('ViewerDashboard', () => {
  test('shows loading state initially', () => {
    render(<ViewerDashboard />)
    expect(screen.getByText('RefreshCw')).toBeInTheDocument()
  })

  test('renders stat cards after data loads', async () => {
    render(<ViewerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Active Vehicles')).toBeInTheDocument()
      expect(screen.getByText('Total Distance Today')).toBeInTheDocument()
    })
  })

  test('renders map and donut chart after data loads', async () => {
    render(<ViewerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('MapSection')).toBeInTheDocument()
      expect(screen.getByText('DonutChart')).toBeInTheDocument()
    })
  })

  test('calls getKPIs and getVehicleLocations on mount', async () => {
    render(<ViewerDashboard />)
    await waitFor(() => {
      expect(getKPIs).toHaveBeenCalledTimes(1)
      expect(getVehicleLocations).toHaveBeenCalledTimes(1)
    })
  })

  test('hides loading spinner after data loads', async () => {
    render(<ViewerDashboard />)
    await waitFor(() => {
      expect(screen.queryByText('RefreshCw')).not.toBeInTheDocument()
    })
  })

  test('polls for data every 10 seconds', async () => {
    jest.useFakeTimers()
    render(<ViewerDashboard />)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))
    act(() => jest.advanceTimersByTime(10000))
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(2))
    jest.useRealTimers()
  })

  test('clears interval on unmount', async () => {
    jest.useFakeTimers()
    const { unmount } = render(<ViewerDashboard />)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))
    unmount()
    act(() => jest.advanceTimersByTime(10000))
    expect(getKPIs).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })
})