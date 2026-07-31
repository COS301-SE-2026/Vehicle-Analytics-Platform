import { render, screen } from '@testing-library/react'
import EventTimeline from '../components/vehicles/EventTimeline'

describe('EventTimeline', () => {

    it('shows empty state', () => {
        render(<EventTimeline events={[]} />)
        expect(
            screen.getByText(/No events recorded for this trip/i)).toBeInTheDocument()
    })

    it('renders timeline events', () => {
        const events = [
            {
                type: 'trip_started', label: 'Trip Started',
                timestamp: '2025-02-02T10:00:00Z',
                latitude: -25.7, longitude: 28.2,
            },
            {
                type: 'speeding', label: 'Speeding',
                latitude: -25.8, longitude: 28.3,
                timestamp: '2025-02-02T10:09:00Z',
            },
        ]

        render(<EventTimeline events={events} />)

        expect(screen.getByText('Trip Started')).toBeInTheDocument()
        expect(screen.getByText('Speeding')).toBeInTheDocument()
    })

    it('renders heading', () => {
        render(<EventTimeline events={[]} />)

        expect(screen.getByText(/EVENT TIMELINE/i)).toBeInTheDocument()
    })
})