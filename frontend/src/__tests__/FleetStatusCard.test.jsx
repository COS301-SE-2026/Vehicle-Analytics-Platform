import { render } from '@testing-library/react'
import  FleetStatusCard  from '../components/dashboard/FleetStatusCard'

// Mock DonutChart since we're not testing chart rendering internals
jest.mock('../components/dashboard/DonutChart', () => ({
  default: ({ active, idle, offline, total }) => (
    <div data-testid="donut-chart"
      data-active={active}
      data-idle={idle}
      data-offline={offline}
      data-total={total}
    />
  )
}))

describe('FleetStatusCard', () => {
  test('renders DonutChart', () => {
    const { getByTestId } = render(
      <FleetStatusCard active={10} idle={5} offline={2} total={17} />
    )
    expect(getByTestId('donut-chart')).toBeInTheDocument()
  })

  test('passes correct props to DonutChart', () => {
    const { getByTestId } = render(
      <FleetStatusCard active={10} idle={5} offline={2} total={17} />
    )
    const chart = getByTestId('donut-chart')
    expect(chart).toHaveAttribute('data-active', '10')
    expect(chart).toHaveAttribute('data-idle', '5')
    expect(chart).toHaveAttribute('data-offline', '2')
    expect(chart).toHaveAttribute('data-total', '17')
  })
})