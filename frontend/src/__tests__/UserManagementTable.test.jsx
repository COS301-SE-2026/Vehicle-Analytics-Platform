import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UserManagementTable from '../components/dashboard/UserManagementTable'

const mockUsers = [
  { id: 1, name: 'Alice Smith', email: 'alice@test.com', role: 'manager', status: 'active' },
  { id: 2, name: 'Bob Jones', email: 'bob@test.com', role: 'viewer', status: 'inactive' },
]

describe('UserManagementTable', () => {
  test('renders heading', () => {
    render(<UserManagementTable />)
    expect(screen.getByText('User Management')).toBeInTheDocument()
  })

  test('shows empty state', () => {
    render(<UserManagementTable users={[]} />)
    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  test('renders all users', () => {
    render(<UserManagementTable users={mockUsers} onEdit={jest.fn()} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  test('calls onEdit when Edit clicked', async () => {
    const onEdit = jest.fn()
    render(<UserManagementTable users={mockUsers} onEdit={onEdit} onDeactivate={jest.fn()} onActivate={jest.fn()} />)
    await userEvent.click(screen.getAllByText('Edit')[0])
    expect(onEdit).toHaveBeenCalled()
  })
})
