import { render, screen } from '@testing-library/react'
import StatCard from '../components/dashboard/StatCard'
import { Car } from 'lucide-react'

describe('StatCard', () => {
  test('renders label and value', () => {
    render(<StatCard icon={Car} label="Total Vehicles" value={42} />)
    expect(screen.getByText('Total Vehicles')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  test('renders sub text when provided', () => {
    render(<StatCard icon={Car} label="Speed" value={120} sub="km/h" />)
    expect(screen.getByText('km/h')).toBeInTheDocument()
  })

  test('renders without sub text', () => {
    render(<StatCard icon={Car} label="Total" value={10} />)
    expect(screen.queryByText('km/h')).not.toBeInTheDocument()
  })

  test('renders the icon', () => {
    const { container } = render(<StatCard icon={Car} label="Total" value={5} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})