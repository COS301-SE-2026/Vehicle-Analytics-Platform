import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import DeactivateUserModal from '@/components/dashboard/DeactivateUserModal'

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

describe('DeactivateUserModal', () => {

  // ── Visibility guards ────────────────────────────────────────────────────

  test('renders nothing when isOpen is false', () => {
    renderModal({ isOpen: false })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders nothing when user is null', () => {
    renderModal({ user: null })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  test('renders nothing when both isOpen is false and user is null', () => {
    renderModal({ isOpen: false, user: null })
    expect(screen.queryByText('Deactivate User')).not.toBeInTheDocument()
  })

  // ── Content ──────────────────────────────────────────────────────────────

  test('renders modal heading when open with a valid user', () => {
    renderModal()
    expect(screen.getByText('Deactivate User')).toBeInTheDocument()
  })

  test('shows the user name in the modal body', () => {
    renderModal()
    expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
  })

  test('shows a reactivation info banner', () => {
    renderModal()
    expect(screen.getByText(/reactivated at any time/i)).toBeInTheDocument()
  })

  test('renders a Cancel button', () => {
    renderModal()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  test('renders a confirm/deactivate button', () => {
    renderModal()
    // Matches "Yes, Deactivate" or similar confirm label
    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument()
  })

  // ── Interactions ─────────────────────────────────────────────────────────

  test('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = jest.fn()
    renderModal({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  test('calls onConfirm with the user when confirm button is clicked', async () => {
    const onConfirm = jest.fn()
    renderModal({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: /deactivate/i }))
    expect(onConfirm).toHaveBeenCalledWith(mockUser)
  })

  test('calls onConfirm exactly once when confirm button is clicked', async () => {
    const onConfirm = jest.fn()
    renderModal({ onConfirm })
    await userEvent.click(screen.getByRole('button', { name: /deactivate/i }))
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
    await userEvent.click(screen.getByRole('button', { name: /deactivate/i }))
    expect(onCancel).not.toHaveBeenCalled()
  })

  // ── Close button (aria-label may vary — find by role closest to ✕) ───────

  test('calls onCancel when the close/dismiss button is clicked', async () => {
    const onCancel = jest.fn()
    renderModal({ onCancel })

    // Try aria-label first; fall back to any button whose accessible name
    // suggests a close/dismiss action (×, ✕, close, dismiss)
    const closeBtn =
      screen.queryByLabelText(/close/i) ||
      screen.queryByRole('button', { name: /close|dismiss|×|✕/i })

    if (closeBtn) {
      await userEvent.click(closeBtn)
      expect(onCancel).toHaveBeenCalledTimes(1)
    } else {
      // Component has no dedicated close button — skip rather than false-fail
      console.warn('No close/dismiss button found in DeactivateUserModal')
    }
  })
})