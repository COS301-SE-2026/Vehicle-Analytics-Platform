jest.mock('lucide-react', () => ({
  X: () => <svg data-testid="x-icon" />,
}))

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EditUserModal from '../components/dashboard/EditUserModal'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = jest.fn()
  HTMLDialogElement.prototype.close = jest.fn()
})

afterEach(() => {
  jest.clearAllMocks()
})

const mockUser = { name: 'Alice Smith', email: 'alice@test.com', role: 'viewer' }
const adminUser = { name: 'Bob Jones', email: 'bob@test.com', role: 'admin' }
const q = { hidden: true }

describe('EditUserModal', () => {
  test('renders nothing when user is null', () => {
    const { container } = render(<EditUserModal user={null} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  test('renders modal when user exists', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('Edit User Access')).toBeInTheDocument()
  })

  test('calls onClose when Cancel clicked', async () => {
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={jest.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel', ...q }))
    expect(onClose).toHaveBeenCalled()
  })

  test('calls onSave with new role', async () => {
    const onSave = jest.fn().mockResolvedValue()
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes', ...q }))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })

  test('shows admin warning for admin user', () => {
    render(<EditUserModal user={adminUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText(/full system access/i)).toBeInTheDocument()
  })
})
