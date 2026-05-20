import React from 'react'
import { render, screen, act } from '@testing-library/react'
import '@testing-library/jest-dom'


jest.mock('@/components/map/FleetMap', () => ({
  __esModule: true,
  default: () => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'fleet-map' })
  },
}))

jest.mock('@/components/dashboard/LiveFleetMapPlaceholder', () =>
  function MockLiveFleetMapPlaceholder({ active, idle, offline, total, vehicles }) {
    return (
      <div data-testid="live-fleet-placeholder">
        <span data-testid="stat-active">{active}</span>
        <span data-testid="stat-idle">{idle}</span>
        <span data-testid="stat-offline">{offline}</span>
        <span data-testid="stat-total">{total}</span>
        <span data-testid="vehicle-count">{vehicles.length}</span>
      </div>
    )
  }
)

jest.mock('@/services/vehicleService', () => ({
  getVehicleLocations: jest.fn(),
}))

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import * as vehicleService from '@/services/vehicleService'
import LiveMap from '@/pages/map/LiveMap'

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderLiveMap = async () => {
  let utils
  await act(async () => {
    utils = render(<LiveMap />)
  })
  return utils
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('LiveMap', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    vehicleService.getVehicleLocations.mockResolvedValue(makeResponse())
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  // ── Initial render ────────────────────────────────────────────────────────

  describe('initial render', () => {
    it('shows a loading spinner before data arrives', () => {
      // Do NOT await — we want the in-flight state
      render(<LiveMap />)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('hides the loading spinner once data has loaded', async () => {
      await renderLiveMap()
      expect(document.querySelector('.animate-spin')).not.toBeInTheDocument()
    })

    it('renders the fleet-map placeholder after data loads', async () => {
      await renderLiveMap()
      expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
    })
  })

  // ── Data fetching ─────────────────────────────────────────────────────────

  describe('data fetching', () => {
    it('calls getVehicleLocations once on mount', async () => {
      await renderLiveMap()
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)
    })

    it('polls getVehicleLocations every 10 seconds', async () => {
      await renderLiveMap()
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)

      await act(async () => { jest.advanceTimersByTime(10_000) })
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(2)

      await act(async () => { jest.advanceTimersByTime(10_000) })
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(3)
    })

    it('stops polling after the component unmounts', async () => {
      const { unmount } = await renderLiveMap()
      unmount()

      await act(async () => { jest.advanceTimersByTime(30_000) })
      // Only the initial call; no further polls after unmount
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)
    })
  })

  // ── Stat counts ───────────────────────────────────────────────────────────

  describe('vehicle stat counts', () => {
    it('passes the full vehicle list to the placeholder', async () => {
      await renderLiveMap()
      expect(screen.getByTestId('vehicle-count')).toHaveTextContent(String(VEHICLES.length))
    })

    it('computes active count correctly', async () => {
      await renderLiveMap()
      expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
    })

    it('computes idle count correctly', async () => {
      await renderLiveMap()
      expect(screen.getByTestId('stat-idle')).toHaveTextContent('1')
    })

    it('computes offline count correctly', async () => {
      await renderLiveMap()
      expect(screen.getByTestId('stat-offline')).toHaveTextContent('1')
    })

    it('active + idle + offline equals total vehicle count', async () => {
      await renderLiveMap()
      const active  = Number(screen.getByTestId('stat-active').textContent)
      const idle    = Number(screen.getByTestId('stat-idle').textContent)
      const offline = Number(screen.getByTestId('stat-offline').textContent)
      expect(active + idle + offline).toBe(VEHICLES.length)
    })
  })

  // ── Polling updates ───────────────────────────────────────────────────────

  describe('polling updates', () => {
    it('updates counts when vehicle statuses change on the next poll', async () => {
      // Vehicle 1004 changes from offline → active
      const updatedVehicles = VEHICLES.map(v =>
        v.id === '1004' ? { ...v, status: 'active' } : v
      )

      vehicleService.getVehicleLocations
        .mockResolvedValueOnce(makeResponse())
        .mockResolvedValueOnce(makeResponse(updatedVehicles))

      await renderLiveMap()
      expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
      expect(screen.getByTestId('stat-offline')).toHaveTextContent('1')

      await act(async () => { jest.advanceTimersByTime(10_000) })
      expect(screen.getByTestId('stat-active')).toHaveTextContent('5')
      expect(screen.getByTestId('stat-offline')).toHaveTextContent('0')
    })

    it('retains previous data when a mid-poll request fails', async () => {
      vehicleService.getVehicleLocations
        .mockResolvedValueOnce(makeResponse())
        .mockRejectedValueOnce(new Error('Network error'))

      await renderLiveMap()
      expect(screen.getByTestId('stat-active')).toHaveTextContent('4')

      // Poll fails — UI must stay with last good data
      await act(async () => { jest.advanceTimersByTime(10_000) })
      expect(screen.getByTestId('stat-active')).toHaveTextContent('4')
      expect(screen.getByTestId('live-fleet-placeholder')).toBeInTheDocument()
    })
  })

  // ── Edge cases & error handling ───────────────────────────────────────────

  describe('error handling', () => {
    it('does not crash when the initial API call fails', async () => {
      vehicleService.getVehicleLocations.mockRejectedValue(new Error('Network error'))
      await expect(
        act(async () => { render(<LiveMap />) })
      ).resolves.not.toThrow()
    })

    it('renders without the placeholder when initial fetch fails', async () => {
      vehicleService.getVehicleLocations.mockRejectedValue(new Error('Network error'))
      await act(async () => { render(<LiveMap />) })
      expect(screen.queryByTestId('live-fleet-placeholder')).not.toBeInTheDocument()
    })

    it('handles an empty vehicle list gracefully', async () => {
      vehicleService.getVehicleLocations.mockResolvedValue(makeResponse([]))
      await renderLiveMap()
      expect(screen.getByTestId('vehicle-count')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-active')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-idle')).toHaveTextContent('0')
      expect(screen.getByTestId('stat-offline')).toHaveTextContent('0')
    })

    it('handles vehicles with unknown statuses without crashing', async () => {
      const weirdVehicles = [
        ...VEHICLES,
        { id: '9999', lat: -28.0, lng: 28.0, speed: 0, status: 'maintenance' },
      ]
      vehicleService.getVehicleLocations.mockResolvedValue(makeResponse(weirdVehicles))
      await expect(renderLiveMap()).resolves.not.toThrow()
      expect(screen.getByTestId('vehicle-count')).toHaveTextContent(String(weirdVehicles.length))
    })

    it('continues polling after a failed request', async () => {
      vehicleService.getVehicleLocations
        .mockResolvedValueOnce(makeResponse())
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce(makeResponse())

      await renderLiveMap()
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(1)

      await act(async () => { jest.advanceTimersByTime(10_000) }) // fails
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(2)

      await act(async () => { jest.advanceTimersByTime(10_000) }) // recovers
      expect(vehicleService.getVehicleLocations).toHaveBeenCalledTimes(3)
    })
  })
})