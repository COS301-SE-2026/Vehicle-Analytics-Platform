import { render, screen, waitFor } from '@testing-library/react'
import ManagerDashboard from '../pages/dashboard/ManagerDashboard'

// Mock every component imported by ManagerDashboard
jest.mock('../components/dashboard/StatCard', () => ({
  default: ({ label }) => <span>{label}</span>
}))
jest.mock('../components/dashboard/FleetStatusCard', () => ({
  default: () => <div>FleetStatusCard</div>
}))
jest.mock('../components/dashboard/MostActiveVehiclesTable', () => ({
  default: ({ vehicles }) => (
    <div>
      <span>Most Active Vehicles Today</span>
      {vehicles.map(v => <span key={v.id}>{v.id}</span>)}
    </div>
  )
}))
jest.mock('../components/dashboard/FleetActivityChart', () => ({
  default: () => <div>FleetActivityChart</div>
}))
jest.mock('../components/dashboard/RecentVehicleEvents', () => ({
  default: () => <div>Recent Vehicle Events</div>
}))

jest.mock('../services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
}))

jest.mock('lucide-react', () => ({
  Truck:     () => <svg data-testid="icon-truck" />,
  Waypoints: () => <svg data-testid="icon-waypoints" />,
  Users:     () => <svg data-testid="icon-users" />,
  RefreshCw: () => <svg className="animate-spin" data-testid="icon-refresh" />,
  Activity:  () => <svg data-testid="icon-activity" />,
}))

const { getKPIs, getVehicleLocations } = require('../services/vehicleService')

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
    expect(document.querySelector('svg.animate-spin')).toBeInTheDocument()
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