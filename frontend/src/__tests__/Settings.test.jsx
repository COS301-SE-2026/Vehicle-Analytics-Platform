import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Settings from '../pages/settings/Settings'

describe('Settings page', () => {
  test('renders Settings heading', () => {
    render(<Settings />)
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  test('renders without crashing', () => {
    const { container } = render(<Settings />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
