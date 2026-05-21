import React from 'react'
import { render, screen } from '@testing-library/react'
import DataFeedStatusCard from '../components/dashboard/DataFeedStatusCard'

describe('DataFeedStatusCard', () => {
  describe('Status display', () => {
    it('shows "Live" when isLive is true', () => {
      render(<DataFeedStatusCard isLive={true} />)
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('shows "Offline" when isLive is false', () => {
      render(<DataFeedStatusCard isLive={false} />)
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('defaults to "Offline" when isLive is not provided', () => {
      render(<DataFeedStatusCard />)
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('renders the "Data Feed Status" label', () => {
      render(<DataFeedStatusCard />)
      expect(screen.getByText('Data Feed Status')).toBeInTheDocument()
    })
  })

  describe('formatLastReceived — timestamp display', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('shows "Unknown" when lastReceived is null', () => {
      render(<DataFeedStatusCard lastReceived={null} />)
      expect(screen.getByText(/Last received Unknown/)).toBeInTheDocument()
    })

    it('shows "Unknown" when lastReceived is not provided', () => {
      render(<DataFeedStatusCard />)
      expect(screen.getByText(/Last received Unknown/)).toBeInTheDocument()
    })

    it('shows seconds ago when timestamp is less than 60s old', () => {
      const now = new Date('2024-01-01T12:00:00.000Z')
      jest.setSystemTime(now)
      const timestamp = new Date(now.getTime() - 30 * 1000).toISOString()
      render(<DataFeedStatusCard lastReceived={timestamp} />)
      expect(screen.getByText(/30s ago/)).toBeInTheDocument()
    })

    it('shows minutes ago when timestamp is between 1–59 minutes old', () => {
      const now = new Date('2024-01-01T12:00:00.000Z')
      jest.setSystemTime(now)
      const timestamp = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
      render(<DataFeedStatusCard lastReceived={timestamp} />)
      expect(screen.getByText(/15m ago/)).toBeInTheDocument()
    })

    it('shows hours ago when timestamp is between 1–23 hours old', () => {
      const now = new Date('2024-01-01T12:00:00.000Z')
      jest.setSystemTime(now)
      const timestamp = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString()
      render(<DataFeedStatusCard lastReceived={timestamp} />)
      expect(screen.getByText(/3h ago/)).toBeInTheDocument()
    })

    it('shows a localeDateString when timestamp is older than 24 hours', () => {
      const now = new Date('2024-01-10T12:00:00.000Z')
      jest.setSystemTime(now)
      const oldDate = new Date('2024-01-08T12:00:00.000Z')
      const expected = oldDate.toLocaleDateString()
      render(<DataFeedStatusCard lastReceived={oldDate.toISOString()} />)
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument()
    })
  })

  describe('CSS classes based on isLive', () => {
    it('applies animate-pulse class to the indicator dot when live', () => {
      const { container } = render(<DataFeedStatusCard isLive={true} />)
      const dot = container.querySelector('.animate-pulse')
      expect(dot).toBeInTheDocument()
    })

    it('does not apply animate-pulse when offline', () => {
      const { container } = render(<DataFeedStatusCard isLive={false} />)
      const dot = container.querySelector('.animate-pulse')
      expect(dot).not.toBeInTheDocument()
    })
  })
})