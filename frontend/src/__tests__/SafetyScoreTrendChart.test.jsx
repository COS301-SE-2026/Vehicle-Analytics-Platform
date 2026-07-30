import {
    render,
    screen,
    fireEvent,
    cleanup
} from '@testing-library/react'

import '@testing-library/jest-dom'


import SafetyScoreTrendChart from '@/components/vehicles/SafetyScoreTrendChart'

import { getScoreSeverity } from '@/utils/safetyScore'

afterEach(cleanup)

jest.mock('@/utils/safetyScore', () => ({
    getScoreSeverity: jest.fn(),
}))

jest.mock('@/components/ui/popover', () => ({
    Popover: ({ children }) => <div>{children}</div>,
    PopoverTrigger: ({ children }) => <div>{children}</div>,
    PopoverContent: ({ children }) => <div data-testid="popover-content">{children}</div>,
}))

jest.mock('@/components/ui/calendar', () => ({
    Calendar: ({ mode}) => <div data-testid="calendar" data-mode={mode} />,
}))

//recharts invokes tool tip on hover so This is to allow control over the exact props that get passed into Custom tool tip
let mockTooltipProps = null

jest.mock('recharts', () => {
    const {cloneElement} = require('react')
    return {
    ResponsiveContainer: ({ children}) => <div data-testid="responsive-container">{children}</div>,
    LineChart: ({children, data}) => (
        <div data-testid="line-chart" data-points={data.length}>
            {children}
        </div>
    ),
    Line: () => <div data-testid="line" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: ({content}) =>
        mockTooltipProps ? <div data-testid="tooltip-wrapper">{cloneElement(content, mockTooltipProps)}</div> : null,
}
})

const baseSeverity = {
    label: 'Good',
    textClass: 'text-fleet-green',
    bgClass: 'bg-fleet-green-bg',
    barClass: 'bg-fleet-green',
}

const today = new Date()
const isoToday = today.toISOString().slice(0,10)
const isoOldDate = '2020-01-01'

const dailyScores = [
    {date: isoToday, score: 85},
    {date: isoOldDate, score: 40},
]

const trips = [
    {date: isoToday, routeLabel: 'Depot Run', safetyScore: 91},
    {date: isoOldDate, routeLabel: 'Old Run', safetyScore: 60},
]

describe('SafetyScoreTrendChart', () =>{
    beforeEach(() => {
        jest.clearAllMocks()
        mockTooltipProps = null
        getScoreSeverity.mockReturnValue(baseSeverity)
    })

    test('renders empty state when no data in range', () => {
        render(<SafetyScoreTrendChart dailyScores={[]} trips={[]} />)
        expect(screen.getByText('No safety score data available')).toBeInTheDocument()
    })


    test('renders the chart with day-view data within the default date range', () => {
        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)
        expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '1')
    })

    test('switches to trip view and filters trips by the selected day', () => {
        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)

        fireEvent.click(screen.getByTestId('trend-view-trip'))
        expect(screen.getByTestId('trend-view-trip')).toHaveClass('border-fleet-blue')
        expect(screen.getByTestId('line-chart')).toHaveAttribute('data-points', '1')
    })


    test('highlights the day view button by defaut', () => {
        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)

        expect(screen.getByTestId('trend-view-day')).toHaveClass('border-fleet-blue')
        expect(screen.getByTestId('trend-view-trip')).not.toHaveClass('border-fleet-blue')
    })


    test('shows a daate range label in day view', () => {
        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)

        expect(screen.getByTestId('trend-calendar-trigger')).toBeInTheDocument()
    })

    test('renders a range in day view and a single calendar in trip view', () => {
        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)

        expect(screen.getByTestId('calendar')).toHaveAttribute('data-mode', 'range')



        fireEvent.click(screen.getByTestId('trend-view-trip'))
        expect(screen.getByTestId('calendar')).toHaveAttribute('data-mode', 'single')
    })

    test('CustomTooltip rendrs score and severity label when active', () => {
        mockTooltipProps = {active: true, payload: [{ value: 85}], label: '20 Jul'}

        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)

        expect(screen.getByText('20 Jul')).toBeInTheDocument()
        expect(screen.getByText('Safety Score: 85')).toBeInTheDocument()
        expect(screen.getByText('Good')).toBeInTheDocument()
        expect(getScoreSeverity).toHaveBeenCalledWith(85)
    })


    test('CustomToolTip renders nothing when inactive or payload is empty', () => {
        mockTooltipProps = {active: false, payload: [], label: '20 Jul'}

        render(<SafetyScoreTrendChart dailyScores={dailyScores} trips={trips} />)

        expect(screen.queryByText('20 Jul')).not.toBeInTheDocument()
    })

})

