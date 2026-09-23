import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import AlertRulesTab from '@/components/alerts/AlertRulesTab'         
import useAuthStore from '@/store/authStore'                          

jest.mock('axios')

jest.mock('@/store/authStore', () => ({
  __esModule: true,
  default: { getState: jest.fn() },
}))


jest.mock('@/components/alerts/CreateRuleModal', () => (props) => (
  <div data-testid="create-rule-modal" data-open={String(props.isOpen)}>
    <button onClick={() => props.onCreated?.()}>Simulate Create</button>
  </div>
))

jest.mock('@/components/alerts/EditRuleModal', () => (props) => (

  <div
    data-testid="edit-rule-modal"
    data-open={String(props.isOpen)}
    data-rule-id={props.rule?.id ?? ''}
  >

    <button onClick={() => props.onUpdated?.()}>Simulate Update</button>

  </div>

))

jest.mock('@/components/alerts/DeleteRuleModal', () => (props) => (

  <div
    data-testid="delete-rule-modal"
    data-open={String(props.isOpen)}
    data-rule-id={props.rule?.id ?? ''}
  >

    <button onClick={() => props.onDeleted?.()}>Simulate Delete</button>

  </div>
))

const RULES_URL_MATCH = '/api/custom-alerts/rules'

const FLEET_GROUPS_URL_MATCH = '/api/fleet-groups'

const speedingRule = {
  id: 'rule-1',

  name: 'Highway Speeding',

  condition_type: 'speed_threshold',

  condition_params: {},

  fleet_group_name: 'Delivery Fleet',

  status: 'active',
}

const nightRule = {
  id: 'rule-2',

  name: 'Night Restriction',

  condition_type: 'time_based_restriction',

  condition_params: { start_time: '22:00', end_time: '05:00' },

  fleet_group_name: 'Long Haul',

  status: 'inactive',
}


function mockRulesSequence(...ruleLists) {
  let call = 0

  axios.get.mockImplementation((url) => {

    if(url.includes(RULES_URL_MATCH)) {

      const rules = ruleLists[Math.min(call, ruleLists.length - 1)]

      call += 1

      return Promise.resolve({ data: { data: rules } })
    }

    if(url.includes(FLEET_GROUPS_URL_MATCH)) {

      return Promise.resolve({ data: { data: [] } })
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`))
  })
}

async function renderTab() {

  render(<AlertRulesTab />)

  await waitFor(() => {

    expect(screen.queryByText('Loading rules...')).not.toBeInTheDocument()

  })
}

describe('AlertRulesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })
  })

  test('shows a loading state while fetching rules', () => {
    axios.get.mockImplementation(() => new Promise(() => {}))
    render(<AlertRulesTab />)
    expect(screen.getByText('Loading rules...')).toBeInTheDocument()
  })

  test('shows an empty state when there are no rules', async () => {
    mockRulesSequence([])
    await renderTab()
    expect(screen.getByText('No alert rules configured yet.')).toBeInTheDocument()
  })

  test('renders rule rows with formatted threshold and fleet group', async () => {
    mockRulesSequence([speedingRule, nightRule])
    await renderTab()

    expect(screen.getByText('Highway Speeding')).toBeInTheDocument()

    expect(screen.getByText('Speed Threshold')).toBeInTheDocument()

    expect(screen.getByText('Delivery Fleet')).toBeInTheDocument()

    expect(screen.getByText('Night Restriction')).toBeInTheDocument()

    expect(screen.getByText('Time Based Restriction')).toBeInTheDocument()

    expect(screen.getByText('22:00–05:00')).toBeInTheDocument()
  })


  test('shows a fallback dash when threshold params are missing', async () => {
    mockRulesSequence([speedingRule])

    await renderTab()

    const row = screen.getByText('Highway Speeding').closest('tr')

    expect(within(row).getByText('—')).toBeInTheDocument()
  })


  test('shows an error message when fetching rules fails', async () => {

    axios.get.mockImplementation((url) => {

      if(url.includes(RULES_URL_MATCH)) {

        return Promise.reject({ response: { data: { message: 'Network error' } } })
      }

      return Promise.resolve({ data: { data: [] } })

    })

    await renderTab()

    expect(screen.getByText('Failed to load alert rules: Network error')).toBeInTheDocument()
  })


  describe('status tag', () => {

    test('shows an "Active" tag for an active rule and an "Inactive" tag for an inactive rule', async () => {

      mockRulesSequence([speedingRule, nightRule])

      await renderTab()

      const activeRow = screen.getByText('Highway Speeding').closest('tr')

      const inactiveRow = screen.getByText('Night Restriction').closest('tr')

      expect(within(activeRow).getByText('Active')).toBeInTheDocument()

      expect(within(inactiveRow).getByText('Inactive')).toBeInTheDocument()
    })


    test('is not interactive: renders no button role and clicking it does nothing', async () => {

      mockRulesSequence([speedingRule])

      const user = userEvent.setup()

      await renderTab()

      const row = screen.getByText('Highway Speeding').closest('tr')

      const tag = within(row).getByText('Active')

      expect(screen.queryByRole('button', { name: /Active|Inactive/i })).not.toBeInTheDocument()

      await user.click(tag)

     
      expect(axios.patch).not.toHaveBeenCalled()
    
      expect(within(row).getByText('Active')).toBeInTheDocument()
    })

    test('updates automatically after editing the rule triggers a refetch', async () => {
     
      mockRulesSequence([speedingRule], [{ ...speedingRule, status: 'inactive' }])

      const user = userEvent.setup()

      await renderTab()

      const row = () => screen.getByText('Highway Speeding').closest('tr')

      expect(within(row()).getByText('Active')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Edit rule' }))

      await user.click(screen.getByText('Simulate Update'))

      await waitFor(() => {
        expect(within(row()).getByText('Inactive')).toBeInTheDocument()
      })

      expect(within(row()).queryByText('Active')).not.toBeInTheDocument()
    })
  })



  describe('row actions', () => {

    test('opens the create modal when "Create Alert Rules" is clicked', async () => {
      mockRulesSequence([])

      const user = userEvent.setup()

      await renderTab()

      expect(screen.getByTestId('create-rule-modal')).toHaveAttribute('data-open', 'false')

      await user.click(screen.getByRole('button', { name: /Create Alert Rules/i }))

      expect(screen.getByTestId('create-rule-modal')).toHaveAttribute('data-open', 'true')
    })

    test('opens the edit modal with the selected rule when the edit button is clicked', async () => {

      mockRulesSequence([speedingRule])

      const user = userEvent.setup()


      await renderTab()

      await user.click(screen.getByRole('button', { name: 'Edit rule' }))

      const editModal = screen.getByTestId('edit-rule-modal')

      expect(editModal).toHaveAttribute('data-open', 'true')

      expect(editModal).toHaveAttribute('data-rule-id', 'rule-1')
    })



    test('opens the delete modal with the selected rule when the delete button is clicked', async () => {

      mockRulesSequence([speedingRule])

      const user = userEvent.setup()

      await renderTab()

      await user.click(screen.getByRole('button', { name: 'Delete rule' }))

      const deleteModal = screen.getByTestId('delete-rule-modal')

      expect(deleteModal).toHaveAttribute('data-open', 'true')
      
      expect(deleteModal).toHaveAttribute('data-rule-id', 'rule-1')
    })
  })
})