import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

import axios from 'axios'
import DeleteAlertRuleModal from '@/components/alerts/DeleteRuleModal'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/alerts/ToastProvider' 

jest.mock('axios')

jest.mock('../store/authStore', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
  },
}))

jest.mock('../components/alerts/ToastProvider', () => ({

  useToast: jest.fn(),

}))

const mockToast = {
  success: jest.fn(),

  error: jest.fn(),
}

const baseRule = {
  id: 'rule-123',

  rule_name: 'Speeding Alert',
}

describe('DeleteAlertRuleModal', () => {
  const onClose = jest.fn()


  const onDeleted = jest.fn()

  beforeEach(() => {

    jest.clearAllMocks()

    useToast.mockReturnValue(mockToast)

    useAuthStore.getState.mockReturnValue({ token: 'fake-token' })
  })

  test('renders nothing when isOpen is false', () => {

    const { container } = render(

      <DeleteAlertRuleModal
        isOpen={false}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    expect(container).toBeEmptyDOMElement()
  })

  test('renders modal content when isOpen is true', () => {
    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    expect(screen.getByText('Delete Alert Rule')).toBeInTheDocument()

    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()

    expect(screen.getByText('Speeding Alert')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /Delete Rule/i })).toBeInTheDocument()
  })

  test('falls back to rule.name when rule_name is missing', () => {

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={{ id: 'rule-456', name: 'Harsh Braking' }}
      />

    )

    expect(screen.getByText('Harsh Braking')).toBeInTheDocument()
  })

  test('falls back to "this rule" when no name is present', () => {

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={{ id: 'rule-789' }}
      />

    )

    expect(screen.getByText('this rule')).toBeInTheDocument()
  })



  test('calls onClose when Cancel button is clicked', async () => {

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    await user.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })


  test('calls onClose when the X button is clicked', async () => {

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    await user.click(screen.getByLabelText('Close'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })


  test('calls onClose when backdrop is clicked', async () => {


    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    await user.click(screen.getByRole('presentation'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('does not call onClose when the modal content is clicked', async () => {

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

   
    await user.click(screen.getByText('Delete Alert Rule'))

    expect(onClose).not.toHaveBeenCalled()
  })

  test('calls onClose when Escape key is pressed', () => {

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })


  test('does not close while submitting (Cancel / backdrop)', async () => {

  axios.delete.mockImplementation(() => new Promise(() => {}))

  const user = userEvent.setup()

  render(

    <DeleteAlertRuleModal
      isOpen={true}
      onClose={onClose}
      onDeleted={onDeleted}
      rule={baseRule}
    />

  )

  await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

 
  await user.click(screen.getByRole('button', { name: /Cancel/i }))

  await user.click(screen.getByRole('presentation'))

  expect(onClose).not.toHaveBeenCalled()
})

  test('shows "Deleting…" and disables buttons while submitting', async () => {

    axios.delete.mockImplementation(() => new Promise(() => {}))

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />


    )

    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    expect(screen.getByRole('button', { name: /Deleting…/i })).toBeDisabled()

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled()
  })


  test('successfully deletes a rule', async () => {

    axios.delete.mockResolvedValue({})

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    await waitFor(() => {

      expect(axios.delete).toHaveBeenCalledWith(


        expect.stringContaining('/api/custom-alerts/rules/rule-123'),

        {
          headers: { Authorization: 'Bearer fake-token' },
        }

      )
    })

    expect(onDeleted).toHaveBeenCalledWith('rule-123')

    expect(onClose).toHaveBeenCalledTimes(1)

    expect(mockToast.success).toHaveBeenCalledWith(

      'Alert Rule Deleted Successfully.',

      '"Speeding Alert" has been removed.'
    )
  })

  test('sends empty headers when no token is present', async () => {

    useAuthStore.getState.mockReturnValue({ token: null })

    axios.delete.mockResolvedValue({})

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    await waitFor(() => {


      expect(axios.delete).toHaveBeenCalledWith(


        expect.stringContaining('/api/custom-alerts/rules/rule-123'),

        { headers: {} }
      )
    })
  })

  test('shows error and toast when delete fails', async () => {

    axios.delete.mockRejectedValue({

      response: { data: { message: 'Rule is locked' } },

    })

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />
    )

    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    await waitFor(() => {

      expect(screen.getByText('Rule is locked')).toBeInTheDocument()

    })

    expect(mockToast.error).toHaveBeenCalledWith(

      'Failed to Delete Rule.',
      'Please check your connection and try again.'
    )

    expect(onDeleted).not.toHaveBeenCalled()

    expect(onClose).not.toHaveBeenCalled()
  })


  test('falls back to err.message when response.data.message is missing', async () => {

    axios.delete.mockRejectedValue(new Error('Network Error'))

    const user = userEvent.setup()


    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    await waitFor(() => {

      expect(screen.getByText('Network Error')).toBeInTheDocument()

    })
  })

  test('sets error when rule has no id', async () => {

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={{ rule_name: 'No ID Rule' }}
      />

    )

    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    expect(screen.getByText('missing rule id')).toBeInTheDocument()

    expect(axios.delete).not.toHaveBeenCalled()
  })

  test('clears previous error when starting a new delete attempt', async () => {
   
    axios.delete

      .mockRejectedValueOnce({ response: { data: { message: 'First error' } } })

      .mockResolvedValueOnce({})

    const user = userEvent.setup()

    render(

      <DeleteAlertRuleModal
        isOpen={true}
        onClose={onClose}
        onDeleted={onDeleted}
        rule={baseRule}
      />

    )

   
    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    await waitFor(() => {


      expect(screen.getByText('First error')).toBeInTheDocument()


    })

    
    await user.click(screen.getByRole('button', { name: /Delete Rule/i }))

    await waitFor(() => {

      expect(screen.queryByText('First error')).not.toBeInTheDocument()
      
    })
  })
})