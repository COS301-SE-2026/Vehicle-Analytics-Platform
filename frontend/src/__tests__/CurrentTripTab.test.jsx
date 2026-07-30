import { render, screen, fireEvent } from '@testing-library/react'
import CurrentTripTab from '../components/vehicles/CurrentTripTab'

jest.mock('../components/vehicles/LiveTrackingMap', () => ({
    __esModule: true,
    default: () => <div>Mock Map</div>,
}))

jest.mock('../components/vehicles/AllEventsPanel', () => ({
    __esModule: true,
    default: ({ open }) =>
        open ? <div>All Events Panel</div> : null,
}))

jest.mock('@/utils/safetyScore', () => ({
    getScoreSeverity: () => ({
        ringColour: 'green',
    }),
}))

const vehicle = {
    id: 'CAR001', status: 'Driving', latitude: -25.7, longitude: 28.2, speed: 90,
    speedLimit: 80, todaySafetyScore: 85, tripStartTime: new Date(Date.now() - 3600000).toISOString(),
}

const events = [{
    type: 'speeding', speed: 90, 
    latitude: -25.7, longitude: 28.2,
    timestamp: new Date().toISOString(),
    },
    {
    type: 'harsh_braking', speed: 50,
    latitude: -25.8, longitude: 28.3,
    timestamp: new Date().toISOString(),
    },
]

describe('CurrentTripTab', () => {
    it('renders map', () => {
        render(<CurrentTripTab
            vehicle={vehicle}
            recentEvents={events}/>
        )

        expect(screen.getByText('Mock Map')).toBeInTheDocument()
    })

    it('shows speeding warning', () => {
        render(<CurrentTripTab
            vehicle={vehicle}
            recentEvents={events} />
        )

        expect(screen.getByText('SPEEDING')).toBeInTheDocument()
    })

    it('shows safety score', () => {
        render(<CurrentTripTab
            vehicle={vehicle}
            recentEvents={events}/> )

        expect(screen.getByText('85')).toBeInTheDocument()
    })

    it('renders event preview', () => {
        render(<CurrentTripTab
            vehicle={vehicle}
            recentEvents={events}/>
        )

        expect(screen.getByText('Speeding')).toBeInTheDocument()
        expect(screen.getByText('Harsh Braking')).toBeInTheDocument()
    })

    it('opens All Events panel', () => {
        render(<CurrentTripTab
            vehicle={vehicle}
            recentEvents={events}/>
        )

        fireEvent.click(screen.getByText(/View All/i))

        expect(screen.getByText('All Events Panel')).toBeInTheDocument()
    })

    it('shows no events message', () => {
        render(<CurrentTripTab
            vehicle={vehicle}
            recentEvents={[]}/>
        )

        expect(
            screen.getByText(/No events recorded yet today/i)).toBeInTheDocument()
    })
})