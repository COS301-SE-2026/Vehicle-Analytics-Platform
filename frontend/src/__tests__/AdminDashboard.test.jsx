import { act } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('@/components/dashboard/DonutChart', () => ({ __esModule: true, default: () => <div>DonutChart</div> }))
jest.mock('@/components/dashboard/StatCard', () => ({ __esModule: true, default: ({ label }) => <div>{label}</div> }))
jest.mock('@/components/dashboard/FleetStatusCard', () => ({ __esModule: true, default: () => <div>FleetStatusCard</div> }))
jest.mock('@/components/dashboard/MostActiveVehiclesTable', () => ({ __esModule: true, default: () => <div>MostActiveVehiclesTable</div> }))
jest.mock('@/components/dashboard/FleetActivityChart', () => ({ __esModule: true, default: () => <div>FleetActivityChart</div> }))
jest.mock('@/components/dashboard/DataFeedStatusCard', () => ({ __esModule: true, default: () => <div>DataFeedStatusCard</div> }))
jest.mock('@/components/dashboard/UserManagementTable', () => ({
  __esModule: true,
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
jest.mock('@/components/dashboard/RecentVehicleEvents', () => ({ __esModule: true, default: () => <div>RecentVehicleEvents</div> }))
jest.mock('@/components/dashboard/EditUserModal', () => ({
  __esModule: true,
  default: ({ user, onClose, onSave }) => user ? (
    <div data-testid="edit-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={() => onSave(user, 'manager')}>Save</button>
    </div>
  ) : null
}))
jest.mock('@/components/dashboard/DeactivateUserModal', () => ({
  __esModule: true,
  default: ({ isOpen, onCancel, onConfirm, user }) => isOpen ? (
    <div data-testid="deactivate-modal">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={() => onConfirm(user)}>Confirm</button>
    </div>
  ) : null
}))
jest.mock('@/services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
  getUsers: jest.fn(),
}))
jest.mock('lucide-react', () => ({
  Truck: () => <svg />,
  Waypoints: () => <svg />,
  RefreshCw: () => <svg data-testid="spinner" />,
  Users: () => <svg />,
}))

import AdminDashboard from '@/pages/dashboard/AdminDashboard'
const { getKPIs, getVehicleLocations, getUsers } = require('@/services/vehicleService')

const mockKpis = { activeVehicles: 5, totalVehicles: 10, totalDistance: 320 }
const mockLocations = {
  vehicles: [
    { id: 'VH-001', status: 'active', distanceToday: 120 },
    { id: 'VH-002', status: 'idle', distanceToday: 80 },
  ]
}
const mockUsers = [
  { id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin', status: 'active' },
  { id: 2, name: 'Bob', email: 'bob@test.com', role: 'manager', status: 'active' },
]

beforeEach(() => {
  jest.clearAllMocks()
  getKPIs.mockResolvedValue(mockKpis)
  getVehicleLocations.mockResolvedValue(mockLocations)
  getUsers.mockResolvedValue(mockUsers)
})

describe('AdminDashboard', () => {
  test('shows loading spinner initially', () => {
    render(<AdminDashboard />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  test('renders after loading', async () => {
    await act(async () => {
      render(<AdminDashboard />)
    })
    await waitFor(() => expect(screen.getByText('Active Vehicles')).toBeInTheDocument())
  })

  test('shows no data when KPIs null', async () => {
    getKPIs.mockResolvedValue(null)
    getVehicleLocations.mockResolvedValue(null)
    render(<AdminDashboard />)
    await waitFor(() => expect(screen.getByText('No data available')).toBeInTheDocument())
  })

  test('opens and closes edit modal', async () => {
    render(<AdminDashboard />)
    await waitFor(() => screen.getByText('User Management'))
    await userEvent.click(screen.getAllByText('Edit')[0])
    expect(screen.getByTestId('edit-modal')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Close'))
    expect(screen.queryByTestId('edit-modal')).not.toBeInTheDocument()
  })
})
