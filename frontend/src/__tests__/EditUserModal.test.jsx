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
const adminUser = { name: 'Bob Jones',  email: 'bob@test.com',   role: 'admin'  }

// helper — bypasses the hidden dialog accessibility barrier
const q = { hidden: true }

describe('EditUserModal — no user', () => {
  test('renders nothing when user is null', () => {
    const { container } = render(
      <EditUserModal user={null} onClose={jest.fn()} onSave={jest.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  test('renders nothing when user is undefined', () => {
    const { container } = render(
      <EditUserModal onClose={jest.fn()} onSave={jest.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('EditUserModal — rendering', () => {
  test('renders the modal heading', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('Edit User Access')).toBeInTheDocument()
  })

  test('shows the user name', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  test('shows the user email', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
  })

  test('shows the current role badge', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('viewer')).toBeInTheDocument()
  })

  test('shows initials from user name', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('AS')).toBeInTheDocument()
  })

  test('shows ?? initials when name is empty', () => {
    render(<EditUserModal user={{ ...mockUser, name: '' }} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText('??')).toBeInTheDocument()
  })

  test('renders all three role buttons', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByRole('button', { name: /viewer/i,        ...q })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fleet manager/i, ...q })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /admin/i,         ...q })).toBeInTheDocument()
  })

  test('renders the role dropdown with all options', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByRole('combobox', { name: /assign new role/i, ...q })).toBeInTheDocument()
    expect(screen.getByRole('option',   { name: 'Viewer',           ...q })).toBeInTheDocument()
    expect(screen.getByRole('option',   { name: 'Fleet Manager',    ...q })).toBeInTheDocument()
    expect(screen.getByRole('option',   { name: 'Admin',            ...q })).toBeInTheDocument()
  })

  test('pre-selects the user current role in the dropdown', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByRole('combobox', q)).toHaveValue('viewer')
  })

  test('pre-selects admin role for admin user', () => {
    render(<EditUserModal user={adminUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByRole('combobox', q)).toHaveValue('admin')
  })

  test('Save Changes button is disabled when role is unchanged', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByRole('button', { name: 'Save Changes', ...q })).toBeDisabled()
  })

  test('renders the X icon close button', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByTestId('x-icon')).toBeInTheDocument()
  })

  test('calls showModal on the dialog when user is provided', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  test('shows footer note about next login', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText(/role changes take effect/i)).toBeInTheDocument()
  })
})

describe('EditUserModal — admin warning', () => {
  test('does NOT show admin warning when viewer is selected', () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.queryByText(/full system access/i)).not.toBeInTheDocument()
  })

  test('shows admin warning when admin user is loaded', () => {
    render(<EditUserModal user={adminUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText(/full system access/i)).toBeInTheDocument()
  })

  test('shows admin warning after selecting admin via role buttons', async () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.queryByText(/full system access/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /admin/i, ...q }))
    expect(screen.getByText(/full system access/i)).toBeInTheDocument()
  })

  test('hides admin warning after switching away from admin', async () => {
    render(<EditUserModal user={adminUser} onClose={jest.fn()} onSave={jest.fn()} />)
    expect(screen.getByText(/full system access/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /viewer/i, ...q }))
    expect(screen.queryByText(/full system access/i)).not.toBeInTheDocument()
  })
})

describe('EditUserModal — role selection', () => {
  test('clicking a role button updates aria-pressed', async () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    const managerBtn = screen.getByRole('button', { name: /fleet manager/i, ...q })
    await userEvent.click(managerBtn)
    expect(managerBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('changing the dropdown updates the selected role', async () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    await userEvent.selectOptions(screen.getByRole('combobox', q), 'manager')
    expect(screen.getByRole('combobox', q)).toHaveValue('manager')
  })

  test('Save Changes is enabled after selecting a different role', async () => {
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={jest.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    expect(screen.getByRole('button', { name: 'Save Changes', ...q })).not.toBeDisabled()
  })
})

describe('EditUserModal — closing', () => {
  test('calls onClose when X button is clicked', async () => {
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={jest.fn()} />)
    await userEvent.click(screen.getByTestId('x-icon').closest('button'))
    expect(onClose).toHaveBeenCalled()
  })

  test('calls onClose when Cancel button is clicked', async () => {
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={jest.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel', ...q }))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('EditUserModal — saving', () => {
  test('calls onSave with user and new role on Save Changes click', async () => {
    const onSave = jest.fn().mockResolvedValue()
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes',   ...q }))
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(mockUser, 'manager'))
  })

  test('calls onClose after successful save', async () => {
    const onSave = jest.fn().mockResolvedValue()
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes',   ...q }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  test('shows Saving... while save is in progress', async () => {
    let resolve
    const onSave = jest.fn().mockReturnValue(new Promise(r => { resolve = r }))
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes',   ...q }))
    expect(await screen.findByText('Saving...')).toBeInTheDocument()
    resolve()
  })

  test('save button is disabled while saving', async () => {
    let resolve
    const onSave = jest.fn().mockReturnValue(new Promise(r => { resolve = r }))
    render(<EditUserModal user={mockUser} onClose={jest.fn()} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes',   ...q }))
    expect(screen.getByText('Saving...')).toBeDisabled()
    resolve()
  })

  test('handles save error gracefully without crashing', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('Server error'))
    const onClose = jest.fn()
    render(<EditUserModal user={mockUser} onClose={onClose} onSave={onSave} />)
    await userEvent.click(screen.getByRole('button', { name: /fleet manager/i, ...q }))
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes',   ...q }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes', ...q })).not.toBeDisabled())
    expect(onClose).not.toHaveBeenCalled()
  })
})