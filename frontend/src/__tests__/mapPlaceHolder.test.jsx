import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/components/map/FleetMap', () =>
  function FleetMap({ vehicles, minimal }) {
    return (
      <div data-testid="fleet-map" data-minimal={String(minimal)}>
        {vehicles.map(v => (
          <span key={v.id} data-testid={`vehicle-${v.id}`} />
        ))}
      </div>
    )
  }
)

// File is MapPlaceholder.jsx, exported function is MapSection
import MapSection from '@/components/dashboard/MapPlaceholder'

const VEHICLES = [
  { id: '1000', lat: -27.98763, lng: 28.37466, speed: 65,  status: 'active'  },
  { id: '1001', lat: -28.12345, lng: 28.56789, speed: 42,  status: 'active'  },
  { id: '1002', lat: -27.75432, lng: 28.12345, speed: 0,   status: 'idle'    },
  { id: '1003', lat: -28.34521, lng: 28.89012, speed: 78,  status: 'active'  },
  { id: '1004', lat: -27.65432, lng: 28.45678, speed: 0,   status: 'offline' },
  { id: '1005', lat: -28.56789, lng: 28.23456, speed: 55,  status: 'active'  },
]

describe('MapSection', () => {
  const defaultProps = { active: 4, idle: 1, offline: 1, vehicles: VEHICLES }

  it('renders the section heading', () => {
    render(<MapSection {...defaultProps} />)
    expect(screen.getByText('Live Fleet Map')).toBeInTheDocument()
  })

  it('displays the correct moving count', () => {
    render(<MapSection {...defaultProps} />)
    expect(screen.getByText(/4\s*Moving/i)).toBeInTheDocument()
  })

  it('displays the correct idle count', () => {
    render(<MapSection {...defaultProps} />)
    expect(screen.getByText(/1\s*Idle/i)).toBeInTheDocument()
  })

  it('displays the correct offline count', () => {
    render(<MapSection {...defaultProps} />)
    expect(screen.getByText(/1\s*Offline/i)).toBeInTheDocument()
  })

  it('passes vehicles array down to FleetMap', () => {
    render(<MapSection {...defaultProps} />)
    VEHICLES.forEach(v => {
      expect(screen.getByTestId(`vehicle-${v.id}`)).toBeInTheDocument()
    })
  })

  it('renders FleetMap in minimal mode', () => {
    render(<MapSection {...defaultProps} />)
    expect(screen.getByTestId('fleet-map')).toHaveAttribute('data-minimal', 'true')
  })

  it('renders with zero counts when props are omitted', () => {
    render(<MapSection vehicles={[]} />)
    expect(screen.getByText('Live Fleet Map')).toBeInTheDocument()
  })

  it('renders with an empty vehicles array without crashing', () => {
    render(<MapSection active={0} idle={0} offline={0} vehicles={[]} />)
    expect(screen.getByTestId('fleet-map')).toBeInTheDocument()
  })

  it('shows three status indicator dots', () => {
    const { container } = render(<MapSection {...defaultProps} />)
    const dots = container.querySelectorAll('span.rounded-full')
    expect(dots).toHaveLength(3)
  })
})