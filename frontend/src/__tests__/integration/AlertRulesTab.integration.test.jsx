import {
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import { toast as sonnerToast } from 'sonner'
import AlertRulesTab from '@/components/alerts/AlertRulesTab'   
import useAuthStore from '@/store/authStore'                    

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



const fleetGroups = [
  { id: 'fg-1', name: 'Test Fleet Group' },

  { id: 'fg-2', name: 'Long Haul' },
]

const speedRule = {

  id: 'rule-1',

  name: 'Highway Speeding',

  condition_type: 'speed_threshold',

  condition_params: { max_speed_kmh: 120 },

  fleet_group_id: 'fg-1',

  fleet_group_name: 'Test Fleet Group',

  status: 'active',

  is_active: true,
}

function mockGet({ rules = [speedRule], groups = fleetGroups } = {}) {

  axios.get.mockImplementation((url) => {
    if(url.includes('/fleet-groups')) {
      return Promise.resolve({ data: { data: groups } })
    }


    if(url.includes('/custom-alerts/rules')) {
      return Promise.resolve({ data: { data: rules } })
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`))

  })
}



describe('AlertRulesTab integration', () => {

  beforeEach(() => {
    jest.clearAllMocks()

    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })
  })



  test('creating a rule end-to-end updates the table and shows a success toast', async () => {

    const user = userEvent.setup()

    mockGet({ rules: [] })

    axios.post.mockResolvedValue({
      data: {
        data: { id: 'rule-2', name: 'Highway Speeding', condition_type: 'speed_threshold' },
      },

    })

    render(<AlertRulesTab />)

    await waitFor(() => {

      expect(screen.getByText('No alert rules configured yet.')).toBeInTheDocument()

    })

    await user.click(screen.getByRole('button', { name: /Create Alert Rules/i }))

    expect(screen.getByText('Create New Custom Alert')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Alert Name/i), 'Highway Speeding')

    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')

    await user.type(screen.getByLabelText(/Speed Limit/i), '120')

    mockGet({ rules: [speedRule] })

   
    await user.click(screen.getByRole('button', { name: 'Create Alert Rule' }))

    await waitFor(() => {

      expect(axios.post).toHaveBeenCalledWith(

        expect.stringContaining('/api/custom-alerts/rules'),

        expect.objectContaining({
          name: 'Highway Speeding',

          fleet_group_id: 'fg-1',

          condition_type: 'speed_threshold',

          condition_params: { max_speed_kmh: 120 },
        }),

        expect.anything()
      )
    })

    await waitFor(() => {

      expect(screen.queryByText('Create New Custom Alert')).not.toBeInTheDocument()

      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

    expect(sonnerToast.success).toHaveBeenCalledWith(

      'Alert Rule Created Successfully.',

      expect.objectContaining({ description: 'Your new rule is now active.' })
    )
  })



  test('shows an error toast and keeps the modal open when create fails', async () => {

    const user = userEvent.setup()

    mockGet({ rules: [] })

    axios.post.mockRejectedValue({
      response: { data: { message: 'Name already exists' } },
    })

    render(<AlertRulesTab />)

    await waitFor(() => {
      expect(screen.getByText('No alert rules configured yet.')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Create Alert Rules/i }))

    await user.type(screen.getByLabelText(/Alert Name/i), 'Highway Speeding')

    await user.selectOptions(screen.getByLabelText(/Fleet Group/i), 'fg-1')

    await user.type(screen.getByLabelText(/Speed Limit/i), '120')

    await user.click(screen.getByRole('button', { name: 'Create Alert Rule' }))

    await waitFor(() => {
      expect(screen.getByText('Name already exists')).toBeInTheDocument()
    })

  
    expect(screen.getByText('Create New Custom Alert')).toBeInTheDocument()

    expect(sonnerToast.error).toHaveBeenCalledWith(

      'Failed to Create Rule.',

      expect.objectContaining({ description: 'Please check your connection and try again.' })
    )
  })



  test('editing a rule end-to-end updates the table, flips the status tag, and shows a success toast', async () => {

    const user = userEvent.setup()

    mockGet()

    axios.put.mockResolvedValue({
      data: { data: { id: 'rule-1', name: 'Updated Highway Rule' } },
    })

    render(<AlertRulesTab />)

    await waitFor(() => {
      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

    const row = () => screen.getByText(/Highway Speeding|Updated Highway Rule/).closest('tr')

    // status tag reflects the rule's current data before any edit
    expect(within(row()).getByText('Active')).toBeInTheDocument()

    await user.click(within(row()).getByRole('button', { name: /Edit rule/i }))

    expect(screen.getByText('Edit Custom Alert')).toBeInTheDocument()

    expect(screen.getByLabelText(/Alert Name/i)).toHaveValue('Highway Speeding')

    expect(screen.getByLabelText(/Speed Limit/i)).toHaveValue(120)

    await user.clear(screen.getByLabelText(/Alert Name/i))

    await user.type(screen.getByLabelText(/Alert Name/i), 'Updated Highway Rule')

   
    await user.click(screen.getByRole('button', { name: 'Inactive' }))

    const updatedRule = { ...speedRule, name: 'Updated Highway Rule', is_active: false, status: 'inactive' }

    mockGet({ rules: [updatedRule] })

    await user.click(screen.getByRole('button', { name: /Save Changes/i }))

    await waitFor(() => {

      expect(axios.put).toHaveBeenCalledWith(

        expect.stringContaining('/api/custom-alerts/rules/rule-1'),

        expect.objectContaining({
          name: 'Updated Highway Rule',

          status: 'inactive',
        }),

        expect.anything()
      )
    })

    await waitFor(() => {
      expect(screen.queryByText('Edit Custom Alert')).not.toBeInTheDocument()

      expect(screen.getByText('Updated Highway Rule')).toBeInTheDocument()
    })

    // the status tag picks up the new state purely from the refetch -
    // there's no separate toggle action involved
    expect(within(row()).getByText('Inactive')).toBeInTheDocument()
    expect(within(row()).queryByText('Active')).not.toBeInTheDocument()

    expect(sonnerToast.success).toHaveBeenCalledWith(
      'Alert Rule Updated Successfully.',

      expect.objectContaining({
        description: 'Changes to "Updated Highway Rule" have been saved.',
      })

    )
  })



  test('deleting a rule end-to-end removes it from the table and shows a success toast', async () => {

    const user = userEvent.setup()

    mockGet()

    axios.delete.mockResolvedValue({ data: {} })

    render(<AlertRulesTab />)

    await waitFor(() => {
      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

    const row = screen.getByText('Highway Speeding').closest('tr')

    await user.click(within(row).getByRole('button', { name: 'Delete rule' }))

  
    const dialog = screen.getByRole('presentation')

    expect(within(dialog).getByText('Delete Alert Rule')).toBeInTheDocument()

    expect(within(dialog).getByText('Highway Speeding', { exact: false })).toBeInTheDocument()

    mockGet({ rules: [] })

    await user.click(within(dialog).getByRole('button', { name: 'Delete Rule' }))

    await waitFor(() => {

      expect(axios.delete).toHaveBeenCalledWith(

        expect.stringContaining('/api/custom-alerts/rules/rule-1'),

        expect.anything()
      )
    })

    await waitFor(() => {

      expect(screen.queryByText('Delete Alert Rule')).not.toBeInTheDocument()

      expect(screen.getByText('No alert rules configured yet.')).toBeInTheDocument()

    })

    expect(sonnerToast.success).toHaveBeenCalledWith(

      'Alert Rule Deleted Successfully.',

      expect.objectContaining({ description: '"Highway Speeding" has been removed.' })

    )
  })


  test('shows an error toast and keeps the row when delete fails', async () => {

    const user = userEvent.setup()

    mockGet()

    axios.delete.mockRejectedValue({
      response: { data: { message: 'Rule is referenced elsewhere' } },
    })

    render(<AlertRulesTab />)

    await waitFor(() => {
      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

    const row = screen.getByText('Highway Speeding').closest('tr')

    await user.click(within(row).getByRole('button', { name: 'Delete rule' }))

    const dialog = screen.getByRole('presentation')

    await user.click(within(dialog).getByRole('button', { name: 'Delete Rule' }))

    await waitFor(() => {
      expect(screen.getByText('Rule is referenced elsewhere')).toBeInTheDocument()
    })

   
    expect(within(dialog).getByText('Delete Alert Rule')).toBeInTheDocument()

    expect(sonnerToast.error).toHaveBeenCalledWith(

      'Failed to Delete Rule.',

      expect.objectContaining({ description: 'Please check your connection and try again.' })
    )
  })



  test('the status tag on the table is read-only and never calls the status endpoint', async () => {

    const user = userEvent.setup()

    mockGet()

    render(<AlertRulesTab />)


    await waitFor(() => {
      expect(screen.getByText('Highway Speeding')).toBeInTheDocument()
    })

    const row = screen.getByText('Highway Speeding').closest('tr')

    const statusTag = within(row).getByText('Active')

    // it's a status indicator, not a control
    expect(within(row).queryByRole('button', { name: /Active|Inactive/i })).not.toBeInTheDocument()

    await user.click(statusTag)

    expect(axios.patch).not.toHaveBeenCalled()
    expect(within(row).getByText('Active')).toBeInTheDocument()
  })
  
})