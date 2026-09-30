import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))



const mockGetSimilarVehicles = jest.fn()
jest.mock('@/services/riskService', () => ({
  __esModule: true,
  getSimilarVehicles: (...args) => mockGetSimilarVehicles(...args),
}))



jest.mock('@/components/risk/RiskBadge', () => ({
  __esModule: true,
  default: ({ tier, score }) => (
    <span data-testid="risk-badge" data-tier={tier}>{score}</span>
  ),
}))

import SimilarVehiclesPanel from '@/components/risk/SimilarVehiclesPanel'

const sampleNeighbours = [
  { vehicle_id: 'V001', risk_score: 88, risk_tier: 'critical', distance: 3.27, features: {} },
  { vehicle_id: 'V002', risk_score: 87, risk_tier: 'critical', distance: 5.43, features: {} },
  { vehicle_id: 'V003', risk_score: 55, risk_tier: 'high',     distance: 12.1, features: {} },
  { vehicle_id: 'V004', risk_score: 40, risk_tier: 'medium',   distance: 21.9, features: {} },
  { vehicle_id: 'V005', risk_score: 20, risk_tier: 'low',      distance: 30.5, features: {} },
]

describe('SimilarVehiclesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('loading state', () => {
    test('shows the loading message initially', () => {
      mockGetSimilarVehicles.mockReturnValue(new Promise(() => {})) // never resolves
      render(<SimilarVehiclesPanel vehicleId="1000" />)
      expect(screen.getByText(/Finding similar vehicles/i)).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    test('shows an empty state when no similar vehicles exist', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce([])
      render(<SimilarVehiclesPanel vehicleId="1000" />)
      await waitFor(() => {
        expect(screen.getByText(/No similar vehicles found/i)).toBeInTheDocument()
      })
    })
  })

  describe('loaded state', () => {
    test('renders a row per similar vehicle', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })

      expect(screen.getByText('V002')).toBeInTheDocument()
      expect(screen.getByText('V003')).toBeInTheDocument()
      expect(screen.getByText('V004')).toBeInTheDocument()
      expect(screen.getByText('V005')).toBeInTheDocument()
    })

    test('renders the panel heading and subtitle', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getByText('Similar Vehicles')).toBeInTheDocument()
      })
      expect(screen.getByText(/Nearest neighbours/i)).toBeInTheDocument()
    })

    test('shows distance for each neighbour', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getByText(/distance 3.27/)).toBeInTheDocument()
      })
      expect(screen.getByText(/distance 5.43/)).toBeInTheDocument()
      expect(screen.getByText(/distance 30.5/)).toBeInTheDocument()
    })

    test('renders a RiskBadge for each neighbour with a tier', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getAllByTestId('risk-badge')).toHaveLength(5)
      })

      const badges = screen.getAllByTestId('risk-badge')
      expect(badges[0]).toHaveAttribute('data-tier', 'critical')
      expect(badges[2]).toHaveAttribute('data-tier', 'high')
      expect(badges[4]).toHaveAttribute('data-tier', 'low')
    })

    test('calls getSimilarVehicles with the vehicle id and default k=5', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1012" />)

      await waitFor(() => {
        expect(mockGetSimilarVehicles).toHaveBeenCalledWith('1012', 5)
      })
    })
  })

  describe('interaction', () => {
    test('clicking a neighbour navigates to /risk with that vehicle focused', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('V001'))
      expect(mockNavigate).toHaveBeenCalledWith('/risk?focus=V001')
    })

    test('clicking a different neighbour navigates to that specific vehicle', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce(sampleNeighbours)
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getByText('V003')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('V003'))
      expect(mockNavigate).toHaveBeenCalledWith('/risk?focus=V003')
    })
  })

  describe('error handling', () => {
    test('does not throw when the service rejects', async () => {
      mockGetSimilarVehicles.mockRejectedValueOnce(new Error('boom'))
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
       
        
        expect(screen.getByText(/No similar vehicles found/i)).toBeInTheDocument()
      })
    })

    test('handles vehicles without a risk tier (shows "no prediction")', async () => {
      mockGetSimilarVehicles.mockResolvedValueOnce([
        { vehicle_id: 'V999', risk_score: null, risk_tier: null, distance: 2.0, features: {} },
      ])
      render(<SimilarVehiclesPanel vehicleId="1000" />)

      await waitFor(() => {
        expect(screen.getByText('V999')).toBeInTheDocument()
      })
   
      
      expect(screen.queryByTestId('risk-badge')).not.toBeInTheDocument()
    })
  })
})
