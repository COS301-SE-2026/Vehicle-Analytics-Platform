import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import TriggeredAlertsTab from '@/components/alerts/TriggeredAlertsTab'
import useAuthStore from '@/store/authStore'

jest.mock('axios')
jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: { getState: jest.fn() },
}))


jest.mock('@/components/ui/select', () => ({
  __esModule: true,
  Select: ({ value, onValueChange, children }) => (
    <select
      data-testid="condition-select"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ value, children }) => <option value={value}>{children}</option>,
}))

function mockAlertsResponse(data = [], pagination = { total: data.length, hasMore: false }) {
  return { data: { data: { data, pagination } } }
}

const baseAlert = {
  id: 'alert-1',
  vehicle_id: 'VH-100',
  condition_type: 'speed_threshold',
  breach_value: 140,
  threshold_value: 120,
  status: 'new',
  created_at: '2024-01-01T10:00:00Z',
  latitude: -25.7479,
  longitude: 28.2293,
}

const BREACH_TEXT = 'Vehicle VH-100 exceeded 120 km/h (recorded 140 km/h)'

// The component hides resolved alerts older than RESOLVED_WINDOW_HOURS (48),
// so anything meant to stay on screen needs a timestamp inside that window.
const hoursAgo = (h) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString()

describe('TriggeredAlertsTab', () => {

  beforeEach(() => {

    jest.clearAllMocks()

    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })
  })

  test('shows loading state, then renders fetched alerts', async () => {

    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))

    render(<TriggeredAlertsTab />)

    expect(screen.getByText('Loading alerts...')).toBeInTheDocument()

    await waitFor(() => {

      expect(screen.getByText(BREACH_TEXT)).toBeInTheDocument()

    })

    expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument()
  })



  test('fetches alerts with auth header and base params', async () => {
    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))

    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/alerts/triggered'),
        expect.objectContaining({
          params: expect.objectContaining({ limit: 10, offset: 0, resolved_within_hours: 48 }),
          headers: { Authorization: 'Bearer fake-token' },
        })
      )
    })
  })

  test('shows empty state when no alerts are returned', async () => {
    axios.get.mockResolvedValue(mockAlertsResponse([]))

    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByText('No alerts match these filters.')).toBeInTheDocument()
    })
  })

  test('shows an error message when the alerts fetch fails (response payload)', async () => {
    axios.get.mockRejectedValue({ response: { data: { message: 'Server unavailable' } } })

    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByText('Server unavailable')).toBeInTheDocument()
    })
    expect(screen.getByText('No alerts match these filters.')).toBeInTheDocument()
  })

  test('falls back to err.message when no response payload is present', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'))

    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByText('Network Error')).toBeInTheDocument()
    })
  })

  describe('formatBreach branches', () => {
    test('speed_threshold', async () => {
      axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(screen.getByText(BREACH_TEXT)).toBeInTheDocument()
      })
    })

    test('time_based_restriction', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          { ...baseAlert, id: 'a2', condition_type: 'time_based_restriction' },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(
          screen.getByText('Vehicle VH-100 active outside permitted window')
        ).toBeInTheDocument()
      })
    })

    test('repeated_unsafe_events reads event types and window from the rule snapshot', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a3',
            condition_type: 'repeated_unsafe_events',
            breach_value: 5,
            threshold_value: 3,
            rule_snapshot: {
              condition_params: { event_types: ['harsh_braking'], window_minutes: 30 },
            },
          },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(
          screen.getByText(/Vehicle VH-100 recorded 5 .* events in 30 min - rule fires at 3/)
        ).toBeInTheDocument()
      })
    })

    test('repeated_unsafe_events parses a rule snapshot supplied as a JSON string', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a3b',
            condition_type: 'repeated_unsafe_events',
            breach_value: 5,
            threshold_value: 3,
            rule_snapshot: JSON.stringify({
              condition_params: { event_types: ['harsh_braking'], window_minutes: 30 },
            }),
          },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(screen.getByText(/recorded 5 .* events in 30 min/)).toBeInTheDocument()
      })
    })

    test('repeated_unsafe_events omits the window when there is no rule snapshot', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a3c',
            condition_type: 'repeated_unsafe_events',
            breach_value: 5,
            threshold_value: 3,
          },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(screen.getByText(/recorded 5 .* events - rule fires at 3/)).toBeInTheDocument()
      })
      expect(screen.queryByText(/ in \d+ min/)).not.toBeInTheDocument()
    })

    test('safety_score_drop', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a4',
            condition_type: 'safety_score_drop',
            breach_value: 62,
            threshold_value: 70,
          },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(
          screen.getByText('Vehicle VH-100 safety score dropped to 62 (min 70)')
        ).toBeInTheDocument()
      })
    })

    test('trip_duration_exceeded', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a5',
            condition_type: 'trip_duration_exceeded',
            breach_value: 190,
            threshold_value: 120,
          },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(
          screen.getByText('Vehicle VH-100 trip duration 190 min (limit 120 min)')
        ).toBeInTheDocument()
      })
    })

    test('unknown condition_type falls back to the default breach text and raw label', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a6',
            condition_type: 'some_unmapped_type',
            breach_value: 9,
            threshold_value: 4,
          },
        ])
      )
      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(screen.getByText('some_unmapped_type')).toBeInTheDocument()
      })
      expect(screen.getByText('Vehicle VH-100: 9 vs 4')).toBeInTheDocument()
    })

    test('default branch falls back to em dashes when breach/threshold are missing', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          {
            ...baseAlert,
            id: 'a7',
            condition_type: 'some_unmapped_type',
            breach_value: undefined,
            threshold_value: undefined,
          },
        ])
      )

      render(<TriggeredAlertsTab />)
      await waitFor(() => {
        expect(screen.getByText('Vehicle VH-100: — vs —')).toBeInTheDocument()
      })
    })
  })

  test('renders the location line when latitude/longitude are present', async () => {
    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))
    render(<TriggeredAlertsTab />)
    await waitFor(() => {
      expect(screen.getByText('-25.7479, 28.2293')).toBeInTheDocument()
    })
  })

  test('hides the location line when latitude/longitude are absent', async () => {
    axios.get.mockResolvedValue(
      mockAlertsResponse([{ ...baseAlert, latitude: null, longitude: null }])
    )
    render(<TriggeredAlertsTab />)
    await waitFor(() => {
      expect(screen.getByText('Speed Threshold')).toBeInTheDocument()
    })
    expect(screen.queryByText(/-25\.7479/)).not.toBeInTheDocument()
  })

  test('clicking a status tab refetches with the corresponding status param', async () => {
    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))
    const user = userEvent.setup()
    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByText('Speed Threshold')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'New' }))

    await waitFor(() => {
      expect(axios.get).toHaveBeenLastCalledWith(
        expect.stringContaining('/api/alerts/triggered'),
        expect.objectContaining({
          params: expect.objectContaining({ status: 'new' }),
        })
      )
    })
  })

  test('does not include a status param for the "All" tab', async () => {
    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))
    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      const lastCall = axios.get.mock.calls[axios.get.mock.calls.length - 1]
      expect(lastCall[1].params.status).toBeUndefined()
    })
  })

  test('selecting a condition type refetches with the condition_type param', async () => {

    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))

    const user = userEvent.setup()

    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByText('Speed Threshold')).toBeInTheDocument()
    })

    await user.selectOptions(
      screen.getByTestId('condition-select'),
      'safety_score_drop'
    )

    await waitFor(() => {
      expect(axios.get).toHaveBeenLastCalledWith(


        expect.stringContaining('/api/alerts/triggered'),

        expect.objectContaining({

          params: expect.objectContaining({ condition_type: 'safety_score_drop' }),
        })
      )
    })
  })

  test('typing a vehicle ID refetches with the vehicle_id param', async () => {
    axios.get.mockResolvedValue(mockAlertsResponse([baseAlert]))
    const user = userEvent.setup()
    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByText('Speed Threshold')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('Search Vehicle ID...'), 'VH-1')

    await waitFor(() => {


      expect(axios.get).toHaveBeenLastCalledWith(

        expect.stringContaining('/api/alerts/triggered'),

        expect.objectContaining({
          params: expect.objectContaining({ vehicle_id: 'VH-1' }),
        })
      )
    })
  })

  describe('status-driven card rendering', () => {
    test('a "new" alert shows only the Acknowledge button enabled', async () => {

      axios.get.mockResolvedValue(mockAlertsResponse([{ ...baseAlert, status: 'new' }]))

      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(BREACH_TEXT)).toBeInTheDocument()
      })

      const card = screen.getByText(BREACH_TEXT).closest('div')

      expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeEnabled()

      expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled()


      expect(within(card).queryByText(/Acknowledged/)).not.toBeInTheDocument()

      expect(within(card).queryByText(/Resolved/)).not.toBeInTheDocument()
    })

    test('an "acknowledged" alert shows the badge and enables Resolve only', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          { ...baseAlert, status: 'acknowledged', acknowledged_at: '2024-01-01T11:00:00Z' },
        ])
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(BREACH_TEXT)).toBeInTheDocument()
      })

      const card = screen.getByText(BREACH_TEXT).closest('div')

      expect(within(card).getByText(/Acknowledged/)).toBeInTheDocument()

      expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeDisabled()


      expect(screen.getByRole('button', { name: 'Resolve' })).toBeEnabled()
    })

    test('a "resolved" alert shows the badge and hides both action buttons', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          { ...baseAlert, status: 'resolved', resolved_at: hoursAgo(1) },
        ])
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(BREACH_TEXT)).toBeInTheDocument()
      })

      const card = screen.getByText(BREACH_TEXT).closest('div')

      expect(within(card).getByText(/Resolved/)).toBeInTheDocument()

      expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument()

      expect(screen.queryByRole('button', { name: 'Resolve' })).not.toBeInTheDocument()
    })
  })

  describe('resolved-alert expiry window', () => {
    test('hides a resolved alert once it is older than the 48 hour window', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([{ ...baseAlert, status: 'resolved', resolved_at: hoursAgo(49) }])
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument()
      })

      expect(screen.queryByText(BREACH_TEXT)).not.toBeInTheDocument()
    })

    test('shows the expired-page message instead of the generic empty state', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([{ ...baseAlert, status: 'resolved', resolved_at: hoursAgo(72) }])
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(/resolved more than 48 hours ago/i)).toBeInTheDocument()
      })

      expect(screen.queryByText('No alerts match these filters.')).not.toBeInTheDocument()
    })

    test('falls back to updated_at when resolved_at is missing', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([
          { ...baseAlert, status: 'resolved', resolved_at: null, updated_at: hoursAgo(72) },
        ])
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.queryByText('Loading alerts...')).not.toBeInTheDocument()
      })

      expect(screen.queryByText(BREACH_TEXT)).not.toBeInTheDocument()
    })

    test('keeps a resolved alert with no timestamps at all', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([{ ...baseAlert, status: 'resolved', resolved_at: null }])
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(BREACH_TEXT)).toBeInTheDocument()
      })
    })
  })

  describe('pagination', () => {
    test('shows the visible-of-total count', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([baseAlert], { total: 37, hasMore: true })
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 37/)).toBeInTheDocument()
      })
    })

    test('notes how many resolved alerts were hidden', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse(
          [
            baseAlert,
            { ...baseAlert, id: 'alert-2', status: 'resolved', resolved_at: hoursAgo(72) },
          ],
          { total: 2, hasMore: false }
        )
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByText(/1 resolved over 48h ago hidden/)).toBeInTheDocument()
      })
    })

    test('disables Previous on the first page and Next when there is no more data', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([baseAlert], { total: 1, hasMore: false })
      )
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Previous/i })).toBeDisabled()
      })
      expect(screen.getByRole('button', { name: /Next/i })).toBeDisabled()
    })

    test('Next advances the offset and refetches', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([baseAlert], { total: 25, hasMore: true })
      )
      const user = userEvent.setup()
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /Next/i }))

      await waitFor(() => {
        expect(axios.get).toHaveBeenLastCalledWith(
          expect.stringContaining('/api/alerts/triggered'),
          expect.objectContaining({
            params: expect.objectContaining({ offset: 10 }),
          })
        )
      })

      expect(screen.getByRole('button', { name: /Previous/i })).toBeEnabled()
    })

    test('changing a filter resets the offset back to zero', async () => {
      axios.get.mockResolvedValue(
        mockAlertsResponse([baseAlert], { total: 25, hasMore: true })
      )
      const user = userEvent.setup()
      render(<TriggeredAlertsTab />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeEnabled()
      })

      await user.click(screen.getByRole('button', { name: /Next/i }))

      await waitFor(() => {
        const lastCall = axios.get.mock.calls[axios.get.mock.calls.length - 1]
        expect(lastCall[1].params.offset).toBe(10)
      })

      await user.click(screen.getByRole('button', { name: 'New' }))

      await waitFor(() => {
        const lastCall = axios.get.mock.calls[axios.get.mock.calls.length - 1]
        expect(lastCall[1].params.offset).toBe(0)
      })
    })
  })

  test('resolving an alert PUTs to the resolve endpoint and refetches', async () => {
    axios.get.mockResolvedValue(
      mockAlertsResponse([{ ...baseAlert, status: 'acknowledged' }])
    )
    axios.put.mockResolvedValue({ data: {} })

    const user = userEvent.setup()
    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resolve' })).toBeEnabled()
    })

    const callsBefore = axios.get.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Resolve' }))

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/alerts/triggered/alert-1/resolve'),
        {},
        { headers: { Authorization: 'Bearer fake-token' } }
      )
    })
    await waitFor(() => {
      expect(axios.get.mock.calls.length).toBeGreaterThan(callsBefore)
    })
  })

  test('falls back to err.message if resolving fails with no response payload', async () => {
    axios.get.mockResolvedValue(
      mockAlertsResponse([{ ...baseAlert, status: 'acknowledged' }])
    )
    axios.put.mockRejectedValue(new Error('Timeout'))

    const user = userEvent.setup()
    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Resolve' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Resolve' }))

    await waitFor(() => {
      expect(screen.getByText('Timeout')).toBeInTheDocument()
    })
  })

  test('disables both action buttons on the alert being actioned while in flight', async () => {

    axios.get.mockResolvedValue(mockAlertsResponse([{ ...baseAlert, status: 'new' }]))

    axios.put.mockImplementation(() => new Promise(() => {}))

    const user = userEvent.setup()
    render(<TriggeredAlertsTab />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: 'Acknowledge' }))

    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeDisabled()

    expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled()
  })
})