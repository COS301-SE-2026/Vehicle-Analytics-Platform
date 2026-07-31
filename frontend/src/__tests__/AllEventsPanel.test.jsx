import { render, screen, fireEvent } from '@testing-library/react'
import AllEventsPanel from '../components/vehicles/AllEventsPanel'

jest.mock('@/components/ui/sheet', () => ({
    Sheet: ({ children }) => <div>{children}</div>,
    SheetContent: ({ children }) => <div>{children}</div>,
    SheetHeader: ({ children }) => <div>{children}</div>,
    SheetTitle: ({ children }) => <h1>{children}</h1>,
    SheetDescription: ({ children }) => <p>{children}</p>,
}))

const events = Array.from({ length: 10 }, (_, i) => ({
    type: 'speeding',
    speed: 80,
    latitude: -25.7,
    longitude: 28.2,
    timestamp: `2025-02-02T10:${String(i).padStart(2, '0')}:00Z`,
}))

describe('AllEventsPanel', () => {
    it('renders title and vehicle ID', () => {
        render(<AllEventsPanel
            open={true}
            onOpenChange={jest.fn()}
            vehicleId="CAR123"
            events={events}/>
        )

        expect(screen.getByText(/Vehicle: CAR123/i)).toBeInTheDocument()
        expect(screen.getByText(/All Events/i)).toBeInTheDocument()
    })

    it('shows first page of events', () => {
        render(<AllEventsPanel
            open={true}
            onOpenChange={jest.fn()}
            vehicleId="CAR123"
            events={events}/>
        )

        expect(screen.getByText(/Showing 1-8 of 10/i)).toBeInTheDocument()
    })

    it('goes to second page', () => {
        render(<AllEventsPanel
            open={true}
            onOpenChange={jest.fn()}
            vehicleId="CAR123"
            events={events}/>
        )

        fireEvent.click(screen.getByTestId('events-page-next'))

        expect(screen.getByText(/Showing 9-10 of 10/i)).toBeInTheDocument()
    })

    it('shows empty message when there are no events', () => {
        render(<AllEventsPanel
            open={true}
            onOpenChange={jest.fn()}
            vehicleId="CAR123"
            events={[]}/>
        )

        expect(screen.getByText(/No events recorded yet today/i)).toBeInTheDocument()
    })
})