import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

jest.mock('@/components/map/FleetMap', () => ({
  __esModule: true,
  default: () => {
    const React = require('react')
    return React.createElement('div', { 'data-testid': 'fleet-map' })
  },
}))

jest.mock('@/components/dashboard/LiveFleetMapPlaceholder', () => {
  const PropTypes = require('prop-types')
  const MockLiveFleetMapPlaceholder = ({ active, idle, offline, total, vehicles }) => {
    return (
      <div data-testid="live-fleet-placeholder">
        <span data-testid="stat-active">{active}</span>
        <span data-testid="stat-idle">{idle}</span>
        <span data-testid="stat-offline">{offline}</span>
        <span data-testid="stat-total">{total}</span>
        <span data-testid="vehicle-count">{(vehicles ?? []).length}</span>
      </div>
    )
  }
  MockLiveFleetMapPlaceholder.propTypes = {
    active: PropTypes.number,
    idle: PropTypes.number,
    offline: PropTypes.number,
    total: PropTypes.number,
    vehicles: PropTypes.array,
  }
  return MockLiveFleetMapPlaceholder
})

jest.mock('@/services/vehicleService', () => ({
  getVehicleLocations: jest.fn(),
  getVehiclePositionBuffer: jest.fn(),
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
    utils = render(
      <MemoryRouter>
        <LiveMap />
      </MemoryRouter>
    )
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
    it('shows a loading spinner before data arrives', async () => {
      vehicleService.getVehicleLocations.mockImplementationOnce(() => new Promise(() => {}))
      vehicleService.getVehiclePositionBuffer.mockImplementationOnce(() => new Promise(() => {}))

      await act(async () => {
        render(
          <MemoryRouter>
            <LiveMap />
          </MemoryRouter>
        )
      })
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
  })



  // ── Stat counts ───────────────────────────────────────────────────────────

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
  })


})