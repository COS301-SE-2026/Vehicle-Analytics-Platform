//import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import LiveFleetMapPlaceholder from '../components/dashboard/LiveFleetMapPlaceholder'

let mockVehiclePayload = {
  id: 'VH-0099',
  status: 'active',
  speed: 72,
  lat: -25.7461,
  lng: 28.1881,
  movement: 'moving'
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
    speed: 72,
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




// ── VehiclePanel returns null when vehicle is null ────────────────────────────

describe('LiveFleetMapPlaceholder – VehiclePanel null guard', () => {
  it('does not render VehiclePanel when no vehicle selected', () => {
    render(<LiveFleetMapPlaceholder {...defaultProps} />)
    expect(screen.queryByText('Current Speed')).not.toBeInTheDocument()
  })
})