import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from '../components/layout/Header'

describe('Header', () => {
  test('renders the page title', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  test('renders a different title correctly', () => {
    render(<Header title="Live Map" collapsed={false} />)
    expect(screen.getByText('Live Map')).toBeInTheDocument()
  })

  test('renders the avatar initials', () => {
    render(<Header title="Dashboard" collapsed={false} />)
    expect(screen.getByText('ZN')).toBeInTheDocument()
  })

  test('renders a header element', () => {
    const { container } = render(<Header title="Dashboard" collapsed={false} />)
    expect(container.querySelector('header')).toBeInTheDocument()
  })

  test('applies left-[64px] class when collapsed is true', () => {
    const { container } = render(<Header title="Dashboard" collapsed={true} />)
    expect(container.querySelector('header')).toHaveClass('left-[64px]')
  })

  test('applies left-[220px] class when collapsed is false', () => {
    const { container } = render(<Header title="Dashboard" collapsed={false} />)
    expect(container.querySelector('header')).toHaveClass('left-[220px]')
  })

  test('renders without crashing when no props provided', () => {
    const { container } = render(<Header />)
    expect(container.querySelector('header')).toBeInTheDocument()
  })
})
