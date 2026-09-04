import {
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import CreateAlertRuleModal from '@/components/alerts/CreateRuleModal'     
import useAuthStore from '@/store/authStore'         
import { useToast } from '@/components/alerts/ToastProvider'               

jest.mock('axios')
jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: { getState: jest.fn() },
}))
jest.mock('@/components/alerts/ToastProvider', () => ({
  useToast: jest.fn(),
}))

const mockToast = { success: jest.fn(), error: jest.fn() }

const fleetGroups = [
  { id: 'fg-1', name: 'Delivery Fleet' },
  { id: 'fg-2', name: 'Long Haul' },
]

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

  test('renders with default empty form', () => {
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
    expect(screen.getByLabelText(/Speed Limit/i)).toHaveValue(null)
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

  test('resets the form fields on close', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'Draft Rule')
    expect(screen.getByLabelText(/Alert Name/i)).toHaveValue('Draft Rule')

    await user.click(screen.getByRole('button', { name: /Cancel/i }))

    // handleClose resets internal state before calling onClose
    expect(screen.getByLabelText(/Alert Name/i)).toHaveValue('')
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
    expect(screen.queryByLabelText(/Speed Limit/i)).not.toBeInTheDocument()

    await user.click(screen.getByText('Safety Score Drop'))
    expect(screen.getByLabelText(/Minimum Safety Score/i)).toBeInTheDocument()

    await user.click(screen.getByText('Repeated Unsafe Events'))
    expect(screen.getByLabelText(/Occurrences/i)).toBeInTheDocument()

    await user.click(screen.getByText('Trip Duration'))
    expect(screen.getByLabelText(/Max Trip Duration/i)).toBeInTheDocument()
  })

  test('clears params from the previous condition type when switching', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Speed Limit/i), '120')
    expect(screen.getByLabelText(/Speed Limit/i)).toHaveValue(120)

    await user.click(screen.getByText('Time Restriction'))
    await user.click(screen.getByText('Speed Threshold'))

    expect(screen.getByLabelText(/Speed Limit/i)).toHaveValue(null)
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

    expect(mon).not.toHaveClass('bg-fleet-blue')

    await user.click(mon)
    expect(mon).toHaveClass('bg-fleet-blue')

    await user.click(tue)
    expect(tue).toHaveClass('bg-fleet-blue')

    await user.click(mon)
    expect(mon).not.toHaveClass('bg-fleet-blue')
  })

  test('toggles event types', async () => {
    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.click(screen.getByText('Repeated Unsafe Events'))

    const harshBraking = screen.getByRole('button', { name: 'Harsh braking' })
    expect(harshBraking).not.toHaveClass('bg-fleet-blue')

    await user.click(harshBraking)
    expect(harshBraking).toHaveClass('bg-fleet-blue')
  })

  test('shows validation errors', async () => {
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

  test('shows fleet_group_id validation error when name is filled but group is not', async () => {
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
    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    expect(screen.getByText('fleet_group_id is required')).toBeInTheDocument()
    expect(axios.post).not.toHaveBeenCalled()
  })

  test('successfully creates a rule', async () => {
    axios.post.mockResolvedValue({
      data: { data: { id: 'rule-100', name: 'Highway Speeding' } },
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

    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalledWith(
      'Alert Rule Created Successfully.',
      'Your new rule is now active.'
    )
  })

  test('shows error + toast on API failure', async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: 'Name already exists' } },
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
      expect(screen.getByText('Name already exists')).toBeInTheDocument()
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

    await user.type(screen.getByLabelText(/Alert Name/i), 'Highway Speeding')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')
    await user.type(screen.getByLabelText(/Speed Limit/i), '120')

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))
    expect(screen.getByRole('button', { name: /Creating…/i })).toBeDisabled()
  })

  test('builds condition_params correctly for trip_duration_exceeded with only one field set', async () => {
    axios.post.mockResolvedValue({ data: { data: { id: 'rule-101' } } })

    const user = userEvent.setup()
    render(
      <CreateAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onCreated={onCreated}
        fleetGroups={fleetGroups}
      />
    )

    await user.type(screen.getByLabelText(/Alert Name/i), 'Long Trips')
    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-2')
    await user.click(screen.getByText('Trip Duration'))
    await user.type(screen.getByLabelText(/Max Trip Duration/i), '90')

    await user.click(screen.getByRole('button', { name: /Create Alert Rule/i }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/custom-alerts/rules'),
        {
          name: 'Long Trips',
          fleet_group_id: 'fg-2',
          condition_type: 'trip_duration_exceeded',
          condition_params: { max_trip_minutes: 90 },
        },
        { headers: { Authorization: 'Bearer fake-token' } }
      )
    })
  })
})