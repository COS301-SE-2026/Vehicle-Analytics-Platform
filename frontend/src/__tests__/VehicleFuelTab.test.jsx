import { render, screen, waitFor } from '@testing-library/react'
import VehicleFuelTab from '../components/vehicles/VehicleFuelTab'
import { getVehicleFuelStats } from '../services/fuelService'

jest.mock('../services/fuelService')

describe('VehicleFuelTab', () => {
  const mockVehicleData = {
    vehicle_id: '1000',
    summary: {
      total_distance: 365.54,
      total_fuel: 26.85,
      avg_efficiency: 12.68,
      trip_count: 6,
      road_breakdown: { motorway: 200, residential: 100 },
    },
    trips: [
      {
        trip_id: 1,
        trip_date: '2026-07-29T22:00:00.000Z',
        total_distance_km: '147.72',
        avg_speed_kmh: '90.00',
        estimated_fuel_consumed_liters: '11.08',
        fuel_efficiency_km_per_liter: '13.33',
        fuel_efficiency_l_per_100km: '7.50',
        road_breakdown: null,
      },
      {
        trip_id: 2,
        trip_date: '2026-07-29T22:00:00.000Z',
        total_distance_km: '16.34',
        avg_speed_kmh: '71.00',
        estimated_fuel_consumed_liters: '1.14',
        fuel_efficiency_km_per_liter: '14.29',
        fuel_efficiency_l_per_100km: '7.00',
        road_breakdown: null,
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders loading state initially', () => {
    getVehicleFuelStats.mockImplementation(() => new Promise(() => {}))
    render(<VehicleFuelTab vehicleId="1000" />)
    // Look for the spinner element instead of text
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  test('renders "No fuel data" message when no trips exist', async () => {
    getVehicleFuelStats.mockResolvedValue({
      ...mockVehicleData,
      trips: [],
      summary: { ...mockVehicleData.summary, trip_count: 0 },
    })
    render(<VehicleFuelTab vehicleId="1000" />)

    await waitFor(() => {
      expect(screen.getByText('No fuel data available for this vehicle')).toBeInTheDocument()
    })
  })

  test('renders vehicle fuel data when API call succeeds', async () => {
    getVehicleFuelStats.mockResolvedValue(mockVehicleData)
    render(<VehicleFuelTab vehicleId="1000" />)

    await waitFor(() => {
      expect(screen.getByText(/Vehicle 1000/)).toBeInTheDocument()
      expect(screen.getByText(/12.68/)).toBeInTheDocument()
      expect(screen.getAllByText(/366/).length).toBeGreaterThan(0)
      expect(screen.getByText(/27 L/)).toBeInTheDocument()
      expect(screen.getByText(/6 trips/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('renders trip list with correct data', async () => {
    getVehicleFuelStats.mockResolvedValue(mockVehicleData)
    render(<VehicleFuelTab vehicleId="1000" />)

    await waitFor(() => {
      expect(screen.getAllByText(/13.3/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/14.3/).length).toBeGreaterThan(0)
      expect(screen.getByText(/147.7/)).toBeInTheDocument()
      expect(screen.getByText(/16.3/)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  test('renders date filter dropdown', async () => {
    getVehicleFuelStats.mockResolvedValue(mockVehicleData)
    render(<VehicleFuelTab vehicleId="1000" />)

    await waitFor(() => {
      expect(screen.getByText('Show:')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('30')
  })

  test('handles API error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
    getVehicleFuelStats.mockRejectedValue(new Error('API Error'))
    render(<VehicleFuelTab vehicleId="1000" />)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to fetch fuel data:',
        expect.any(Error)
      )
    })
    consoleSpy.mockRestore()
  })
})