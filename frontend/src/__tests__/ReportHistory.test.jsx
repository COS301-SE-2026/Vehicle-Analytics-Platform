import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ReportHistory from '../components/reports/ReportHistory'
import { listReportHistory, downloadStoredReportPdf } from '../services/reportServices'

jest.mock('../services/reportServices')

const ROWS = [
  { id: 11, scope: { label: 'Delivery' }, period: { type: 'monthly', fromDate: '2026-09-01', toDate: '2026-09-30' }, trigger: 'scheduled', generatedAt: '2026-09-30T22:30:00Z' },
  { id: 4, scope: { label: 'Assigned fleet' }, period: { type: 'weekly', fromDate: '2026-09-14', toDate: '2026-09-20' }, trigger: 'manual', generatedAt: '2026-09-22T10:00:00Z' },
]

beforeEach(() => {
  jest.clearAllMocks()
  listReportHistory.mockResolvedValue(ROWS)
  downloadStoredReportPdf.mockResolvedValue('file.pdf')
})

test('lists stored reports with type and source', async () => {
  render(<ReportHistory />)
  expect(screen.getByText(/Loading report history/)).toBeInTheDocument()
  expect(await screen.findByText('Delivery')).toBeInTheDocument()
  expect(screen.getByText('Monthly')).toBeInTheDocument()
  expect(screen.getByText('Weekly')).toBeInTheDocument()
  expect(screen.getByText('Automated', { selector: 'span' })).toBeInTheDocument()
  expect(listReportHistory).toHaveBeenCalledWith({ trigger: undefined })
})

test('filters by trigger source', async () => {
  const user = userEvent.setup()
  render(<ReportHistory />)
  await screen.findByText('Delivery')

  await user.click(screen.getByRole('button', { name: 'Automated' }))
  await waitFor(() => expect(listReportHistory).toHaveBeenLastCalledWith({ trigger: 'scheduled' }))
})

test('downloads a stored PDF by id', async () => {
  const user = userEvent.setup()
  render(<ReportHistory />)
  await screen.findByText('Delivery')

  await user.click(screen.getAllByRole('button', { name: /PDF/ })[0])
  await waitFor(() => expect(downloadStoredReportPdf).toHaveBeenCalledWith(11))
})

test('shows the empty state', async () => {
  listReportHistory.mockResolvedValue([])
  render(<ReportHistory />)
  expect(await screen.findByText(/No stored reports yet/)).toBeInTheDocument()
})

test('shows a load failure and recovers on refresh', async () => {
  const user = userEvent.setup()
  listReportHistory.mockRejectedValueOnce(new Error('Failed to load report history'))
  render(<ReportHistory />)
  expect(await screen.findByText('Failed to load report history')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /Refresh/ }))
  expect(await screen.findByText('Delivery')).toBeInTheDocument()
})

test('reloads when the parent saves a report', async () => {
  const { rerender } = render(<ReportHistory refreshKey={0} />)
  await screen.findByText('Delivery')
  rerender(<ReportHistory refreshKey={1} />)
  await waitFor(() => expect(listReportHistory).toHaveBeenCalledTimes(2))
})

test('View opens a stored report through the parent and marks the open row', async () => {
  const onView = jest.fn()
  const user = userEvent.setup()
  const { rerender } = render(<ReportHistory onView={onView} />)
  await screen.findByText('Delivery')

  await user.click(screen.getByRole('button', { name: 'View report 11' }))
  expect(onView).toHaveBeenCalledWith(11)

  rerender(<ReportHistory onView={onView} activeReportId={11} />)
  expect(screen.getByText('Delivery').closest('tr')).toHaveAttribute('aria-current', 'true')
  expect(screen.getByText('Assigned fleet').closest('tr')).not.toHaveAttribute('aria-current')
})

test('without an onView handler no View action is offered', async () => {
  render(<ReportHistory />)
  await screen.findByText('Delivery')
  expect(screen.queryByRole('button', { name: /View report/ })).not.toBeInTheDocument()
})
