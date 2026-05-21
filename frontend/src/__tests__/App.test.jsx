import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../store/authStore', () => {
  const mock = jest.fn()
  mock.getState = jest.fn()
  return mock
})

// Replace BrowserRouter with MemoryRouter so we control the initial path
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }) => {
      const { MemoryRouter } = actual
      const path = global.__TEST_PATH__ || '/'
      return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    },
  }
})

jest.mock('../components/layout/AppShell', () =>
  function MockAppShell() {
    const { Outlet } = require('react-router-dom')
    return <div data-testid="appshell"><Outlet /></div>
  }
)

jest.mock('../pages/auth/Login',                 () => () => <div data-testid="login-page" />)
jest.mock('../pages/auth/Signup',                () => () => <div data-testid="signup-page" />)
jest.mock('../pages/auth/VerifyEmail',            () => () => <div data-testid="verify-page" />)
jest.mock('../pages/dashboard/ViewerDashboard',  () => () => <div data-testid="viewer-dashboard" />)
jest.mock('../pages/dashboard/ManagerDashboard', () => () => <div data-testid="manager-dashboard" />)
jest.mock('../pages/dashboard/AdminDashboard',   () => () => <div data-testid="admin-dashboard" />)
jest.mock('../pages/map/LiveMap',                () => () => <div data-testid="live-map" />)

import useAuthStore from '../store/authStore'
import App from '../App'

// ── Helper ────────────────────────────────────────────────────────────────────

const renderAt = (path, { user = null, role = null, getDashboardPath = () => '/login' } = {}) => {
  global.__TEST_PATH__ = path
  useAuthStore.mockReturnValue({ user, role })
  useAuthStore.getState.mockReturnValue({ getDashboardPath })
  return render(<App />)
}

afterEach(() => {
  global.__TEST_PATH__ = '/'
  jest.clearAllMocks()
})

// ── Public auth routes ────────────────────────────────────────────────────────

describe('App – public auth routes', () => {
  test('renders Login page at /login', () => {
    renderAt('/login')
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  test('renders Signup page at /signup', () => {
    renderAt('/signup')
    expect(screen.getByTestId('signup-page')).toBeInTheDocument()
  })

  test('renders VerifyEmail page at /verify', () => {
    renderAt('/verify')
    expect(screen.getByTestId('verify-page')).toBeInTheDocument()
  })
})

// ── Default redirect ──────────────────────────────────────────────────────────

describe('App – default redirect', () => {
  test('redirects / to /dashboard/viewer then to /login when unauthenticated', () => {
    renderAt('/', { user: null, role: null })
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })
})

// ── Unauthenticated ProtectedRoute ────────────────────────────────────────────

describe('App – unauthenticated ProtectedRoute redirects to /login', () => {
  const paths = ['/dashboard/viewer', '/dashboard/manager', '/dashboard/admin', '/map']

  paths.forEach(path => {
    test(`redirects ${path} to /login when not logged in`, () => {
      renderAt(path, { user: null, role: null })
      expect(screen.getByTestId('login-page')).toBeInTheDocument()
    })
  })
})

// ── Authenticated – correct role ──────────────────────────────────────────────

describe('App – authenticated user with correct role', () => {
  test('viewer can access /dashboard/viewer', () => {
    renderAt('/dashboard/viewer', { user: { id: 1 }, role: 'viewer' })
    expect(screen.getByTestId('viewer-dashboard')).toBeInTheDocument()
  })

  test('manager can access /dashboard/manager', () => {
    renderAt('/dashboard/manager', { user: { id: 2 }, role: 'manager' })
    expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument()
  })

  test('admin can access /dashboard/admin', () => {
    renderAt('/dashboard/admin', { user: { id: 3 }, role: 'admin' })
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
  })

  test('viewer can access /map', () => {
    renderAt('/map', { user: { id: 1 }, role: 'viewer' })
    expect(screen.getByTestId('live-map')).toBeInTheDocument()
  })

  test('manager can access /map', () => {
    renderAt('/map', { user: { id: 2 }, role: 'manager' })
    expect(screen.getByTestId('live-map')).toBeInTheDocument()
  })

  test('admin can access /map', () => {
    renderAt('/map', { user: { id: 3 }, role: 'admin' })
    expect(screen.getByTestId('live-map')).toBeInTheDocument()
  })
})

// ── Authenticated – wrong role (redirect) ─────────────────────────────────────

describe('App – authenticated user with WRONG role is redirected', () => {
  test('viewer trying /dashboard/manager is redirected to viewer dashboard', () => {
    renderAt('/dashboard/manager', {
      user: { id: 1 },
      role: 'viewer',
      getDashboardPath: () => '/dashboard/viewer',
    })
    expect(screen.queryByTestId('manager-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('viewer-dashboard')).toBeInTheDocument()
  })

  test('viewer trying /dashboard/admin is redirected to viewer dashboard', () => {
    renderAt('/dashboard/admin', {
      user: { id: 1 },
      role: 'viewer',
      getDashboardPath: () => '/dashboard/viewer',
    })
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('viewer-dashboard')).toBeInTheDocument()
  })

  test('manager trying /dashboard/admin is redirected to manager dashboard', () => {
    renderAt('/dashboard/admin', {
      user: { id: 2 },
      role: 'manager',
      getDashboardPath: () => '/dashboard/manager',
    })
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument()
  })

  test('admin trying /dashboard/viewer is redirected to admin dashboard', () => {
    renderAt('/dashboard/viewer', {
      user: { id: 3 },
      role: 'admin',
      getDashboardPath: () => '/dashboard/admin',
    })
    expect(screen.queryByTestId('viewer-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
  })
})