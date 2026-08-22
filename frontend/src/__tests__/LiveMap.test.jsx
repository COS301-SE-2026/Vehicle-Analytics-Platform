import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('@/components/map/FleetMap', () => ({
  __esModule: true,
  default: () => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'fleet-map' })
  },
}))

jest.mock('@/components/dashboard/LiveFleetMapPlaceholder', () => {
  const PropTypes = require('prop-types')
  const MockLiveFleetMapPlaceholder = ({ active, idle, offline, total, vehicles, buffer }) => {
    return (
      <div data-testid="live-fleet-placeholder">
        <span data-testid="stat-active">{active}</span>
        <span data-testid="stat-idle">{idle}</span>
        <span data-testid="stat-offline">{offline}</span>
        <span data-testid="stat-total">{total}</span>
        <span data-testid="vehicle-count">{(vehicles ?? []).length}</span>
        <span data-testid="buffer-features">{(buffer?.features ?? []).length}</span>
      </div>
    )
  }
  MockLiveFleetMapPlaceholder.propTypes = {
    active: PropTypes.number,
    idle: PropTypes.number,
    offline: PropTypes.number,
    total: PropTypes.number,
    vehicles: PropTypes.array,
    buffer: PropTypes.object,
  }
  return MockLiveFleetMapPlaceholder
})

jest.mock('@/services/vehicleService', () => ({
  getVehicleLocations: jest.fn(),
  getVehiclePositionBuffer: jest.fn(),
}))

import * as vehicleService from '@/services/vehicleService'
import LiveMap from '@/pages/map/LiveMap'

const LOCATIONS_POLL_MS = 2000
const BUFFER_POLL_MS = 10000

const VEHICLES = [
  { id: '1000', lat: -27.98763, lng: 28.37466, speed: 65, status: 'active'  },
  { id: '1001', lat: -28.12345, lng: 28.56789, speed: 42, status: 'active'  },
  { id: '1002', lat: -27.75432, lng: 28.12345, speed: 0,  status: 'idle'    },
  { id: '1003', lat: -28.34521, lng: 28.89012, speed: 78, status: 'active'  },
  { id: '1004', lat: -27.65432, lng: 28.45678, speed: 0,  status: 'offline' },
  { id: '1005', lat: -28.56789, lng: 28.23456, speed: 55, status: 'active'  },
]

const makeResponse = (vehicles = VEHICLES) => ({
  timestamp: new Date().toISOString(),
  vehicles,
})

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

const renderLiveMap = async () => {
  let utils
  await act(async () => {
    utils = render(<LiveMap />)
  })
  return utils
}

const advancePoll = async (ms) => {
  await act(async () => {})
  await act(async () => { jest.advanceTimersByTime(ms) })
  await act(async () => {})
}

describe('LiveMap', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    vehicleService.getVehicleLocations.mockResolvedValue(makeResponse())
    vehicleService.getVehiclePositionBuffer.mockResolvedValue(EMPTY_FC)
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('initial render', () => {
    it('shows a loading spinner before data arrives', async () => {
      vehicleService.getVehicleLocations.mockImplementationOnce(() => new Promise(() => {}))
      vehicleService.getVehiclePositionBuffer.mockImplementationOnce(() => new Promise(() => {}))

      await act(async () => { render(<LiveMap />) })
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('hides the loading spinner once data has loaded', async () => {
      await renderLiveMap()
      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })

    it('renders the fleet-map placeholder after data loads', async () => {
      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
      })
    })

    it('fetches both locations and the position buffer on mount', async () => {
      await renderLiveMap()
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(1)
    })
  })

  describe('polling', () => {
    it('polls getVehicleLocations on the locations interval', async () => {
      await renderLiveMap()
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)

      await advancePoll(LOCATIONS_POLL_MS)
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(2)

      await advancePoll(LOCATIONS_POLL_MS)
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(3)
    })

    it('polls getVehiclePositionBuffer on its own, slower interval', async () => {
      await renderLiveMap()
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(1)

      await advancePoll(LOCATIONS_POLL_MS)
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(1)

      await advancePoll(BUFFER_POLL_MS)
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(2)
    })

    it('does not start a new request while one is still in flight', async () => {
      vehicleService.getVehiclePositionBuffer.mockImplementation(() => new Promise(() => {}))

      await act(async () => { render(<LiveMap />) })
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(1)

      await act(async () => { jest.advanceTimersByTime(BUFFER_POLL_MS * 5) })
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(1)
    })

    it('stops polling after the component unmounts', async () => {
      const { unmount } = await renderLiveMap()
      unmount()

      await act(async () => { jest.advanceTimersByTime(30_000) })
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)
      expect(vehicleService.getVehiclePositionBuffer).toHaveBeenCalledTimes(1)
    })
  })

  describe('vehicle stat counts', () => {
    it('passes the full vehicle list to the placeholder', async () => {
      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('vehicle-count')).toHaveTextContent(String(VEHICLES.length))
      })
    })

    it('computes active count correctly', async () => {
      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
      })
    })

    it('computes idle count correctly', async () => {
      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('stat-idle')).toHaveTextContent('1')
      })
    })

    it('computes offline count correctly', async () => {
      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('stat-offline')).toHaveTextContent('1')
      })
    })

    it('active + idle + offline equals total vehicle count', async () => {
      await renderLiveMap()
      await waitFor(() => {
        const active  = Number(screen.getByTestId('stat-active').textContent)
        const idle    = Number(screen.getByTestId('stat-idle').textContent)
        const offline = Number(screen.getByTestId('stat-offline').textContent)
        expect(active + idle + offline).toBe(VEHICLES.length)
      })
    })

    it('ignores unknown statuses in the counts but still lists the vehicle', async () => {
      const weirdVehicles = [
        ...VEHICLES,
        { id: '9999', lat: -28.0, lng: 28.0, speed: 0, status: 'maintenance' },
      ]
      vehicleService.getVehicleLocations.mockResolvedValue(makeResponse(weirdVehicles))
      await renderLiveMap()

      expect(screen.getByTestId('vehicle-count')).toHaveTextContent(String(weirdVehicles.length))
      expect(screen.getByTestId('stat-total')).toHaveTextContent(String(weirdVehicles.length))
      expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
      expect(screen.getByTestId('stat-idle')).toHaveTextContent('1')
      expect(screen.getByTestId('stat-offline')).toHaveTextContent('1')
    })
  })

  describe('polling updates', () => {
    it('updates counts when vehicle statuses change on the next poll', async () => {
      const updatedVehicles = VEHICLES.map(v =>
        v.id === '1004' ? { ...v, status: 'active' } : v
      )

      vehicleService.getVehicleLocations
        .mockResolvedValueOnce(makeResponse())
        .mockResolvedValueOnce(makeResponse(updatedVehicles))

      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
        expect(screen.getByTestId('stat-offline')).toHaveTextContent('1')
      })

      await advancePoll(LOCATIONS_POLL_MS)
      await waitFor(() => {
        expect(screen.getByTestId('stat-active')).toHaveTextContent('5')
        expect(screen.getByTestId('stat-offline')).toHaveTextContent('0')
      })
    })

    it('passes updated buffer data through to the placeholder', async () => {
      const fc = { type: 'FeatureCollection', features: [{ type: 'Feature' }, { type: 'Feature' }] }
      vehicleService.getVehiclePositionBuffer
        .mockResolvedValueOnce(EMPTY_FC)
        .mockResolvedValueOnce(fc)

      await renderLiveMap()
      expect(screen.getByTestId('buffer-features')).toHaveTextContent('0')

      await advancePoll(BUFFER_POLL_MS)
      await waitFor(() => {
        expect(screen.getByTestId('buffer-features')).toHaveTextContent('2')
      })
    })

    it('retains previous data when a mid-poll request fails', async () => {
      vehicleService.getVehicleLocations
        .mockResolvedValueOnce(makeResponse())
        .mockRejectedValueOnce(new Error('Network error'))

      await renderLiveMap()
      await waitFor(() => {
        expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
      })

      await advancePoll(LOCATIONS_POLL_MS)
      await waitFor(() => {
        expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
        expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('does not crash when the initial API call fails', async () => {
      vehicleService.getVehicleLocations.mockRejectedValue(new Error('Network error'))
      await expect(
        act(async () => { render(<LiveMap />) })
      ).resolves.not.toThrow()
    })

    it('still renders the placeholder with zero counts when the initial fetch fails', async () => {
      vehicleService.getVehicleLocations.mockRejectedValue(new Error('Network error'))
      await act(async () => { render(<LiveMap />) })

      expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
      expect(screen.getByTestId('vehicle-count')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
    })

    it('clears the loading spinner even when the initial fetch fails', async () => {
      vehicleService.getVehicleLocations.mockRejectedValue(new Error('Network error'))
      await act(async () => { render(<LiveMap />) })

      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
      })
    })

    it('continues polling after a failed request', async () => {
      vehicleService.getVehicleLocations
        .mockResolvedValueOnce(makeResponse())
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(makeResponse())

      await renderLiveMap()
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)

      await advancePoll(LOCATIONS_POLL_MS) // fails
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(2)

      await advancePoll(LOCATIONS_POLL_MS) // recovers
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(3)
    })

    it('keeps polling locations when only the buffer request fails', async () => {
      vehicleService.getVehiclePositionBuffer.mockRejectedValue(new Error('504'))

      await renderLiveMap()
      await advancePoll(LOCATIONS_POLL_MS)

      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
    })
  })

  describe('null and empty payload handling', () => {
    it('handles an empty vehicle list gracefully', async () => {
      vehicleService.getVehicleLocations.mockResolvedValue(makeResponse([]))
      await renderLiveMap()

      expect(screen.getByTestId('vehicle-count')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-active')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-idle')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-offline')).toHaveTextContent('0')
    })

    it('renders with zero counts when the response resolves to null', async () => {
      vehicleService.getVehicleLocations.mockResolvedValue(null)
      await renderLiveMap()

      expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
      expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    })

    it('stays at zero counts when a later poll also returns null', async () => {
      vehicleService.getVehicleLocations.mockResolvedValue(null)
      await renderLiveMap()

      await advancePoll(LOCATIONS_POLL_MS)
      expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
    })

    it('renders with zero counts when the response has no vehicles property', async () => {
      vehicleService.getVehicleLocations.mockResolvedValue({ timestamp: new Date().toISOString() })
      await renderLiveMap()

      await waitFor(() => {
        expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
        expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
        expect(screen.getByTestId('vehicle-count')).toHaveTextContent('0')
      })
    })

    it('renders with zero counts when vehicles is explicitly null', async () => {
      vehicleService.getVehicleLocations.mockResolvedValue({
        timestamp: new Date().toISOString(),
        vehicles: null,
      })
      await renderLiveMap()

      expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
      expect(screen.getByTestId('stat-total')).toHaveTextContent('0')
    })
  })
})//v2