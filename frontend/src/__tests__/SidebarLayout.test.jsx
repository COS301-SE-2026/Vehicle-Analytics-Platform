import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import Sidebar from '../components/layout/Sidebar'

const renderSidebar = (props = {}) => {
  const defaults = {
    role: 'viewer',
    collapsed: false,
    onToggle: jest.fn(),
  }
  return render(
    <MemoryRouter>
      <Sidebar {...defaults} {...props} />
    </MemoryRouter>
  )
}

describe('Sidebar layout component', () => {
  test('renders the FleetTracker brand name when not collapsed', () => {
    renderSidebar({ collapsed: false })
    expect(screen.getByText('FleetTracker')).toBeInTheDocument()
  })

  test('hides the brand name when collapsed', () => {
    renderSidebar({ collapsed: true })
    expect(screen.queryByText('FleetTracker')).not.toBeInTheDocument()
  })

  test('renders Dashboard nav link', () => {
    renderSidebar()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('renders Live Map nav link', () => {
    renderSidebar()
    expect(screen.getByText('Live Map')).toBeInTheDocument()
  })

  test('renders the user role when not collapsed', () => {
    renderSidebar({ role: 'admin', collapsed: false })
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  test('hides the user role when collapsed', () => {
    renderSidebar({ role: 'admin', collapsed: true })
    expect(screen.queryByText('admin')).not.toBeInTheDocument()
  })

  test('renders the avatar initials ZN', () => {
    renderSidebar()
    expect(screen.getByText('ZN')).toBeInTheDocument()
  })

  test('calls onToggle when toggle button is clicked', () => {
    const onToggle = jest.fn()
    renderSidebar({ onToggle })
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  test('renders as an aside element', () => {
    const { container } = renderSidebar()
    expect(container.querySelector('aside')).toBeInTheDocument()
  })

  test('applies collapsed width class when collapsed', () => {
    const { container } = renderSidebar({ collapsed: true })
    expect(container.querySelector('aside')).toHaveClass('w-[64px]')
  })

  test('applies expanded width class when not collapsed', () => {
    const { container } = renderSidebar({ collapsed: false })
    expect(container.querySelector('aside')).toHaveClass('w-[220px]')
  })
})
