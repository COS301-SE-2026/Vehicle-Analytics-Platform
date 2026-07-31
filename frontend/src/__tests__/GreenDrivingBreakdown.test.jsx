import {
    render,
    screen
} from '@testing-library/react'

import '@testing-library/jest-dom'

import GreenDrivingBreakdown from '@/components/vehicles/GreenDrivingBreakdown'

describe('GreenDrivingBreakdown', () => {
    test('renders the section heading', () => {
        render(<GreenDrivingBreakdown harshBrakingCount={0} harshAccelerationCount={0} harshCorneringCount={0} />)

        expect(screen.getByText('GREEN DRIVING BREAKDOWN')).toBeInTheDocument()
    })


    test('renders all three stat labels', () => {
        render(<GreenDrivingBreakdown harshBrakingCount={0} harshAccelerationCount={0} harshCorneringCount={0} />)

        expect(screen.getByText('Harsh Braking')).toBeInTheDocument()
        expect(screen.getByText('Harsh Accel')).toBeInTheDocument()
        expect(screen.getByText('Cornering')).toBeInTheDocument()
    })


    test('renders stat counts correctly', () => {
        render(<GreenDrivingBreakdown harshBrakingCount={3} harshAccelerationCount={0} harshCorneringCount={5} />)

        expect(screen.getByTestId('stat-count-Harsh Braking')).toHaveTextContent('3')
        expect(screen.getByTestId('stat-count-Harsh Accel')).toHaveTextContent('0')
        expect(screen.getByTestId('stat-count-Cornering')).toHaveTextContent('5')
    })

    test('applies alert colour if count >0', () => {
        render(<GreenDrivingBreakdown harshBrakingCount={2} harshAccelerationCount={0} harshCorneringCount={0} />)

        expect(screen.getByTestId('stat-count-Harsh Braking')).toHaveClass('text-fleet-alert')
    })

    test('applies neutral colour if count =0', () => {
        render(<GreenDrivingBreakdown harshBrakingCount={0} harshAccelerationCount={0} harshCorneringCount={0} />)

        expect(screen.getByTestId('stat-count-Harsh Braking')).toHaveClass('text-fleet-text')
        expect(screen.getByTestId('stat-count-Harsh Braking')).not.toHaveClass('text-fleet-alert')
    })

})