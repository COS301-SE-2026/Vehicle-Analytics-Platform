import {
    render,
    screen,
    fireEvent,
    within,
    cleanup,
    waitFor
} from '@testing-library/react'

import '@testing-library/jest-dom'

import TripHistoryList from '@/components/vehicles/TripHistoryList'
import { getScoreSeverity } from '@/utils/safetyScore'
import { getTripReplay } from '@/services/vehicleService'


afterEach(cleanup)

jest.mock('@/utils/safetyScore', () => ({
    getScoreSeverity: jest.fn(),
}))

jest.mock('@/services/vehicleService', () => ({
    getTripReplay: jest.fn(),
}))

jest.mock('@/components/vehicles/RouteMap', () => ({
    __esModule: true,
    default: ({ routeLabel }) => <div data-testid="route-map">{routeLabel}</div>
}))

jest.mock('@/components/vehicles/GreenDrivingBreakdown', () => ({
    __esModule: true,
    default: () => <div data-testid="green-driving-breakdown" />,
}))

jest.mock('@/components/vehicles/EventTimeline', () => ({
    __esModule: true,
    default: ({events}) =>(
        <div data-testid="event-timeline">
        {events.map((e) => (
            <span key={e.type}>{e.label}</span>
        ))}
        </div>
    ),

}))

const baseSeverity = {
    label: 'Good',
    textClass: 'text-fleet-green',
    bgClass: 'bg-fleet-green-bg',
    barClass: 'bg-fleet-green',
}

const makeTrip = (overrides = {}) => ({
    id: 'trip-1',
    date: '2026-07-20',
    startTime: '08:00',
    endTime: '08:45',
    distanceKm: 32,
    safetyScore: 88,
    routeLabel: 'Depot to Warehouse',
    harshBrakingCount: 1,
    harshAccelerationCount: 0,
    harshCorneringCount: 2,
    ...overrides,
})

describe('TripHistoryList', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        getScoreSeverity.mockReturnValue(baseSeverity)
        getTripReplay.mockResolvedValue({ points: [], events: [] })
    })

    test('renders empty state when there are no trips', () => {
        render(<TripHistoryList trips={[]} overallScore={90} />)
        expect(screen.getByText('No trip history available.')).toBeInTheDocument()
    })

    test('renders column headers when trips exist', () => {
        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)
        ;['DATE', 'START TIME', 'END TIME', 'DISTANCE', 'SAFETY SCORE'].forEach((col) => {
            expect(screen.getByText(col)).toBeInTheDocument()
        })
    })

    test('renders a row per trip with relevant values', () => {
        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)

        const row = within(screen.getByTestId('trip-row-trip-1'))
        expect(row.getByText('08:00')).toBeInTheDocument()
        expect(row.getByText('08:45')).toBeInTheDocument()
        expect(row.getByText('32 km')).toBeInTheDocument()
        expect(row.getByText('88/100')).toBeInTheDocument()
    })

    test('does not show trip detail panels before a row is expanded', () => {
        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)
        expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
        expect(screen.queryByTestId('green-driving-breakdown')).not.toBeInTheDocument()
        expect(screen.queryByTestId('event-timeline')).not.toBeInTheDocument()
    })

    test('expands a trip row on click and fetches trip replay', async () => {
        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)

        fireEvent.click(screen.getByTestId('trip-row-trip-1'))

        expect(getTripReplay).toHaveBeenCalledWith('trip-1')
        expect(screen.getByTestId('route-map')).toBeInTheDocument()
        expect(screen.getByTestId('green-driving-breakdown')).toBeInTheDocument()
        await waitFor(() => expect(screen.getByTestId('event-timeline')).toBeInTheDocument())
    })

    test('populates route points and events when replay data has content', async () => {
        getTripReplay.mockResolvedValue({
            points: [{ latitude: -25.7, longitude: 28.2, colour: 'green' }],
            events: [{type: 'trip_started', time: '08:00', latitude: -25.7, longitude: 28.2}],
        })

        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)
        fireEvent.click(screen.getByTestId('trip-row-trip-1'))

        await waitFor(() => expect(screen.getByTestId('event-timeline')).toBeInTheDocument())
    })

    test('formats event labels for known and unknown event types', async () => {
        getTripReplay.mockResolvedValue({
            points: [],
            events: [
                {type: 'trip_ended', time: '08:45', latitude: -25.7, longitude: 28.2},
                {type: 'harsh_braking', time: '08:20', latitude: -25.7, longitude: 28.2},
            ],
        })

    render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)
    fireEvent.click(screen.getByTestId('trip-row-trip-1'))

    await waitFor(() => expect(screen.getByText('End of Trip')).toBeInTheDocument())
    expect(screen.getByText('Harsh Braking')).toBeInTheDocument()
    })


    test('logs an error when the trip replay fetch fails', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
        getTripReplay.mockRejectedValue(new Error('network error'))

        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)
        fireEvent.click(screen.getByTestId('trip-row-trip-1'))

        await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalledWith('Trip replay fetch error:', expect.any(Error)))


        consoleErrorSpy.mockRestore()
    })

    test('collapses an expanded trip row when clicked again', () => {
        render(<TripHistoryList trips={[makeTrip()]} overallScore={90} />)

        const rowButton = screen.getByTestId('trip-row-trip-1')
        fireEvent.click(rowButton)
        expect(screen.getByTestId('route-map')).toBeInTheDocument()

        fireEvent.click(rowButton)
        expect(screen.queryByTestId('route-map')).not.toBeInTheDocument()
    })

    test('shows the overall average safety score', () => {
        render(<TripHistoryList trips={[makeTrip()]} overallScore={77} />)
        expect(screen.getByText('77/100')).toBeInTheDocument()
        expect(screen.getByText('OVERALL AVERAGE SAFETY SCORE')).toBeInTheDocument()
    })


    test('shows the correct "Showing X-Y of Z" range', () => {
        const trips = Array.from({ length: 15}, (_,i) => makeTrip({ id: `trip-${i + 1}`}))
        render(<TripHistoryList trips={trips} overallScore={90} />)
        expect(screen.getByText('Showing 1-10 of 15')).toBeInTheDocument()
    })

    test('disables the prev button on page 1 and next button on the last page', () => {
        const trips = Array.from({ length: 15 }, (_, i) => makeTrip({ id: `trip-${i + 1}`}))
        render(<TripHistoryList trips={trips} overallScore={90} />)

        expect(screen.getByTestId('trips-page-prev')).toBeDisabled()
        expect(screen.getByTestId('trips-page-next')).not.toBeDisabled()

        fireEvent.click(screen.getByTestId('trips-page-next'))
        expect(screen.getByTestId('trips-page-next')).toBeDisabled()
    })

    test('calls back to the previous page when prev is clicked', () => {
        const trips = Array.from({length: 15}, (_, i) => makeTrip({id: `trip-${i+1}` }))
        render(<TripHistoryList trips={trips} overallScore={90} />)

        fireEvent.click(screen.getByTestId('trips-page-next'))
        expect(screen.getByText('Showing 11-15 of 15')).toBeInTheDocument()


        fireEvent.click(screen.getByTestId('trips-page-prev'))
        expect(screen.getByText('Showing 1-10 of 15')).toBeInTheDocument()
    })

    test('navigates to a specific page when a button is clicked', () => {
        const trips = Array.from({ length:15}, (_, i) => makeTrip({id: `trip=${i + 1}`, startTime: `0${( i % 9) + 1}:00`}))

        render(<TripHistoryList trips={trips} overallScore={90} />)

        fireEvent.click(screen.getByTestId('trips-page-2'))
        expect(screen.getByText('Showing 11-15 of 15')).toBeInTheDocument()
        expect(screen.getByTestId('trips-page-2')).toHaveClass('bg-fleet-blue')
    })
})