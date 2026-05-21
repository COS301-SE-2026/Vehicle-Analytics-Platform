import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LiveFleetMapPlaceholder from '../components/dashboard/LiveFleetMapPlaceholder'

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

jest.mock('lucide-react', () => ({
  Truck:     () => <svg data-testid="truck-icon" />,
  X:         () => <svg data-testid="x-icon" />,
  MapPin:    () => <svg data-testid="mappin-icon" />,
  Clock:     () => <svg data-testid="clock-icon" />,
  Waypoints: () => <svg data-testid="waypoints-icon" />,
}))

const defaultProps = {
  active: 5,
  idle: 2,
  offline: 1,
  total: 8,
  vehicles: [],
}

beforeEach(() => {
  mockVehiclePayload = {
    id: 'VH-0099',
    status: 'active',
    currentSpeed: 72,
    lat: -25.7461,
    lng: 28.1881,
  }
})

describe('LiveFleetMapPlaceholder – Fleet Summary Card', () => {
  it('renders the Live Fleet label', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.getByText('Live Fleet')).toBeInTheDocument()
  })

  it('displays the correct total vehicle count', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('displays active, idle, and offline counts', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows "Last updated: just now"', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.getByText('Last updated: just now')).toBeInTheDocument()
  })

  it('renders with undefined props without crashing', () => {
    render(<LiveFleetMapPlaceholder />)
    expect(screen.getByText('Live Fleet')).toBeInTheDocument()
  })
})

describe('LiveFleetMapPlaceholder – FleetMap integration', () => {
  it('renders FleetMap with minimal=false', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.getByTestId('live-map')).toHaveAttribute('data-minimal', 'false')
  })

  it('does not show VehiclePanel initially', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.queryByText('Current Speed')).not.toBeInTheDocument()
  })
})

describe('LiveFleetMapPlaceholder – VehiclePanel active vehicle', () => {
  it('opens VehiclePanel when a vehicle is clicked', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('Current Speed')).toBeInTheDocument()
    expect(screen.getByText('VH-0099')).toBeInTheDocument()
  })

  it('displays MOVING status for active vehicle', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('MOVING')).toBeInTheDocument()
  })

  it('displays lat/lng as location when both are provided', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('-25.7461, 28.1881')).toBeInTheDocument()
  })

  it('shows speed from currentSpeed prop', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('72')).toBeInTheDocument()
  })

  it('falls back to MOCK_FALLBACK tripDuration when not provided', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('1h 24m 12s')).toBeInTheDocument()
  })

  it('closes VehiclePanel when close button is clicked', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('Current Speed')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('x-icon').closest('button'))
    expect(screen.queryByText('Current Speed')).not.toBeInTheDocument()
  })
})

describe('LiveFleetMapPlaceholder – VehiclePanel idle vehicle', () => {
  it('shows IDLE status for idle vehicle', () => {
    mockVehiclePayload = { id: 'VH-0031', status: 'idle', currentSpeed: 0, lat: -26.1, lng: 28.0 }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('IDLE')).toBeInTheDocument()
  })

  it('shows 0 speed for idle vehicle', () => {
    mockVehiclePayload = { id: 'VH-0031', status: 'idle', currentSpeed: 0, lat: -26.1, lng: 28.0 }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

// ── Branch: location fallback (no lat/lng) ────────────────────────────────────

describe('LiveFleetMapPlaceholder – location fallback branches', () => {
  it('falls back to v.location string when lat/lng are missing', () => {
    mockVehiclePayload = {
      id: 'VH-0010',
      status: 'idle',
      currentSpeed: 0,
      location: 'Sandton Depot',
    }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('Sandton Depot')).toBeInTheDocument()
  })

  it('shows "Unknown" when neither lat/lng nor location is provided', () => {
    mockVehiclePayload = {
      id: 'VH-0011',
      status: 'idle',
      currentSpeed: 0,
    }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })
})

// ── Branch: speed fallback (no currentSpeed, use speed) ───────────────────────

describe('LiveFleetMapPlaceholder – speed fallback branches', () => {
  it('uses v.speed when currentSpeed is not provided', () => {
    mockVehiclePayload = {
      id: 'VH-0012',
      status: 'active',
      speed: 55,
      lat: -25.0,
      lng: 28.0,
    }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('55')).toBeInTheDocument()
  })

  it('shows 0 when neither currentSpeed nor speed is provided', () => {
    mockVehiclePayload = {
      id: 'VH-0013',
      status: 'idle',
      lat: -25.0,
      lng: 28.0,
    }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})

// ── Branch: status UNKNOWN ────────────────────────────────────────────────────

describe('LiveFleetMapPlaceholder – status UNKNOWN branch', () => {
  it('shows UNKNOWN when vehicle status is undefined', () => {
    mockVehiclePayload = {
      id: 'VH-0014',
      status: undefined,
      currentSpeed: 0,
      lat: -25.0,
      lng: 28.0,
    }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument()
  })

  it('shows OFFLINE status uppercased for offline vehicle', () => {
    mockVehiclePayload = {
      id: 'VH-0015',
      status: 'offline',
      currentSpeed: 0,
      lat: -25.0,
      lng: 28.0,
    }
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    fireEvent.click(screen.getByTestId('mock-vehicle-btn'))
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
  })
})

// ── VehiclePanel returns null when vehicle is null ────────────────────────────

describe('LiveFleetMapPlaceholder – VehiclePanel null guard', () => {
  it('does not render VehiclePanel when no vehicle selected', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.queryByText('Current Speed')).not.toBeInTheDocument()
  })
})