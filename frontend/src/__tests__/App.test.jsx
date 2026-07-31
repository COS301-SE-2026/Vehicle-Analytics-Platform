//import React from 'react'
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

jest.mock('../pages/auth/Login',                () => () => <div data-testid="login-page" />)
jest.mock('../pages/auth/Signup',               () => () => <div data-testid="signup-page" />)
jest.mock('../pages/auth/VerifyEmail',          () => () => <div data-testid="verify-page" />)
jest.mock('../pages/dashboard/ViewerDashboard', () => () => <div data-testid="viewer-dashboard" />)
jest.mock('../pages/dashboard/ManagerDashboard',() => () => <div data-testid="manager-dashboard" />)
jest.mock('../pages/dashboard/AdminDashboard',  () => () => <div data-testid="admin-dashboard" />)
jest.mock('../pages/map/LiveMap',               () => () => <div data-testid="live-map" />)

import App from '../App'
import useAuthStore from '../store/authStore'

const setup = (path, user, role, getDashboardPath = () => '/login') => {
  useAuthStore.mockReturnValue({ user, role })
  useAuthStore.getState.mockReturnValue({ getDashboardPath })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe('App routing', () => {
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

  test('unauthenticated user at /dashboard/viewer redirects to /login', () => {
    setup('/dashboard/viewer', null, null)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  test('viewer at /dashboard/viewer sees ViewerDashboard', () => {
    setup('/dashboard/viewer', { id: 1 }, 'viewer', () => '/dashboard/viewer')
    expect(screen.getByTestId('viewer-dashboard')).toBeInTheDocument()
  })

  test('manager at /dashboard/manager sees ManagerDashboard', () => {
    setup('/dashboard/manager', { id: 2 }, 'manager', () => '/dashboard/manager')
    expect(screen.getByTestId('manager-dashboard')).toBeInTheDocument()
  })

  test('admin at /dashboard/admin sees AdminDashboard', () => {
    setup('/dashboard/admin', { id: 3 }, 'admin', () => '/dashboard/admin')
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
  })

  test('viewer at /map sees LiveMap', () => {
    setup('/map', { id: 1 }, 'viewer', () => '/dashboard/viewer')
    expect(screen.getByTestId('live-map')).toBeInTheDocument()
  })

  test('wrong role at /dashboard/admin redirects to their dashboard', () => {
    setup('/dashboard/admin', { id: 1 }, 'viewer', () => '/dashboard/viewer')
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('viewer-dashboard')).toBeInTheDocument()
  })

   test('wrong role at /dashboard/admin redirects to their dashboard', () => {
    setup('/dashboard/admin', { id: 1 }, 'viewer', () => '/dashboard/viewer')
    expect(screen.queryByTestId('admin-dashboard')).not.toBeInTheDocument()
    expect(screen.getByTestId('viewer-dashboard')).toBeInTheDocument()
  })
})
