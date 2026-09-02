import {
  render,
  screen,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import CustomAlerts from '@/pages/alerts/CustomAlerts' 


jest.mock('@/components/alerts/AlertRulesTab', () => {
  return function MockAlertRulesTab() {
    return <div data-testid="alert-rules-tab">Alert Rules Content</div>
  }
})

jest.mock('@/components/alerts/TriggeredAlertsTab', () => {
  return function MockTriggeredAlertsTab() {
    return <div data-testid="triggered-alerts-tab">Triggered Alerts Content</div>
  }
})

describe('CustomAlerts', () => {
  test('renders both tab buttons', () => {
    render(<CustomAlerts />)

    expect(screen.getByTestId('custom-alerts-tab-rules')).toBeInTheDocument()

    expect(screen.getByTestId('custom-alerts-tab-triggered')).toBeInTheDocument()

    expect(screen.getByText('Alert Rules')).toBeInTheDocument()

    expect(screen.getByText('Triggered Alerts')).toBeInTheDocument()
  })



  test('defaults to the "triggered" tab', () => {
    render(<CustomAlerts />)

    expect(screen.getByTestId('triggered-alerts-tab')).toBeInTheDocument()

    expect(screen.queryByTestId('alert-rules-tab')).not.toBeInTheDocument()
  })

  test('switches to the "rules" tab when clicked', async () => {
    const user = userEvent.setup()

    render(<CustomAlerts />)

    await user.click(screen.getByTestId('custom-alerts-tab-rules'))

    expect(screen.getByTestId('alert-rules-tab')).toBeInTheDocument()

    expect(screen.queryByTestId('triggered-alerts-tab')).not.toBeInTheDocument()
  })

  test('switches back to the "triggered" tab when clicked', async () => {
    const user = userEvent.setup()
    render(<CustomAlerts />)


    await user.click(screen.getByTestId('custom-alerts-tab-rules'))

    expect(screen.getByTestId('alert-rules-tab')).toBeInTheDocument()

   
    await user.click(screen.getByTestId('custom-alerts-tab-triggered'))

    expect(screen.getByTestId('triggered-alerts-tab')).toBeInTheDocument()

    expect(screen.queryByTestId('alert-rules-tab')).not.toBeInTheDocument()
  })

  test('applies active styles to the selected tab', async () => {
    const user = userEvent.setup()
    render(<CustomAlerts />)

    const rulesTab = screen.getByTestId('custom-alerts-tab-rules')

    const triggeredTab = screen.getByTestId('custom-alerts-tab-triggered')

  
    expect(triggeredTab).toHaveClass('border-fleet-blue', 'text-fleet-text')

    expect(rulesTab).toHaveClass('border-transparent', 'text-fleet-secondary')

   
    await user.click(rulesTab)
    expect(rulesTab).toHaveClass('border-fleet-blue', 'text-fleet-text')
    
    expect(triggeredTab).toHaveClass('border-transparent', 'text-fleet-secondary')
  })
})