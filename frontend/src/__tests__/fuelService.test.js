// Mock the auth store BEFORE importing the service
jest.mock('../store/authStore', () => ({
  __esModule: true,
  default: { getState: jest.fn(() => ({ token: 'mock-token' })) },
}))

import authStore from '../store/authStore'
import {
  getVehicleFuelStats,
  getFleetFuelSummary,
  getFuelDashboard,
  calculateTripFuel,
} from '../services/fuelService'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('fuelService', () => {
  const API_BASE_URL = 'http://localhost:5000'

  beforeEach(() => {
    jest.clearAllMocks()
    authStore.getState.mockReturnValue({ token: 'mock-token' })
  })

  test('getVehicleFuelStats makes correct API call', async () => {
    const mockData = { vehicle_id: '1000', summary: {}, trips: [] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const result = await getVehicleFuelStats('1000', 30)

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/fuel/vehicle/1000?days=30`,
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
      })
    )
    expect(result).toEqual(mockData)
  })

  test('getFleetFuelSummary makes correct API call', async () => {
    const mockData = { period: 'week', fleet_total: {}, vehicles: [] }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const result = await getFleetFuelSummary('week')

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/fuel/fleet?period=week`,
      expect.any(Object)
    )
    expect(result).toEqual(mockData)
  })

  test('getFuelDashboard makes correct API call', async () => {
    const mockData = { avg_fleet_efficiency_km_l: 12.5 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const result = await getFuelDashboard()

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/fuel/dashboard`,
      expect.any(Object)
    )
    expect(result).toEqual(mockData)
  })

  test('calculateTripFuel makes correct API call', async () => {
    const mockData = { trip_id: '123', total_distance: 100 }
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: mockData }),
    })

    const result = await calculateTripFuel('123')

    expect(mockFetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/fuel/calculate/trip/123`,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer mock-token',
        },
      })
    )
    expect(result).toEqual(mockData)
  })

  test('throws error when API call fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(getFuelDashboard()).rejects.toThrow('Failed to fetch fuel dashboard')
  })
})