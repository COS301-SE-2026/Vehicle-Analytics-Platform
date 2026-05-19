import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminDashboard from '../pages/dashboard/AdminDashboard'

// Mock every component that AdminDashboard imports
jest.mock('../components/dashboard/StatCard', () => ({
  default: ({ label }) => <span>{label}</span>
}))
jest.mock('../components/dashboard/FleetStatusCard', () => ({
  default: () => <div>FleetStatusCard</div>
}))
jest.mock('../components/dashboard/MostActiveVehiclesTable', () => ({
  default: () => <div>MostActiveVehiclesTable</div>
}))
jest.mock('../components/dashboard/FleetActivityChart', () => ({
  default: () => <div>FleetActivityChart</div>
}))
jest.mock('../components/dashboard/DataFeedStatusCard', () => ({
  default: () => <div>DataFeedStatusCard</div>
}))
jest.mock('../components/dashboard/UserManagementTable', () => ({
  default: ({ users, onEdit, onDeactivate }) => (
    <div>
      <span>User Management</span>
      {users.map(u => (
        <div key={u.id}>
          <span>{u.name}</span>
          <button onClick={() => onEdit(u)}>Edit</button>
          <button onClick={() => onDeactivate(u)}>Deactivate</button>
        </div>
      ))}
    </div>
  )
}))
jest.mock('../components/dashboard/RecentVehicleEvents', () => ({
  default: () => <div>RecentVehicleEvents</div>
}))
jest.mock('../components/dashboard/EditUserModal', () => ({
  default: ({ user, onClose }) => user ? (
    <div data-testid="edit-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ) : null
}))
jest.mock('@/components/dashboard/DeactivateUserModal', () => ({
  default: ({ isOpen, onCancel, onConfirm, user }) => isOpen ? (
    <div data-testid="deactivate-modal">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={() => onConfirm(user)}>Confirm</button>
    </div>
  ) : null
}))

jest.mock('../services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
  getUsers: jest.fn(),
}))

jest.mock('lucide-react', () => ({
  Truck:     () => <svg data-testid="icon-truck" />,
  Waypoints: () => <svg data-testid="icon-waypoints" />,
  Users:     () => <svg data-testid="icon-users" />,
  RefreshCw: () => <svg className="animate-spin" data-testid="icon-refresh" />,
  Activity:  () => <svg data-testid="icon-activity" />,
}))

const { getKPIs, getVehicleLocations, getUsers } = require('../services/vehicleService')

const mockKpis = { activeVehicles: 5, totalVehicles: 10, totalDistance: 320 }
const mockLocations = {
  vehicles: [
    { id: 'VH-001', status: 'active',  distanceToday: 120 },
    { id: 'VH-002', status: 'idle',    distanceToday: 80  },
    { id: 'VH-003', status: 'offline', distanceToday: 0   },
  ]
}
const mockUsers = [
  { id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin',   status: 'active' },
  { id: 2, name: 'Bob',   email: 'bob@test.com',   role: 'manager', status: 'active' },
  { id: 3, name: 'Carol', email: 'carol@test.com', role: 'viewer',  status: 'active' },
]

beforeEach(() => {
  jest.clearAllMocks()
  getKPIs.mockResolvedValue(mockKpis)
  getVehicleLocations.mockResolvedValue(mockLocations)
  getUsers.mockResolvedValue(mockUsers)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('AdminDashboard', () => {
  test('shows loading spinner initially', () => {
    render(<AdminDashboard />)
    expect(document.querySelector('svg.animate-spin')).toBeInTheDocument()
  })

  test('renders KPI stat cards after loading', async () => {
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
    expect(screen.getByText('Total Distance Today')).toBeInTheDocument()
    expect(screen.getByText('Registered Users')).toBeInTheDocument()
  })

  test('renders user management table after loading', async () => {
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByText('User Management')).toBeInTheDocument())
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  test('shows no data message when KPIs are null', async () => {
    getKPIs.mockResolvedValue(null)
    getVehicleLocations.mockResolvedValue(null)
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByText('No data available')).toBeInTheDocument())
  })

  test('opens edit modal when Edit is clicked', async () => {
    render(<AdminDashboard />)
    await waitFor(() => screen.getByText('User Management'))
    await userEvent.click(screen.getAllByText('Edit')[0])
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
  })

  test('closes edit modal when Close is clicked', async () => {
    render(<AdminDashboard />)
    await waitFor(() => screen.getByText('User Management'))
    await userEvent.click(screen.getAllByText('Edit')[0])
    await userEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
  })

  test('opens deactivate modal when Deactivate is clicked', async () => {
    render(<AdminDashboard />)
    await waitFor(() => screen.getByText('User Management'))
    await userEvent.click(screen.getAllByText('Deactivate')[0])
    expect(screen.getByTestId('deactivate-modal')).toBeInTheDocument()
  })

  test('closes deactivate modal on cancel', async () => {
    render(<AdminDashboard />)
    await waitFor(() => screen.getByText('User Management'))
    await userEvent.click(screen.getAllByText('Deactivate')[0])
    await userEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByTestId('deactivate-modal')).not.toBeInTheDocument()
  })

  test('marks user inactive on deactivate confirm', async () => {
    render(<AdminDashboard />)
    await waitFor(() => screen.getByText('User Management'))
    await userEvent.click(screen.getAllByText('Deactivate')[0])
    await userEvent.click(screen.getByText('Confirm'))
    expect(screen.queryByTestId('deactivate-modal')).not.toBeInTheDocument()
  })

  test('polls for data every 10 seconds', async () => {
    jest.useFakeTimers()
    render(<AdminDashboard />)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(1))
    jest.advanceTimersByTime(10000)
    await waitFor(() => expect(getKPIs).toHaveBeenCalledTimes(2))
  })
})