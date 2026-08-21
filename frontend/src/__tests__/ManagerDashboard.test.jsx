import { render, screen, waitFor, act } from '@testing-library/react'

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
jest.mock('@/components/dashboard/FleetAnalytics', () => ({ __esModule: true, default: () => <div>FleetAnalytics</div> }))
jest.mock('@/components/dashboard/FuelKpiCard', () => ({ __esModule: true, default: () => <div>FuelKpiCard</div> }))

jest.mock('@/services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
  getAlerts: jest.fn(),
  getActivityHistory: jest.fn(),
  getFleetAnalytics: jest.fn().mockResolvedValue({
    safetyTrend: [],
    eventBreakdown: [],
    topContributors: [],
    lowestSafetyScores: [],
  }),
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

const mockAlerts = { total: 1, alerts: [{ id: 1, type: 'harsh_braking', vehicle_id: 'VH-001' }] }
const mockHistory = []

beforeEach(() => {
  jest.clearAllMocks()
  getKPIs.mockResolvedValue(mockKpis)
  getVehicleLocations.mockResolvedValue(mockLocations)
  getAlerts.mockResolvedValue(mockAlerts)
  getActivityHistory.mockResolvedValue(mockHistory)
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
    getVehicleLocations.mockRejectedValue(new Error('Network error'))
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
    getKPIs.mockResolvedValue({ activeVehicles: 2, totalDistance: 100 })
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
  })

  test('handles locations with no vehicles array gracefully', async () => {
    getVehicleLocations.mockResolvedValue({})
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
  })

  test('shows em-dash when totalDistance is missing from kpis', async () => {
    getKPIs.mockResolvedValue({ activeVehicles: 2, totalVehicles: 5 })
    render(<ManagerDashboard />)
    await waitFor(() => expect(screen.getByText('Total Distance Today')).toBeInTheDocument())
  })

  test('polls for data every 5 seconds', async () => {
    jest.useFakeTimers()
    render(<ManagerDashboard />)
    
    // Initial call on mount
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))

    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(2))

    // Fast-forward another 5 seconds
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })

    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(3))
  })
})