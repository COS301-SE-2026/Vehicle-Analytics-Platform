import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import DeactivateUserModal from '../components/dashboard/DeactivateUserModal'

beforeEach(() => {
  // jsdom doesn't implement showModal/close — stub them
  HTMLDialogElement.prototype.showModal = jest.fn(function () {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = jest.fn(function () {
    this.removeAttribute('open')
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

const mockUser = { name: 'Alice Smith' }

const renderModal = (props = {}) => {
  const defaults = {
    isOpen: true,
    user: mockUser,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  }
  return render(<DeactivateUserModal {...defaults} {...props} />)
}

// ── Visibility guards ─────────────────────────────────────────────────────────

describe('DeactivateUserModal – visibility guards', () => {
  test('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders nothing when user is null', () => {
    renderModal({ user: null })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders nothing when isOpen is false and user is null', () => {
    renderModal({ isOpen: false, user: null })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders nothing when isOpen is undefined', () => {
    renderModal({ isOpen: undefined })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })
})

// ── Content ───────────────────────────────────────────────────────────────────

describe('DeactivateUserModal – content', () => {
  test('renders modal heading when open with valid user', () => {
    renderModal()
    expect(screen.getByText('Deactivate User')).toBeInTheDocument()
  })

  test('shows the user name in the modal body', () => {
    renderModal()
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
  })

  test('shows warning message about access loss', () => {
    renderModal()
    expect(screen.getByText(/lose access/i)).toBeInTheDocument()
  })

  test('shows reactivation info banner', () => {
    renderModal()
    expect(screen.getByText(/reactivated at any time/i)).toBeInTheDocument()
  })

  test('renders Cancel button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  test('renders confirm/deactivate button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
  })

  test('renders close button with aria-label', () => {
    renderModal()
    expect(screen.getByLabelText(/close/i)).toBeInTheDocument()
  })

  test('renders the "Are you sure?" question', () => {
    renderModal()
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })
})

// ── Dialog lifecycle (useEffect branches) ─────────────────────────────────────

describe('DeactivateUserModal – dialog lifecycle', () => {
  test('calls showModal when isOpen becomes true', () => {
    renderModal({ isOpen: true })
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  test('calls close when component unmounts while open', () => {
    const { unmount } = renderModal({ isOpen: true })
    unmount()
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  })

  test('calls close when isOpen changes from true to false', () => {
    const { rerender } = render(
      <DeactivateUserModal isOpen={true} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />
    )
    rerender(
      <DeactivateUserModal isOpen={false} user={mockUser} onConfirm={jest.fn()} onCancel={jest.fn()} />
    )
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalled()
  })
})

// ── Interactions ──────────────────────────────────────────────────────────────

describe('DeactivateUserModal – interactions', () => {
  test('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = jest.fn()
    renderModal({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('calls onConfirm with the user when confirm button is clicked', async () => {
    const onConfirm = jest.fn()
    renderModal({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }))
    expect(onConfirm).toHaveBeenCalledWith(mockUser)
  })

  test('calls onConfirm exactly once', async () => {
    const onConfirm = jest.fn()
    renderModal({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  test('does not call onConfirm when Cancel is clicked', async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    renderModal({ onConfirm, onCancel })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  test('does not call onCancel when confirm button is clicked', async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    renderModal({ onConfirm, onCancel })
    await userEvent.click(screen.getByRole('button', { name: /yes, deactivate/i }))
    expect(onCancel).not.toHaveBeenCalled()
  })

  test('calls onCancel when close (✕) button is clicked', async () => {
    const onCancel = jest.fn()
    renderModal({ onCancel })
    await userEvent.click(screen.getByLabelText(/close/i))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

// ── User with different name ───────────────────────────────────────────────────

describe('DeactivateUserModal – different users', () => {
  test('shows correct name for a different user', () => {
    renderModal({ user: { name: 'Bob Jones' } })
    expect(screen.getByText(/Bob Jones/)).toBeInTheDocument()
  })

  test('renders without crashing when user has no name', () => {
    renderModal({ user: {} })
    expect(screen.getByText('Deactivate User')).toBeInTheDocument()
  })
})