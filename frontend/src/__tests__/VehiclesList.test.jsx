import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'

// --- Mocks -----------------------------------------------------------

jest.mock('@/services/vehicleService', () => ({
  getVehiclesList: jest.fn(),
}))

jest.mock('@/services/fleetGroupService', () => ({
  getMyFleetGroups: jest.fn().mockResolvedValue([]),
}))

// Capture what the page passes down to VehiclesTable so we can assert
// on the mapped `avgSafetyScore` field.
let capturedVehicles = null
jest.mock('@/components/vehicles/VehiclesTable', () => ({
  __esModule: true,
  default: ({ vehicles }) => {
    capturedVehicles = vehicles
    return <div data-testid="vehicles-table-mock" />
  },
}))

jest.mock('@/components/vehicles/VehicleSummaryCards', () => ({
  __esModule: true,
  default: () => <div data-testid="summary-cards-mock" />,
}))

jest.mock('@/components/vehicles/FleetGroupCards', () => ({
  __esModule: true,
  default: () => <div data-testid="fleet-group-cards-mock" />,
}))

jest.mock('@/components/vehicles/FleetvsFleetAnalytics', () => ({
  __esModule: true,
  default: () => <div data-testid="fleet-analytics-mock" />,
}))

// Admin role → not scoped → no group selection required
jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: () => ({ role: 'admin' }),
}))

// --- Imports (after mocks) -------------------------------------------

import VehiclesList from '@/pages/vehicles/VehiclesList'
import { getVehiclesList } from '@/services/vehicleService'

// --- Helper ----------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter>
      <VehiclesList />
    </MemoryRouter>
  )
}

// --- Tests -----------------------------------------------------------

describe('VehiclesList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    capturedVehicles = null
  })

  test('maps avg_safety_score from the API into avgSafetyScore', async () => {
    getVehiclesList.mockResolvedValue({
      vehicles: [
        {
          id: 'VH-001',
          status: 'moving',
          safety_score: 92,
          avg_safety_score: '88.5',
          has_alert: false,
          is_speeding: false,
          last_updated: new Date().toISOString(),
        },
        {
          id: 'VH-002',
          status: 'idle',
          safety_score: 74,
          avg_safety_score: null,
          has_alert: false,
          is_speeding: false,
          last_updated: new Date().toISOString(),
        },
      ],
      stats: { total: 2, moving: 1 },
      pagination: { page: 1, limit: 10, total: 2 },
    })

    renderPage()

    await waitFor(() => {
      expect(capturedVehicles).not.toBeNull()
    })

    expect(capturedVehicles).toHaveLength(2)
    expect(capturedVehicles[0].avgSafetyScore).toBe(88.5)
    expect(capturedVehicles[1].avgSafetyScore).toBeNull()
  })
})
