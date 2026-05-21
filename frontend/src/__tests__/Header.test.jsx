import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import '@testing-library/jest-dom'
import AppShell from '../components/layout/AppShell'

// ─── Mocks ────────────────────────────────────────────────────────────────────
// Paths must match the imports used inside AppShell, not the test file location.

jest.mock('../components/layout/Sidebar', () =>
  function MockSidebar({ role, collapsed, onToggle }) {
    return (
      <div
        data-testid="sidebar"
        data-role={role}
        data-collapsed={String(collapsed)} // coerce boolean → string for attribute assertions
      >
        <button onClick={onToggle} data-testid="toggle-btn">
          Toggle
        </button>
      </div>
    )
  }
)

jest.mock('../components/layout/Header', () =>
  function MockHeader({ title, collapsed }) {
    return (
      <div
        data-testid="header"
        data-title={title}
        data-collapsed={String(collapsed)}
      >
        Header Content
      </div>
    )
  }
)

// ─── Helper ───────────────────────────────────────────────────────────────────

const renderShellAtRoute = (initialRoute, role = 'viewer') =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<AppShell role={role} />}>
          <Route path="dashboard/viewer"  element={<div data-testid="outlet">Viewer Page</div>} />
          <Route path="dashboard/manager" element={<div data-testid="outlet">Manager Page</div>} />
          <Route path="dashboard/admin"   element={<div data-testid="outlet">Admin Page</div>} />
          <Route path="map"               element={<div data-testid="outlet">Map Page</div>} />
          <Route path="login"             element={<div data-testid="outlet">Login Page</div>} />
          <Route path="register"          element={<div data-testid="outlet">Register Page</div>} />
          <Route path="unknown"           element={<div data-testid="outlet">Unknown Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('AppShell – rendering', () => {
  test('renders Sidebar, Header, and Outlet for a known route', () => {
    renderShellAtRoute('/dashboard/viewer')

    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  test('passes the role prop down to Sidebar', () => {
    renderShellAtRoute('/dashboard/viewer', 'admin')

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-role', 'admin')
  })

  test('defaults role to "viewer" when no role prop is supplied', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/viewer']}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="dashboard/viewer" element={<div data-testid="outlet" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-role', 'viewer')
  })
})

// ─── Page titles ──────────────────────────────────────────────────────────────

describe('AppShell – page titles', () => {
  const cases = [
    { path: '/dashboard/viewer',  expected: 'Dashboard' },
    { path: '/dashboard/manager', expected: 'Dashboard' },
    { path: '/dashboard/admin',   expected: 'Admin Dashboard' },
    { path: '/map',               expected: 'Live Map' },
  ]

  test.each(cases)(
    'sets Header title to "$expected" for route "$path"',
    ({ path, expected }) => {
      renderShellAtRoute(path)
      expect(screen.getByTestId('header')).toHaveAttribute('data-title', expected)
    }
  )

  test('falls back to "FleetTracker" for an unknown route', () => {
    renderShellAtRoute('/unknown')
    expect(screen.getByTestId('header')).toHaveAttribute('data-title', 'FleetTracker')
  })
})

// ─── Header suppression ───────────────────────────────────────────────────────

describe('AppShell – header suppression', () => {
  test('hides Header on /login', () => {
    renderShellAtRoute('/login')

    expect(screen.queryByTestId('header')).not.toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
  })

  test('hides Header on /register', () => {
    renderShellAtRoute('/register')

    expect(screen.queryByTestId('header')).not.toBeInTheDocument()
  })

  test('shows Header on routes that are NOT in the noHeader set', () => {
    renderShellAtRoute('/map')

    expect(screen.getByTestId('header')).toBeInTheDocument()
  })
})

// ─── Collapse / layout ────────────────────────────────────────────────────────

describe('AppShell – collapse toggle', () => {
  test('starts expanded: sidebar data-collapsed is "false", content offset is ml-[220px]', () => {
    renderShellAtRoute('/dashboard/viewer')

    const sidebar = screen.getByTestId('sidebar')
    const header  = screen.getByTestId('header')

    expect(sidebar).toHaveAttribute('data-collapsed', 'false')
    expect(header.parentElement).toHaveClass('ml-[220px]')
  })

  test('after toggle: sidebar data-collapsed is "true", content offset is ml-[64px]', () => {
    renderShellAtRoute('/dashboard/viewer')

    fireEvent.click(screen.getByTestId('toggle-btn'))

    const sidebar = screen.getByTestId('sidebar')
    const header  = screen.getByTestId('header')

    expect(sidebar).toHaveAttribute('data-collapsed', 'true')
    expect(header.parentElement).toHaveClass('ml-[64px]')
  })

  test('toggling twice returns to the expanded state', () => {
    renderShellAtRoute('/dashboard/viewer')

    const toggleBtn = screen.getByTestId('toggle-btn')
    fireEvent.click(toggleBtn) // collapse
    fireEvent.click(toggleBtn) // expand again

    expect(screen.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'false')
    expect(screen.getByTestId('header').parentElement).toHaveClass('ml-[220px]')
  })

  test('passes collapsed state to Header', () => {
    renderShellAtRoute('/dashboard/viewer')

    expect(screen.getByTestId('header')).toHaveAttribute('data-collapsed', 'false')

    fireEvent.click(screen.getByTestId('toggle-btn'))

    expect(screen.getByTestId('header')).toHaveAttribute('data-collapsed', 'true')
  })

  test('content wrapper always carries the transition utility class', () => {
    renderShellAtRoute('/dashboard/viewer')

    const wrapper = screen.getByTestId('header').parentElement
    expect(wrapper).toHaveClass('transition-all')
    expect(wrapper).toHaveClass('duration-300')
  })
})

// ─── Main padding ─────────────────────────────────────────────────────────────

describe('AppShell – main element padding', () => {
  test('adds top padding when Header is visible', () => {
    renderShellAtRoute('/dashboard/viewer')

    // The <main> element is the parent of the outlet content
    const outlet = screen.getByTestId('outlet')
    expect(outlet.parentElement).toHaveClass('pt-[60px]')
    expect(outlet.parentElement).toHaveClass('p-6')
  })

  test('removes padding when Header is hidden (login)', () => {
    renderShellAtRoute('/login')

    const outlet = screen.getByTestId('outlet')
    expect(outlet.parentElement).toHaveClass('pt-0')
    expect(outlet.parentElement).toHaveClass('p-0')
  })
})