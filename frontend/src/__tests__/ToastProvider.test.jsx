import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import EditAlertRuleModal from '@/components/alerts/EditRuleModal' 
import CreateAlertRuleModal from '@/components/alerts/CreateRuleModal'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/alerts/ToastProvider'

jest.mock('axios')

jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
  },
}))

jest.mock('@/components/alerts/ToastProvider', () => ({
  useToast: jest.fn(),
}))

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  dismiss: jest.fn(),
}

const fleetGroups = [
  { id: 'fg-1', name: 'Delivery Fleet' },
  { id: 'fg-2', name: 'Long Haul' },
]

const baseRule = {
  id: 'rule-99',
  name: 'Highway Speeding',
  fleet_group_id: 'fg-1',
  condition_type: 'speed_threshold',
  condition_params: { max_speed_kmh: 120 },
  status: 'active',
}

describe('EditAlertRuleModal', () => {
  const onClose = jest.fn()
  const onUpdated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useToast.mockReturnValue(mockToast)
    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })
  })

  test('renders nothing when isOpen is false', () => {
    const { container } = render(
      <EditAlertRuleModal
        isOpen={false}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  test('seeds the form from the rule prop', () => {
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    expect(screen.getByText('Edit Custom Alert')).toBeInTheDocument()
    expect(screen.getByLabelText(/Alert Name/i)).toHaveValue('Highway Speeding')
    expect(screen.getByLabelText(/Fleet Group/i)).toHaveValue('fg-1')
    expect(screen.getByLabelText(/Speed Limit/i)).toHaveValue(120)
  })

  test('falls back to rule.rule_name when name is missing', () => {
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={{ ...baseRule, name: undefined, rule_name: 'Legacy Name' }}
        fleetGroups={fleetGroups}
      />
    )
    expect(screen.getByLabelText(/Alert Name/i)).toHaveValue('Legacy Name')
  })

  test('calls onClose from Cancel, X and backdrop', async () => {
    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    await user.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('does not close when clicking inside the modal', async () => {
    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByText('Edit Custom Alert'))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('switches condition type and shows the matching fields', async () => {
    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    expect(screen.getByLabelText(/Speed Limit/i)).toBeInTheDocument()

    await user.click(screen.getByText('Time Restriction'))
    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Speed Limit/i)).not.toBeInTheDocument()

    await user.click(screen.getByText('Safety Score Drop'))
    expect(screen.getByLabelText(/Minimum Safety Score/i)).toBeInTheDocument()
  })

  test('toggles restricted days', async () => {
    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={{
          ...baseRule,
          condition_type: 'time_based_restriction',
          condition_params: {
            start_time: '22:00',
            end_time: '06:00',
            restricted_days: ['Mon'],
          },
        }}
        fleetGroups={fleetGroups}
      />
    )

    const mon = screen.getByRole('button', { name: 'Mon' })
    const tue = screen.getByRole('button', { name: 'Tue' })

    expect(mon).toHaveClass('bg-fleet-blue')

    await user.click(tue)
    expect(tue).toHaveClass('bg-fleet-blue')

    await user.click(mon)
    expect(mon).not.toHaveClass('bg-fleet-blue')
  })

  test('toggles the active/inactive switch', async () => {
    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    const activeBtn = screen.getByRole('button', { name: 'Active' })
    const inactiveBtn = screen.getByRole('button', { name: 'Inactive' })

    expect(activeBtn).toHaveAttribute('aria-pressed', 'true')
    expect(inactiveBtn).toHaveAttribute('aria-pressed', 'false')

    await user.click(inactiveBtn)

    expect(inactiveBtn).toHaveAttribute('aria-pressed', 'true')
    expect(activeBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('shows validation errors', async () => {
    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={{ ...baseRule, name: '', fleet_group_id: '' }}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByRole('button', { name: /Save Changes/i }))
    expect(screen.getByText('name is required')).toBeInTheDocument()
    expect(axios.put).not.toHaveBeenCalled()
  })

  test('successfully updates a rule', async () => {
    axios.put.mockResolvedValue({
      data: { data: { id: 'rule-99', name: 'Updated Name' } },
    })

    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    await user.clear(screen.getByLabelText(/Alert Name/i))
    await user.type(screen.getByLabelText(/Alert Name/i), 'Updated Name')
    await user.clear(screen.getByLabelText(/Speed Limit/i))
    await user.type(screen.getByLabelText(/Speed Limit/i), '100')

    await user.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/api/custom-alerts/rules/rule-99'),
        {
          name: 'Updated Name',
          fleet_group_id: 'fg-1',
          condition_type: 'speed_threshold',
          condition_params: { max_speed_kmh: 100 },
          status: 'active',
        },
        { headers: { Authorization: 'Bearer fake-token' } }
      )
    })

    expect(onUpdated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith(
      'Alert Rule Updated Successfully.',
      'Changes to "Updated Name" have been saved.'
    )
  })

  test('shows error + toast on API failure', async () => {
    axios.put.mockRejectedValue({
      response: { data: { message: 'Name already exists' } },
    })

    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {
      expect(screen.getByText('Name already exists')).toBeInTheDocument()
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to Update Rule.',
      'Please check your connection and try again.'
    )
    expect(onUpdated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('shows Saving… and disables the button while submitting', async () => {
    axios.put.mockImplementation(() => new Promise(() => {}))

    const user = userEvent.setup()
    render(
      <EditAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onUpdated={onUpdated}
        rule={baseRule}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByRole('button', { name: /Save Changes/i }))
    expect(screen.getByRole('button', { name: /Saving…/i })).toBeDisabled()
  })
})


describe('CreateAlertRuleModal', () => {
  const onClose = jest.fn()
  const onCreated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useToast.mockReturnValue(mockToast)
    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })
  })

  test('renders nothing when isOpen is false', () => {
    const { container } = render(
      <CreateAlertRuleModal
        isOpen={false}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  test('renders the create modal with default condition', () => {
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    expect(screen.getByText('Create New Custom Alert')).toBeInTheDocument()
    expect(screen.getByLabelText(/Alert Name/i)).toHaveValue('')
    expect(screen.getByLabelText(/Fleet Group/i)).toHaveValue('')
    expect(screen.getByLabelText(/Speed Limit/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create Alert Rule/i })).toBeInTheDocument()
  })

  test('calls onClose from Cancel, X and backdrop', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)

    onClose.mockClear()
    await user.click(screen.getByRole('presentation'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('does not close when clicking inside the modal', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByText('Create New Custom Alert'))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('switches condition type and shows the matching fields', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

   
    expect(screen.getByLabelText(/Speed Limit/i)).toBeInTheDocument()

    await user.click(screen.getByText('Time Restriction'))
    expect(screen.getByLabelText(/Start Time/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/End Time/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Speed Limit/i)).not.toBeInTheDocument()

    await user.click(screen.getByText('Safety Score Drop'))
    expect(screen.getByLabelText(/Minimum Safety Score/i)).toBeInTheDocument()

    await user.click(screen.getByText('Repeated Unsafe Events'))
    expect(screen.getByLabelText(/Occurrences/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Within \(minutes\)/i)).toBeInTheDocument()
  })

  test('toggles restricted days', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByText('Time Restriction'))

    const mon = screen.getByRole('button', { name: 'Mon' })
    const tue = screen.getByRole('button', { name: 'Tue' })

    await user.click(mon)
    expect(mon).toHaveClass('bg-fleet-blue')

    await user.click(tue)
    expect(tue).toHaveClass('bg-fleet-blue')

    await user.click(mon) // deselect
    expect(mon).not.toHaveClass('bg-fleet-blue')
  })

  test('shows validation errors for missing required fields', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    expect(screen.getByText('name is required')).toBeInTheDocument()
    expect(axios.post).not.toHaveBeenCalled()
  })

  test('shows fleet_group_id required error', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'Test Rule')
    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    expect(screen.getByText('fleet_group_id is required')).toBeInTheDocument()
    expect(axios.post).not.toHaveBeenCalled()
  })

  test('successfully creates a rule', async () => {
    axios.post.mockResolvedValue({
      data: { data: { id: 'new-rule-1', name: 'Highway Speeding' } },
    })

    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'Highway Speeding')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')
    await user.type(screen.getByLabelText(/Speed Limit/i), '120')

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/custom-alerts/rules'),
        {
          name: 'Highway Speeding',
          fleet_group_id: 'fg-1',
          condition_type: 'speed_threshold',
          condition_params: { max_speed_kmh: 120 },
        },
        { headers: { Authorization: 'Bearer fake-token' } }
      )
    })

    expect(onCreated).toHaveBeenCalledWith({ id: 'new-rule-1', name: 'Highway Speeding' })
    expect(onClose).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith(
      'Alert Rule Created Successfully.',
      'Your new rule is now active.'
    )
  })

  test('sends empty headers when no token is present', async () => {
    useAuthStore.getState.mockReturnValue({ token: null })
    axios.post.mockResolvedValue({ data: { data: {} } })

    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'No Auth Rule')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')
    await user.type(screen.getByLabelText(/Speed Limit/i), '80')

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { headers: {} }
      )
    })
  })

  test('shows error + toast when create fails', async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: 'Name already taken' } },
    })

    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'Duplicate')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')
    await user.type(screen.getByLabelText(/Speed Limit/i), '100')

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    await waitFor(() => {
      expect(screen.getByText('Name already taken')).toBeInTheDocument()
    })

    expect(mockToast.error).toHaveBeenCalledWith(
      'Failed to Create Rule.',
      'Please check your connection and try again.'
    )
    expect(onCreated).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  test('shows Creating… and disables the button while submitting', async () => {
    axios.post.mockImplementation(() => new Promise(() => {}))

    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'Loading Test')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')
    await user.type(screen.getByLabelText(/Speed Limit/i), '90')

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    expect(screen.getByRole('button', { name: /Creating…/i })).toBeDisabled()
  })

  test('builds correct payload for time_based_restriction', async () => {
    axios.post.mockResolvedValue({ data: { data: {} } })


    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByText('Time Restriction'))
    await user.type(screen.getByLabelText(/Alert Name/i), 'Night Ban')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-2')
    await user.type(screen.getByLabelText(/Start Time/i), '22:00')
    await user.type(screen.getByLabelText(/End Time/i), '06:00')
    await user.click(screen.getByRole('button', { name: 'Mon' }))
    await user.click(screen.getByRole('button', { name: 'Tue' }))

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          condition_type: 'time_based_restriction',
          condition_params: {
            start_time: '22:00',
            end_time: '06:00',
            restricted_days: ['Mon', 'Tue'],
          },
        }),
        expect.any(Object)
      )
    })
  })
})