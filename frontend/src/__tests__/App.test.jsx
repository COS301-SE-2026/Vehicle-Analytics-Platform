import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

jest.mock('../store/authStore', () => {
  const mock = jest.fn()
  mock.getState = jest.fn()
  return mock
})

// Mock BrowserRouter to avoid nested router conflict
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }) => <>{children}</>,
}))

jest.mock('../components/layout/AppShell', () =>
  function MockAppShell() {
    const { Outlet } = require('react-router-dom')
    return <div data-testid="appshell"><Outlet /></div>
  }
)

// ProtectedRoute polls for alerts; routing tests don't need it.
jest.mock('../hooks/useNewAlertToasts', () => () => {})

jest.mock('../pages/landing/Landing',           () => () => <div data-testid="landing-page" />)
jest.mock('../pages/auth/Login',                () => () => <div data-testid="login-page" />)
jest.mock('../pages/auth/Signup',               () => () => <div data-testid="signup-page" />)
jest.mock('../pages/auth/VerifyEmail',          () => () => <div data-testid="verify-page" />)
jest.mock('../pages/dashboard/ManagerDashboard',() => () => <div data-testid="manager-dashboard" />)
jest.mock('../pages/dashboard/AdminDashboard',  () => () => <div data-testid="admin-dashboard" />)
jest.mock('../pages/map/LiveMap',               () => () => <div data-testid="live-map" />)
jest.mock('../pages/map/ViewerMap',             () => () => <div data-testid="viewer-map" />)
jest.mock('../pages/reports/Reports',           () => () => <div data-testid="reports-page" />)

import App from '../App'
import useAuthStore from '../store/authStore'

const DASHBOARD_PATHS = {
  viewer: '/dashboard/viewer',
  manager: '/dashboard/manager',
  fleet_manager: '/dashboard/manager',
  admin: '/dashboard/admin',
}

const setup = (path, user, role) => {
  useAuthStore.mockReturnValue({ user, role })
  useAuthStore.getState.mockReturnValue({
    getDashboardPath: () => DASHBOARD_PATHS[role] ?? '/login',
  })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe('App routing: public pages', () => {
  test('/login renders Login page', () => {
    setup('/login', null, null)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  test('/signup renders Signup page', () => {
    setup('/signup', null, null)
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
  })

  test('/verify renders VerifyEmail page', () => {
    setup('/verify', null, null)
    expect(screen.getByTestId('verify-page')).toBeInTheDocument()
  })

  test('an unknown path redirects to the landing page', () => {
    setup('/no-such-page', null, null)
    expect(screen.getByTestId('landing-page')).toBeInTheDocument()
  })
})

describe('App routing: dashboards', () => {
  test('unauthenticated user at /dashboard/viewer redirects to /login', () => {
    setup('/dashboard/viewer', null, null)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  test('manager at /dashboard/manager sees ManagerDashboard', () => {
    setup('/dashboard/manager', { id: 2 }, 'manager')
    expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument()
  })

  test('fleet manager at /dashboard/manager sees ManagerDashboard', () => {
    setup('/dashboard/manager', { id: 2 }, 'fleet_manager')
    expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument()
  })

  test('admin at /dashboard/admin sees AdminDashboard', () => {
    setup('/dashboard/admin', { id: 3 }, 'admin')
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
  })

  test('manager at /dashboard/admin is sent to their own dashboard', () => {
    setup('/dashboard/admin', { id: 2 }, 'manager')
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument()
  })
})

// Viewers have no dashboard: everything leads to the viewer map.
describe('App routing: viewers', () => {
  test('viewer at /dashboard/viewer is sent to the viewer map', () => {
    setup('/dashboard/viewer', { id: 1 }, 'viewer')
    expect(screen.getByTestId('viewer-map')).toBeInTheDocument()
  })

  test('viewer at /map sees the viewer map, not the full live map', () => {
    setup('/map', { id: 1 }, 'viewer')
    expect(screen.getByTestId('viewer-map')).toBeInTheDocument()
    expect(screen.queryByTestId('live-map')).not.toBeInTheDocument()
  })

  test('viewer at /dashboard/admin ends up on the viewer map', () => {
    setup('/dashboard/admin', { id: 1 }, 'viewer')
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('viewer-map')).toBeInTheDocument()
  })

  test('viewer at /reports ends up on the viewer map', () => {
    setup('/reports', { id: 1 }, 'viewer')
    expect(screen.queryByTestId('reports-page')).not.toBeInTheDocument()
    expect(screen.getByTestId('viewer-map')).toBeInTheDocument()
  })
})

describe('App routing: live map for staff', () => {
  test.each(['manager', 'fleet_manager', 'admin'])('%s at /map sees the full live map', (role) => {
    setup('/map', { id: 2 }, role)
    expect(screen.getByTestId('live-map')).toBeInTheDocument()
    expect(screen.queryByTestId('viewer-map')).not.toBeInTheDocument()
  })
})