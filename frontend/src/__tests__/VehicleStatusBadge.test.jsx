import {
    render,
    screen
} from '@testing-library/react'

import '@testing-library/jest-dom'

import VehicleStatusBadge from '@/components/vehicles/VehicleStatusBadge'

describe('VehicleStatusBadge', () => {
    test.each([
        ['moving', 'Moving', 'bg-fleet-green'],
        ['active', 'Moving', 'bg-fleet-green'],
        ['idle', 'Idle', 'bg-amber-400'],
        ['offline', 'Offline', 'bg-gray-400'],
    ])('renders "%s" status as "%s%" with correct dot colour', (status, expectedLabel, expectedDotClass) => {
        render(<VehicleStatusBadge status={status} />)
        expect(screen.getByText(expectedLabel)).toBeInTheDocument()

        const dot = screen.getByTestId('status-dot')
        expect(dot).toHaveClass(expectedDotClass)
    })

    test('falls back to offline styling for an unrecognised status', () => {
        render(<VehicleStatusBadge status="unknown_status" />)

        expect(screen.getByText('Offline')).toBeInTheDocument()

        const dot = screen.getByTestId('status-dot')
        expect(dot).toHaveClass('bg-gray-400')
    })
})