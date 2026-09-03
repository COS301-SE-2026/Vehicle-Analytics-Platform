import { render, screen } from '@testing-library/react'
import MostActiveVehiclesTable from '../components/dashboard/MostActiveVehiclesTable'

const mockVehicles = [
  { id: 'VH-001', distanceToday: 120, status: 'ACTIVE', lastUpdate: new Date().toISOString() },
  { id: 'VH-002', distanceToday: 85, status: 'IDLE', lastUpdate: new Date(Date.now() - 60000).toISOString() },
  { id: 'VH-003', distanceToday: 40, status: 'OFFLINE', lastUpdate: new Date(Date.now() - 200000).toISOString() },
]

describe('MostActiveVehiclesTable', () => {
  test('renders heading', () => {
    render(<MostActiveVehiclesTable />)
    expect(screen.getByText('Most Active Vehicles Today')).toBeInTheDocument()
  })

  test('shows empty state when no vehicles', () => {
    render(<MostActiveVehiclesTable vehicles={[]} />)
    expect(screen.getByText('No vehicle data available')).toBeInTheDocument()
  })

  test('renders all vehicle rows', () => {
    render(<MostActiveVehiclesTable vehicles={mockVehicles} />)
    expect(screen.getByText('VH-001')).toBeInTheDocument()
    expect(screen.getByText('VH-002')).toBeInTheDocument()
    expect(screen.getByText('VH-003')).toBeInTheDocument()
  })

  test('renders correct rank numbers', () => {
    render(<MostActiveVehiclesTable vehicles={mockVehicles} />)
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('2.')).toBeInTheDocument()
    expect(screen.getByText('3.')).toBeInTheDocument()
  })

  test('renders distance with km unit', () => {
    render(<MostActiveVehiclesTable vehicles={mockVehicles} />)
    expect(screen.getByText('120 km')).toBeInTheDocument()
    expect(screen.getByText('85 km')).toBeInTheDocument()
  })

  test('renders correct status badges', () => {
    render(<MostActiveVehiclesTable vehicles={mockVehicles} />)
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('IDLE')).toBeInTheDocument()
    expect(screen.getByText('OFFLINE')).toBeInTheDocument()
  })

  test('shows hours when last update is older than 60 minutes', () => {
    const vehicles = [{ id: 'VH-010', distanceToday: 10, status: 'active', lastUpdate: new Date(Date.now() - (3 * 60 * 60 * 1000)).toISOString(), }, ]
    render(<MostActiveVehiclesTable vehicles={vehicles} />)
    expect(screen.getByText('3 hours ago')).toBeInTheDocument()
  })
})
