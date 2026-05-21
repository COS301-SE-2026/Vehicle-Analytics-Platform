import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserManagementTable from '../components/dashboard/UserManagementTable'

const mockUsers = [
  { id: 1, name: 'Alice Smith',  email: 'alice@test.com', role: 'manager', status: 'active'   },
  { id: 2, name: 'Bob Jones',    email: 'bob@test.com',   role: 'viewer',  status: 'inactive' },
  { id: 3, name: 'Carol Admin',  email: 'carol@test.com', role: 'admin',   status: 'active'   },
]

describe('UserManagementTable', () => {
  // Rendering
  test('renders the User Management heading', () => {
    render(<UserManagementTable />)
    expect(screen.getByText('User Management')).toBeInTheDocument()
  })

  test('shows empty state when no users', () => {
    render(<UserManagementTable users={[]} />)
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  test('renders all user rows', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText('Carol Admin')).toBeInTheDocument()
  })

  test('renders user emails', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  // Role badges
  test('renders correct role badges', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    expect(screen.getByText('MANAGER')).toBeInTheDocument()
    expect(screen.getByText('VIEWER')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
  })

  // Status
  test('shows Active status for active users', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    const activeLabels = screen.getAllByText('Active')
    expect(activeLabels.length).toBeGreaterThan(0)
  })

  test('shows Inactive status for inactive users', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })

  // Actions — admin row
  test('does not show Edit/Deactivate for admin users', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    // Only 1 Edit per non-admin user
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons).toHaveLength(2) // Alice + Bob, not Carol
  })

  // Actions — edit
  test('calls onEdit with correct user when Edit is clicked', async () => {
    const onEdit = jest.fn()
    render(<UserManagementTable users={mockUsers} onEdit={onEdit} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    const editButtons = screen.getAllByText('Edit')
    await userEvent.click(editButtons[0])
    expect(onEdit).toHaveBeenCalledWith(mockUsers[0])
  })

  // Actions — deactivate active user
  test('calls onDeactivate when Deactivate is clicked for active user', async () => {
    const onDeactivate = jest.fn()
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={onDeactivate} onActivate={jest.fn()} />)
    await userEvent.click(screen.getByText('Deactivate'))
    expect(onDeactivate).toHaveBeenCalledWith(mockUsers[0]) // Alice is active
  })

  // Actions — activate inactive user
  test('calls onActivate when Activate is clicked for inactive user', async () => {
    const onActivate = jest.fn()
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={onActivate} />)
    await userEvent.click(screen.getByText('Activate'))
    expect(onActivate).toHaveBeenCalledWith(mockUsers[1]) // Bob is inactive
  })

  // Footer
  test('renders the footer note', () => {
    render(<UserManagementTable />)
    expect(screen.getByText(/role changes take effect/i)).toBeInTheDocument()
  })
})