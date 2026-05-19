import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeactivateUserModal from '../components/dashboard/DeactivateUserModal'

const mockUser = { name: 'Alice Smith' }

describe('DeactivateUserModal', () => {
  test('renders nothing when isOpen is false', () => {
    render(<DeactivateUserModal isOpen={false} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders nothing when user is null', () => {
    render(<DeactivateUserModal isOpen={true} user={null} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders modal when open with user', () => {
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByText('Deactivate User')).toBeInTheDocument()
  })

  test('shows the user name in the body', () => {
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
  })

  test('calls onCancel when Cancel is clicked', async () => {
    const onCancel = jest.fn()
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  test('calls onCancel when close button is clicked', async () => {
    const onCancel = jest.fn()
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByLabelText('Close'))
    expect(onCancel).toHaveBeenCalled()
  })

  test('calls onConfirm with user when Yes Deactivate is clicked', async () => {
    const onConfirm = jest.fn()
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={onConfirm} onCancel={jest.fn()} />)
    await userEvent.click(screen.getByText('Yes, Deactivate'))
    expect(onConfirm).toHaveBeenCalledWith(mockUser)
  })

  test('shows reactivation info banner', () => {
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByText(/reactivated at any time/i)).toBeInTheDocument()
  })
})