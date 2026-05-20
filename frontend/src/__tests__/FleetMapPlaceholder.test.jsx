import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LiveFleetMapPlaceholder from '../components/dashboard/LiveFleetMapPlaceholder'

// The mock button can simulate any vehicle — we pass different payloads per test
let mockVehiclePayload = {
  id: 'VH-0099',
  status: 'active',
  currentSpeed: 72,
  lat: -25.7461,
  lng: 28.1881,
}

jest.mock('../components/map/FleetMap', () => ({
  __esModule: true,
  default: ({ onVehicleClick, minimal }) => (
    <div data-testid="live-map" data-minimal={String(minimal)}>
      <button
        data-testid="mock-vehicle-btn"
        onClick={() => onVehicleClick(mockVehiclePayload)}
      >
        Select Vehicle
      </button>
    </div>
  ),
}))

const defaultProps = {
  active: 5,
  idle: 2,
  offline: 1,
  total: 8,
  vehicles: [],
}

beforeEach(() => {
  // Reset to active vehicle before each test
  mockVehiclePayload = {
    id: 'VH-0099',
    status: 'active',
    currentSpeed: 72,
    lat: -25.7461,
    lng: 28.1881,
  }
})

describe('LiveFleetMapPlaceholder', () => {
  describe('Fleet Summary Card', () => {
    it('renders the Live Fleet label', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      expect(screen.getByText('Live Fleet')).toBeInTheDocument()
    })

    it('displays the correct total vehicle count', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('displays the correct active, idle, and offline counts', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('shows "Last updated: just now"', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      expect(screen.getByText('Last updated: just now')).toBeInTheDocument()
    })
  })

  describe('FleetMap integration', () => {
    it('renders the FleetMap with minimal=false', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      expect(screen.getByTestId('fleet-map')).toHaveAttribute('data-minimal', 'false')
    })

    it('does not show VehiclePanel initially', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      expect(screen.queryByText('Current Speed')).not.toBeInTheDocument()
    })
  })

  describe('VehiclePanel — active vehicle', () => {
    it('opens VehiclePanel when a vehicle is clicked', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('Current Speed')).toBeInTheDocument()
      expect(screen.getByText('VH-0099')).toBeInTheDocument()
    })

    it('displays MOVING status for an active vehicle', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('MOVING')).toBeInTheDocument()
    })

    it('displays lat/lng as the location when provided', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('-25.7461, 28.1881')).toBeInTheDocument()
    })

    it('falls back to MOCK_FALLBACK tripDuration when not provided', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('1h 24m 12s')).toBeInTheDocument()
    })

    it('closes VehiclePanel when the close button is clicked', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('Current Speed')).toBeInTheDocument()
      const closeBtn = screen.getByRole('button', { name: '' })
      fireEvent.click(closeBtn)
      expect(screen.queryByText('Current Speed')).not.toBeInTheDocument()
    })

    it('shows speed from currentSpeed prop', () => {
      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('72')).toBeInTheDocument()
    })
  })

  describe('VehiclePanel — idle vehicle', () => {
    it('shows IDLE status badge for a non-active vehicle', () => {
      // Override the payload for this test only
      mockVehiclePayload = {
        id: 'VH-0031',
        status: 'idle',
        currentSpeed: 0,
        lat: -26.1,
        lng: 28.0,
      }

      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('IDLE')).toBeInTheDocument()
    })

    it('shows 0 speed for an idle vehicle', () => {
      mockVehiclePayload = {
        id: 'VH-0031',
        status: 'idle',
        currentSpeed: 0,
        lat: -26.1,
        lng: 28.0,
      }

      render(<LiveFleetMapPlaceholder {...defaultProps} />)
      fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })
})