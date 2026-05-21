import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

jest.mock('@/components/dashboard/DonutChart', () => ({ __esModule: true, default: () => <div>DonutChart</div> }))
jest.mock('@/components/dashboard/StatCard', () => ({ __esModule: true, default: ({ label }) => <div>{label}</div> }))
jest.mock('@/components/dashboard/FleetStatusCard', () => ({ __esModule: true, default: () => <div>FleetStatusCard</div> }))
jest.mock('@/components/dashboard/MostActiveVehiclesTable', () => ({
  __esModule: true,
  default: ({ vehicles }) => (
    <div>
      <span>Most Active Vehicles Today</span>
      {vehicles.map(v => <span key={v.id}>{v.id}</span>)}
    </div>
  )
}))
jest.mock('@/components/dashboard/FleetActivityChart', () => ({ __esModule: true, default: () => <div>FleetActivityChart</div> }))
jest.mock('@/components/dashboard/RecentVehicleEvents', () => ({ __esModule: true, default: () => <div>Recent Vehicle Events</div> }))
jest.mock('@/services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
}))
jest.mock('lucide-react', () => ({
  Truck: () => <svg />,
  Waypoints: () => <svg />,
  Activity: () => <svg />,
  RefreshCw: () => <svg data-testid="spinner" className="animate-spin" />,
  Users: () => <svg />,
}))

import ManagerDashboard from '@/pages/dashboard/ManagerDashboard'
const { getKPIs, getVehicleLocations } = require('@/services/vehicleService')

const mockKpis = { activeVehicles: 4, totalVehicles: 8, totalDistance: 210 }
const mockLocations = {
  vehicles: [
    { id: 'VH-001', status: 'active',  distanceToday: 100 },
    { id: 'VH-002', status: 'idle',    distanceToday: 60  },
    { id: 'VH-003', status: 'offline', distanceToday: 0   },
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
  getKPIs.mockResolvedValue(mockKpis)
  getVehicleLocations.mockResolvedValue(mockLocations)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('ManagerDashboard', () => {
  test('shows loading spinner initially', () => {
    render(<ManagerDashboard />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  test('renders KPI stat cards after loading', async () => {
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
    expect(screen.getByText('Total Distance Today')).toBeInTheDocument()
    expect(screen.getByText('Vehicles In Motion')).toBeInTheDocument()
  })

  test('renders most active vehicles table', async () => {
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Most Active Vehicles Today')).toBeInTheDocument())
    expect(screen.getByText('VH-001')).toBeInTheDocument()
  })

  test('renders recent vehicle events section', async () => {
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Recent Vehicle Events')).toBeInTheDocument())
  })

  test('shows error message when fetch fails', async () => {
    getKPIs.mockRejectedValue(new Error('Network error'))
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument())
  })

  test('shows no data message when data is null', async () => {
    getKPIs.mockResolvedValue(null)
    getVehicleLocations.mockResolvedValue(null)
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('No data available')).toBeInTheDocument())
  })

  test('polls for data every 10 seconds', async () => {
    jest.useFakeTimers()
    render(<ManagerDashboard />)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))
    jest.advanceTimersByTime(10000)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(2))
  })
})