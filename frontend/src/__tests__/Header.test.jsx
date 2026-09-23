import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from '../components/layout/Header'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock the auth store so we control the user object
const mockUser = { name: 'Matthew Stevens', role: 'viewer' }
jest.mock('../store/authStore', () => ({
  __esModule: true,
  default: () => ({ user: mockUser }),
}))

// Mock HelpPanel — we only care that Header toggles it correctly
jest.mock('@/components/help/HelpPanel', () => ({
  __esModule: true,
  HelpPanel: ({ isOpen, onClose, role }) =>
    isOpen ? (
      <div data-testid="help-panel" data-role={role}>
        <button onClick={onClose} data-testid="help-close">Close</button>
      </div>
    ) : null,
}))

// Mock NotificationBell — we only care that Header wires its props correctly
jest.mock('../components/layout/NotificationBell', () => ({
  __esModule: true,
  default: ({ isOpen, onOpen, onClose }) => (
    <div data-testid="notification-bell" data-open={String(isOpen)}>
      <button onClick={onOpen} data-testid="notif-open">Open</button>
      <button onClick={onClose} data-testid="notif-close">Close</button>
    </div>
  ),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Header – rendering', () => {
  test('renders the provided page title', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('derives initials from the user name', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    // "Matthew Stevens" → "MS"
    expect(screen.getByText('MS')).toBeInTheDocument()
  })

  test('applies the expanded left offset when collapsed is false', () => {
    const { container } = render(<Header title="Dashboard" collapsed={false} />)
    const header = container.querySelector('header')
    expect(header).toHaveClass('left-[220px]')
    expect(header).not.toHaveClass('left-[64px]')
  })

  test('applies the collapsed left offset when collapsed is true', () => {
    const { container } = render(<Header title="Dashboard" collapsed={true} />)
    const header = container.querySelector('header')
    expect(header).toHaveClass('left-[64px]')
    expect(header).not.toHaveClass('left-[220px]')
  })
})

describe('Header – help panel', () => {
  test('help panel is closed initially', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    expect(screen.queryByTestId('help-panel')).not.toBeInTheDocument()
  })

  test('clicking the help button opens the help panel', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    fireEvent.click(screen.getByLabelText('Open help'))
    expect(screen.getByTestId('help-panel')).toBeInTheDocument()
  })

  test('help panel receives the user role', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    fireEvent.click(screen.getByLabelText('Open help'))
    expect(screen.getByTestId('help-panel')).toHaveAttribute('data-role', 'viewer')
  })

  test('closing the help panel hides it', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    fireEvent.click(screen.getByLabelText('Open help'))
    fireEvent.click(screen.getByTestId('help-close'))
    expect(screen.queryByTestId('help-panel')).not.toBeInTheDocument()
  })
})

describe('Header – notification bell', () => {
  test('notification bell starts closed', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    expect(screen.getByTestId('notification-bell')).toHaveAttribute('data-open', 'false')
  })

  test('opening the bell sets it open', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    fireEvent.click(screen.getByTestId('notif-open'))
    expect(screen.getByTestId('notification-bell')).toHaveAttribute('data-open', 'true')
  })

  test('opening help closes the notification panel (mutually exclusive panels)', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    fireEvent.click(screen.getByTestId('notif-open'))
    fireEvent.click(screen.getByLabelText('Open help'))
    expect(screen.getByTestId('notification-bell')).toHaveAttribute('data-open', 'false')
    expect(screen.getByTestId('help-panel')).toBeInTheDocument()
  })
})
