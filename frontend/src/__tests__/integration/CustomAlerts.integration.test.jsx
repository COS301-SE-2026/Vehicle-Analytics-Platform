import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import CustomAlerts from '@/pages/alerts/CustomAlerts'      // adjust path
import useAuthStore from '@/store/authStore'                // adjust path

jest.mock('axios')
jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: { getState: jest.fn() },
}))
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  },
}))



const fleetGroups = [{ id: 'fg-1', name: 'Test Fleet Group' }]

const alertRule = {
  id: 'rule-1',

  name: 'Highway Speeding',

  condition_type: 'speed_threshold',

  condition_params: { max_speed_kmh: 120 },

  fleet_group_id: 'fg-1',

  fleet_group_name: 'Test Fleet Group',

  status: 'active',

  is_active: true,
}

const triggeredAlert = {
  id: 'alert-1',

  vehicle_id: 'VH-001',

  condition_type: 'speed_threshold',

  breach_value: 140,

  threshold_value: 120,

  status: 'new',


  created_at: '2026-01-01T10:00:00Z',
}

function mockGetByUrl() {

  axios.get.mockImplementation((url) => {

    if(url.includes('/fleet-groups')) {
      return Promise.resolve({ data: { data: fleetGroups } })
    }


    if(url.includes('/custom-alerts/rules')) {
      return Promise.resolve({ data: { data: [alertRule] } })
    }


    if(url.includes('/alerts/triggered')) {
      return Promise.resolve({
        data: { data: { data: [triggeredAlert], pagination: { total: 1, hasMore: false } } },
      })
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`))

  })
}



describe('CustomAlerts page integration', () => {

  beforeEach(() => {

    jest.clearAllMocks()

    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })

    mockGetByUrl()
  })


  test('defaults to the Triggered Alerts tab and loads its data', async () => {

    render(<CustomAlerts />)

    expect(screen.getByTestId('custom-alerts-tab-triggered')).toHaveClass('border-fleet-blue')

    expect(screen.getByTestId('custom-alerts-tab-rules')).not.toHaveClass('border-fleet-blue')

    await waitFor(() => {
      expect(screen.getByText(/VH-001/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Alerts Rules')).not.toBeInTheDocument()
  })



  test('switching to Alert Rules tab shows rules and hides triggered alerts', async () => {

    const user = userEvent.setup()

    render(<CustomAlerts />)

    await waitFor(() => {

      expect(screen.getByText(/VH-001/)).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('custom-alerts-tab-rules'))

    expect(screen.getByTestId('custom-alerts-tab-rules')).toHaveClass('border-fleet-blue')

    expect(screen.getByTestId('custom-alerts-tab-triggered')).not.toHaveClass('border-fleet-blue')

    await waitFor(() => {
      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

  
    expect(screen.queryByText(/VH-001/)).not.toBeInTheDocument()
  })



  test('switching back to Triggered Alerts re-shows its data', async () => {

    const user = userEvent.setup()

    render(<CustomAlerts />)

    await waitFor(() => {

      expect(screen.getByText(/VH-001/)).toBeInTheDocument()

    })

    await user.click(screen.getByTestId('custom-alerts-tab-rules'))

    await waitFor(() => {
      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

    await user.click(screen.getByTestId('custom-alerts-tab-triggered'))

    await waitFor(() => {
      expect(screen.getByText(/VH-001/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Highway Speeding')).not.toBeInTheDocument()

  })



  test('each tab fetches its own data independently of the other', async () => {

    render(<CustomAlerts />)

    await waitFor(() => {
      expect(screen.getByText(/VH-001/)).toBeInTheDocument()
    })

 
    const rulesCalls = axios.get.mock.calls.filter(([url]) => url.includes('/custom-alerts/rules'))

    expect(rulesCalls).toHaveLength(0)

    const triggeredCalls = axios.get.mock.calls.filter(([url]) => url.includes('/alerts/triggered'))

    expect(triggeredCalls.length).toBeGreaterThan(0)
    
  })
})