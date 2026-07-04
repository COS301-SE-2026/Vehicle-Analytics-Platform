//import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock the map component
jest.mock('../components/dashboard/LiveFleetMapPlaceholder', () => ({
  __esModule: true,
  default: () => <div data-testid="map-placeholder">Live Fleet Map</div>
}))

// Mock services
jest.mock('../services/vehicleService', () => ({
  getKPIs: jest.fn(),
  getVehicleLocations: jest.fn(),
}))

// Mock all dashboard components
jest.mock('../components/dashboard/StatCard', () => ({ __esModule: true, default: ({ label }) => <div>{label}</div> }))
jest.mock('../components/dashboard/FleetStatusCard', () => ({ __esModule: true, default: () => <div>FleetStatusCard</div> }))
jest.mock('../components/dashboard/MostActiveVehiclesTable', () => ({ __esModule: true, default: () => <div>MostActiveVehiclesTable</div> }))
jest.mock('../components/dashboard/RecentVehicleEvents', () => ({ __esModule: true, default: () => <div>RecentVehicleEvents</div> }))
jest.mock('../components/dashboard/FleetActivityChart', () => ({ __esModule: true, default: () => <div>FleetActivityChart</div> }))
jest.mock('../components/dashboard/DataFeedStatusCard', () => ({ __esModule: true, default: () => <div>DataFeedStatusCard</div> }))
jest.mock('../components/dashboard/DonutChart', () => ({ __esModule: true, default: () => <div>DonutChart</div> }))
jest.mock('lucide-react', () => ({
  Truck: () => <svg />,
  Waypoints: () => <svg />,
  Activity: () => <svg />,
  RefreshCw: () => <svg data-testid="spinner" />,
}))

import ViewerDashboard from '../pages/dashboard/ViewerDashboard'
const { getKPIs, getVehicleLocations } = require('../services/vehicleService')

const mockKpis = { 
  activeVehicles: 5, 
  totalVehicles: 10, 
  totalDistance: 320 
}

const mockLocations = {
  vehicles: [
    { id: 'VH-001', status: 'active', distanceToday: 120 },
    { id: 'VH-002', status: 'idle', distanceToday: 80 },
  ]
}

beforeEach(() => {
  jest.clearAllMocks()
  getKPIs.mockResolvedValue(mockKpis)
  getVehicleLocations.mockResolvedValue(mockLocations)
})

describe('ViewerDashboard', () => {
  test('shows loading spinner initially', () => {
    render(<ViewerDashboard />)
    expect(screen.getByTestId('spinner')).toBeInTheDocument()
  })

  test('renders dashboard after loading', async () => { 
      render(<ViewerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Active Vehicles')).toBeInTheDocument()
    })
  })

  test('displays no data message when KPIs are null', async () => {
    getKPIs.mockResolvedValue(null)
    getVehicleLocations.mockResolvedValue(null)
    render(<ViewerDashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  test('displays error message on API failure', async () => {
    getKPIs.mockRejectedValue(new Error('API Error'))
    getVehicleLocations.mockRejectedValue(new Error('API Error'))
    render(<ViewerDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
    })
  })
})
