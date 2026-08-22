
import { render, screen, waitFor } from '@testing-library/react'

import FuelKpiCard from '../components/dashboard/FuelKpiCard'


import { getFuelDashboard } from '../services/fuelService'



jest.mock('../services/fuelService')



describe('FuelKpiCard', () => {

  const mockData = {

    avg_fleet_efficiency_km_l: 12.5,

    total_fuel_consumed_liters: 25.5,

    total_distance_km: 320.0,

    vehicles_tracked: 5,

  }


  
  beforeEach(() => {
  
    jest.clearAllMocks()
  
  })


  
  test('renders loading state initially', () => {
  
    getFuelDashboard.mockImplementation(() => new Promise(() => {}))
  
    render(<FuelKpiCard />)
  
    const loadingElement = document.querySelector('.animate-pulse')
  
    expect(loadingElement).toBeInTheDocument()
  
  })


  
  test('renders fuel data when API call succeeds', async () => {
  
  
    getFuelDashboard.mockResolvedValue(mockData)
  
    render(<FuelKpiCard />)


    
    
    await waitFor(() => {
    
      expect(screen.getByText((content) => content.includes('12.5'))).toBeInTheDocument()
    
    })


    
    expect(screen.getByText('Fleet Average')).toBeInTheDocument()
    
    expect(screen.getByText((content) => content.includes('25.5'))).toBeInTheDocument()
    
    expect(screen.getByText((content) => content.includes('320'))).toBeInTheDocument()
    
    expect(screen.getByText('Excellent')).toBeInTheDocument()
  })



  
  test('renders "Good" rating for efficiency between 8-12', async () => {
  
    getFuelDashboard.mockResolvedValue({
  
      ...mockData,
  
      avg_fleet_efficiency_km_l: 10.0,
  
    })
  
    render(<FuelKpiCard />)


    
    await waitFor(() => {
    
      expect(screen.getByText('Good')).toBeInTheDocument()
    
    })
  })



  
  test('renders "Needs Improvement" for efficiency below 8', async () => {
  
    getFuelDashboard.mockResolvedValue({
  
      ...mockData,
  
      avg_fleet_efficiency_km_l: 6.0,
    })
  
    render(<FuelKpiCard />)


    
    await waitFor(() => {
    
    
      expect(screen.getByText('Needs Improvement')).toBeInTheDocument()
    
    })
  })




  
  test('handles API error gracefully', async () => {
  
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
  
    getFuelDashboard.mockRejectedValue(new Error('API Error'))
  
    render(<FuelKpiCard />)


    
    await waitFor(() => {
    
      expect(consoleSpy).toHaveBeenCalledWith(
    
        'Failed to fetch fuel data:',
    
        expect.any(Error)
    
      )
    
    })
    
    consoleSpy.mockRestore()
  })
  
})