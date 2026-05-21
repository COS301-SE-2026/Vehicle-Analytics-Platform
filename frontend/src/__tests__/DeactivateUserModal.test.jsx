import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeactivateUserModal from '../components/dashboard/DeactivateUserModal'

const mockUser = { name: 'Test User', id: 1 }

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = jest.fn()
  HTMLDialogElement.prototype.close = jest.fn()
})

describe('DeactivateUserModal', () => {
  test('renders nothing when isOpen is false', () => {
    render(<DeactivateUserModal isOpen={false} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders modal when open', () => {
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />)
    expect(screen.getByText('Deactivate User')).toBeInTheDocument()
  })

  test('calls onConfirm when confirmed', async () => {
    const onConfirm = jest.fn()
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={onConfirm} onCancel={jest.fn()} />)
    await userEvent.click(screen.getByText('Yes, Deactivate'))
    expect(onConfirm).toHaveBeenCalledWith(mockUser)
  })

  test('calls onCancel when Cancel clicked', async () => {
    const onCancel = jest.fn()
    render(<DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={onCancel} />)
    await userEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})
