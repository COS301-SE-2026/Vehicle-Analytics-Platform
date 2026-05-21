jest.mock('../components/dashboard/DonutChart', () => ({
  __esModule: true,
  default: (props) => (
    <div data-testid="donut-chart">
      {Object.entries(props).map(([k, v]) =>
        <span key={k} data-prop={k}>{String(v)}</span>
      )}
    </div>
  )
}))

import { render, screen } from '@testing-library/react'
import FleetStatusCard from '../components/dashboard/FleetStatusCard'

describe('FleetStatusCard', () => {
  test('renders DonutChart', () => {
    render(<FleetStatusCard active={10} idle={5} offline={2} total={17} />)
    expect(screen.getByTestId('donut-chart')).toBeInTheDocument()
  })

  test('passes active count to DonutChart', () => {
    render(<FleetStatusCard active={10} idle={5} offline={2} total={17} />)
    expect(screen.getByTestId('donut-chart').textContent).toContain('10')
  })
})