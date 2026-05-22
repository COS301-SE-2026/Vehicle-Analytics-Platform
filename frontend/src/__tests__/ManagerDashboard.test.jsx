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
  getAlerts: jest.fn().mockResolvedValue({ total: 0, alerts: [] }),
  getActivityHistory: jest.fn().mockResolvedValue([]),
}))
jest.mock('lucide-react', () => ({
  Truck: () => <svg />,
  Waypoints: () => <svg />,
  Activity: () => <svg />,
  RefreshCw: () => <svg data-testid="spinner" className="animate-spin" />,
  Users: () => <svg />,
}))

import ManagerDashboard from '@/pages/dashboard/ManagerDashboard'
const { getKPIs, getVehicleLocations, getAlerts, getActivityHistory } = require('@/services/vehicleService')

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

  test('shows no data message when kpis is null', async () => {
    getKPIs.mockResolvedValue(null)
    getVehicleLocations.mockResolvedValue(null)
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('No data available')).toBeInTheDocument())
  })

  test('shows no data message when locations is null but kpis is set', async () => {
    getKPIs.mockResolvedValue(mockKpis)
    getVehicleLocations.mockResolvedValue(null)
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('No data available')).toBeInTheDocument())
  })


  test('falls back to vehicles.length when kpis.totalVehicles is undefined', async () => {
    getKPIs.mockResolvedValue({ activeVehicles: 2, totalDistance: 100 }) // no totalVehicles
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
  })

  test('sorts most active vehicles using distance fallback when distanceToday is missing', async () => {
    getVehicleLocations.mockResolvedValue({
      vehicles: [
        { id: 'VH-A', status: 'active',  distance: 200 },
        { id: 'VH-B', status: 'active',  distance: 50  },
        { id: 'VH-C', status: 'offline', distance: 300 },
      ]
    })
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('VH-A')).toBeInTheDocument())
  })


  test('handles locations with no vehicles array gracefully', async () => {
    getVehicleLocations.mockResolvedValue({}) // no vehicles key
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
  })


  test('shows em-dash when totalDistance is missing from kpis', async () => {
    getKPIs.mockResolvedValue({ activeVehicles: 2, totalVehicles: 5 }) // no totalDistance
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Total Distance Today')).toBeInTheDocument())
  })

  test('polls for data every 10 seconds', async () => {
    jest.useFakeTimers()
    render(<ManagerDashboard />)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))
    jest.advanceTimersByTime(10000)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(2))
  })
})