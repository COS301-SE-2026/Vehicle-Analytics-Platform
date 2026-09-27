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
})