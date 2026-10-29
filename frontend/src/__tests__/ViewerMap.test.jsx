import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockViewerFleetMap = jest.fn()

jest.mock('@/hooks/useLiveFleetData', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('@/components/map/FleetMap', () => ({
  __esModule: true,
  ViewerFleetMap: (props) => {
    mockViewerFleetMap(props)
    return (
      <div>
        {props.vehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            type="button"
            onClick={() => props.onVehicleClick(vehicle)}
          >
            Select {vehicle.id}
          </button>
        ))}
      </div>
    )
  },
}))

import useLiveFleetData from '@/hooks/useLiveFleetData'
import ViewerMap from '@/pages/map/ViewerMap'

const VEHICLES = [
  { id: 'VH-001', status: 'active', speed: 65, displayName: 'Depot truck' },
  { id: 'VH-002', status: 'idle', speed: 0, city: 'Pretoria' },
  { id: 'VH-003', status: 'offline', speed: null, lat: -25.75456, lng: 28.2293 },
]

describe('ViewerMap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useLiveFleetData.mockReturnValue({
      vehicles: VEHICLES,
      buffer: { type: 'FeatureCollection', features: [] },
      loading: false,
      lastUpdated: new Date('2026-10-29T12:00:00Z'),
    })
  })

  it('renders vehicle counts and passes live data to the viewer map', () => {
    render(<ViewerMap />)

    expect(screen.getByText('Live Fleet')).toBeInTheDocument()
    expect(within(screen.getByText('Moving').parentElement).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByText('Idle').parentElement).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByText('Offline').parentElement).getByText('1')).toBeInTheDocument()
    expect(screen.getByText(/3 vehicles · updated/)).toBeInTheDocument()
    expect(mockViewerFleetMap).toHaveBeenCalledWith(expect.objectContaining({
      vehicles: VEHICLES,
      buffer: expect.objectContaining({ features: [] }),
    }))
  })

  it('shows loading state when live data is unavailable', () => {
    useLiveFleetData.mockReturnValue({
      vehicles: [],
      buffer: { type: 'FeatureCollection', features: [] },
      loading: true,
      lastUpdated: null,
    })

    render(<ViewerMap />)

    expect(screen.getByText('Loading vehicles…')).toBeInTheDocument()
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  })

  it('opens and closes the selected vehicle panel', () => {
    render(<ViewerMap />)

    fireEvent.click(screen.getByRole('button', { name: 'Select VH-001' }))
    expect(screen.getByRole('complementary', { name: 'Details for vehicle VH-001' })).toBeInTheDocument()
    expect(screen.getByText('Depot truck')).toBeInTheDocument()
    expect(screen.getByText('65')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close vehicle details' }))
    expect(screen.queryByRole('complementary', { name: 'Details for vehicle VH-001' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Select VH-002' }))
    expect(screen.getByText('Pretoria')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close vehicle details' }))

    fireEvent.click(screen.getByRole('button', { name: 'Select VH-003' }))
    expect(screen.getByText('-25.7546, 28.2293')).toBeInTheDocument()
  })
})
