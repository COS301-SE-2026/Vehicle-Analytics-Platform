import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Login from '../pages/auth/Login'
import Signup from '../pages/auth/Signup'
import VerifyEmail from '../pages/auth/VerifyEmail'

describe('Login page', () => {
  test('renders FleetTracker brand', () => {
    render(<Login />)
    expect(screen.getAllByText('FleetTracker')[0]).toBeInTheDocument()
  })

  test('renders login form placeholder', () => {
    render(<Login />)
    expect(screen.getByText('Login form goes here')).toBeInTheDocument()
  })

  test('renders left and right panels', () => {
    const { container } = render(<Login />)
    expect(container.querySelector('.bg-fleet-green')).toBeInTheDocument()
  })
})

describe('Signup page', () => {
  test('renders FleetTracker brand', () => {
    render(<Signup />)
    expect(screen.getAllByText('FleetTracker')[0]).toBeInTheDocument()
  })

  test('renders signup form placeholder', () => {
    render(<Signup />)
    expect(screen.getByText('Signup form goes here')).toBeInTheDocument()
  })

  test('renders left panel', () => {
    const { container } = render(<Signup />)
    expect(container.querySelector('.bg-fleet-green')).toBeInTheDocument()
  })
})

describe('VerifyEmail page', () => {
  test('renders check your email heading', () => {
    render(<VerifyEmail />)
    expect(screen.getByText('Check your email')).toBeInTheDocument()
  })

  test('renders verification instructions', () => {
    render(<VerifyEmail />)
    expect(screen.getByText(/verification link/i)).toBeInTheDocument()
  })

  test('renders without crashing', () => {
    const { container } = render(<VerifyEmail />)
    expect(container.firstChild).toBeInTheDocument()
  })
})
