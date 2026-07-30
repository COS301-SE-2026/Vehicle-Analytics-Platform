import {
    render,
    screen
} from '@testing-library/react'

import '@testing-library/jest-dom'

import LiveTrackingMap from '@/components/vehicles/LiveTrackingMap'

jest.mock('@/components/map/FleetMap', () => ({
    __esModule: true,
    default: ({vehicles, minimal}) => (
        <div data-testid="fleet-map" data-minimal={String(minimal)}>
            {JSON.stringify(vehicles)}
        </div>
    ),
}))

const vehicle = {
    id: 'VH-001',
    lat: -25.7,
    lng: 28.2,
    status: 'moving',
}

describe('LiveTrackingMap', () => {
    test('passes the vehicle wrapped in a single-item array to FleetMap', () => {
        render(<LiveTrackingMap vehicle={vehicle} />)

        const fleetMap = screen.getByTestId('fleet-map')
        expect(fleetMap).toHaveTextContent(JSON.stringify([vehicle]))
    })

    test('passes empty array to FleetMap with no vehicle available', () => {
        render(<LiveTrackingMap vehicle={null} />)

        const fleetMap = screen.getByTestId('fleet-map')
        expect(fleetMap).toHaveTextContent(JSON.stringify([]))
    })


    test('passes the minimal flag to FleetMap', () => {
        render(<LiveTrackingMap vehicle={vehicle} />)

        expect(screen.getByTestId('fleet-map')).toHaveAttribute('data-minimal', 'true')

    })
})
