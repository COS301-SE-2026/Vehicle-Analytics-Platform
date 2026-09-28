import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockNavigate = jest.fn()
let mockSearchParams = new URLSearchParams()

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    mockSearchParams,
    (next) => {
     
      
      if (next instanceof URLSearchParams) {
        mockSearchParams = new URLSearchParams(next.toString())
      } else if (typeof next === 'string') {
        mockSearchParams = new URLSearchParams(next)
      } else if (next && typeof next === 'object') {
        const params = new URLSearchParams()
        Object.entries(next).forEach(([k, v]) => params.set(k, v))
        mockSearchParams = params
      }
    },
  ],
}))



const mockGetFleetRisk = jest.fn()
jest.mock('@/services/riskService', () => ({
  __esModule: true,
  getFleetRisk: (...args) => mockGetFleetRisk(...args),
}))



jest.mock('@/components/risk/RiskBadge', () => ({
  __esModule: true,
  default: ({ tier, score }) => (
    <span data-testid="risk-badge" data-tier={tier}>{score}</span>
  ),
}))



jest.mock('@/components/risk/Sparkline', () => ({
  __esModule: true,
  default: ({ tier }) => <span data-testid="sparkline" data-tier={tier} />,
}))



jest.mock('@/components/risk/RiskModal', () => ({
  __esModule: true,
  default: ({ vehicleId, onClose }) => (
    <div data-testid="risk-modal" data-vehicle={vehicleId}>
      <button onClick={onClose} data-testid="modal-close">Close</button>
    </div>
  ),
}))




jest.mock('@/hooks/useLivePulse', () => ({
  __esModule: true,
  default: () => ({ label: 'just now', refetchDue: false }),
}))

import FleetRiskPage from '@/pages/risk/FleetRiskPage'

function makeVehicles(count = 3) {
  const tiers = ['critical', 'high', 'medium', 'low']
  return Array.from({ length: count }, (_, i) => ({
    vehicle_id: `V${String(i + 1).padStart(3, '0')}`,
    risk_score: 100 - i * 10,
    risk_tier: tiers[i % tiers.length],
    top_factors: [{ name: 'Distance (30d, km)', weight: 5, value: 100 }],
    trend: [],
    prediction_date: '2026-09-24',
  }))
}

describe('FleetRiskPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchParams = new URLSearchParams()
  })

  describe('loading state', () => {
    test('shows a spinner initially', () => {
      mockGetFleetRisk.mockReturnValue(new Promise(() => {}))
      const { container } = render(<FleetRiskPage />)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    test('shows an error message when the service rejects', async () => {
      mockGetFleetRisk.mockRejectedValueOnce(new Error('boom'))
      render(<FleetRiskPage />)
      await waitFor(() => {
        expect(screen.getByText(/Failed to load fleet risk/i)).toBeInTheDocument()
      })
    })
  })

  describe('loaded state', () => {
    test('renders the page heading and subtitle', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('Fleet Risk Forecast')).toBeInTheDocument()
      })
      expect(screen.getByText(/Predicted risk for every vehicle/i)).toBeInTheDocument()
    })

    test('renders a row for every vehicle returned', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })
      expect(screen.getByText('V002')).toBeInTheDocument()
      expect(screen.getByText('V003')).toBeInTheDocument()
    })

    test('shows a RiskBadge for each vehicle', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getAllByTestId('risk-badge')).toHaveLength(3)
      })
    })

    test('shows the top factor for each vehicle', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        const factors = screen.getAllByText('Distance (30d, km)')
        expect(factors.length).toBe(3)
      })
    })

    test('renders the live indicator and Refresh/Export buttons', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText(/Live/i)).toBeInTheDocument()
      })
      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument()
    })

    test('vehicles are ranked descending by risk score', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })
      const rows = screen.getAllByRole('row')
      const dataRows = rows.slice(1)
      expect(dataRows[0].textContent).toContain('V001')
      expect(dataRows[1].textContent).toContain('V002')
      expect(dataRows[2].textContent).toContain('V003')
    })
  })

  describe('tier summary cards', () => {
    test('renders all four tier cards', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(4))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('Critical')).toBeInTheDocument()
      })
      expect(screen.getByText('High')).toBeInTheDocument()
      expect(screen.getByText('Medium')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    test('clicking a tier card filters the table', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(4))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })

      const lowCard = screen.getByText('Low').closest('button')
      fireEvent.click(lowCard)

      await waitFor(() => {
        expect(screen.getByText('V004')).toBeInTheDocument()
      })
    })
  })

  describe('action buttons', () => {
    test('View risk button opens the modal', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(1))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })

      const buttons = screen.getAllByRole('button')
      const viewRiskBtn = buttons.find((b) =>
        b.getAttribute('aria-label')?.startsWith('View predictive risk')
      )
      fireEvent.click(viewRiskBtn)

      expect(screen.getByTestId('risk-modal')).toHaveAttribute('data-vehicle', 'V001')
    })

    test('See on map button navigates to /map with focus param', async () => {
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(1))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText('V001')).toBeInTheDocument()
      })

      const buttons = screen.getAllByRole('button')
      const mapBtn = buttons.find((b) =>
        b.getAttribute('aria-label')?.startsWith('See vehicle')
      )
      fireEvent.click(mapBtn)

      expect(mockNavigate).toHaveBeenCalledWith('/map?focus=V001')
    })
  })

  describe('focus URL param', () => {
    test('opens the modal when ?focus=<id> is in the URL', async () => {
      mockSearchParams = new URLSearchParams('focus=V002')
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByTestId('risk-modal')).toHaveAttribute('data-vehicle', 'V002')
      })
    })

    test('closing the focus modal clears it', async () => {
      mockSearchParams = new URLSearchParams('focus=V001')
      mockGetFleetRisk.mockResolvedValueOnce(makeVehicles(3))
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByTestId('risk-modal')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTestId('modal-close'))
      await waitFor(() => {
        expect(screen.queryByTestId('risk-modal')).not.toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    test('renders empty table message when there are no vehicles', async () => {
      mockGetFleetRisk.mockResolvedValueOnce([])
      render(<FleetRiskPage />)

      await waitFor(() => {
        expect(screen.getByText(/No vehicles match this filter/i)).toBeInTheDocument()
      })
    })
  })
})
