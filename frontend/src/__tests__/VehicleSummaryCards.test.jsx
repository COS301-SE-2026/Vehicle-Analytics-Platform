import {
    render,
    screen
} from '@testing-library/react'

import '@testing-library/jest-dom'

import VehicleSummaryCards from '@/components/vehicles/VehicleSummaryCards'

import { getScoreSeverity } from '@/utils/safetyScore'

jest.mock('@/utils/safetyScore', ()=> ({
    getScoreSeverity: jest.fn(),
}))

const baseSeverity = {
    label: 'Needs Attention',
    textClass: 'text-fleet-alert',
    bgClass: 'bg-fleet-alert-bg',
    barClass: 'bg-fleet-alert',
}

const baseSummary = {
    totalVehicles: 12,
    avgSafetyScore: 87.456,
    avgSafetyScoreDelta: 3,
    activeTripsToday: 5,
    lowestScoringVehicle: { id: 'VH-102', score: 42},
}

describe('VehicleSummaryCards', () => {
    beforeEach(() => {
        getScoreSeverity.mockReturnValue(baseSeverity)
    })

    test('renders avg safety score rounded to 1 decimal', () => {
        render(<VehicleSummaryCards summary={baseSummary} />)
        expect(screen.getByText('87.5')).toBeInTheDocument()
    })

    test('renders active trips as "active / total"', () =>{
        render(<VehicleSummaryCards summary={baseSummary} />)
        expect(screen.getByText('5 / 12')).toBeInTheDocument()
    })

    test('renders lowest scoring vehicle id and score', () => {
        render(<VehicleSummaryCards summary={baseSummary} /> )
        expect(screen.getByText('VH-102')).toBeInTheDocument()
        expect(screen.getByText('42 / 100')).toBeInTheDocument()
    })

    test('renders severity label from getScoreSeverity', () => {
        render(<VehicleSummaryCards summary={baseSummary} />)
        expect(screen.getByText('Needs Attention')).toBeInTheDocument()
        expect(getScoreSeverity).toHaveBeenCalledWith(42)
    })

    test('shows positive delta with up arrow styling', () => {
        render(<VehicleSummaryCards summary={{ ...baseSummary, avgSafetyScoreDelta: 4}} />)
        expect(screen.getByText('4%')).toBeInTheDocument()
    })


    test('shows negative delta as absolute value', () => {
        render(<VehicleSummaryCards summary={{ ...baseSummary, avgSafetyScoreDelta: -7 }} />)
        expect(screen.getByText('7%')).toBeInTheDocument()
    })

    test('falls back to "-" when avgSafetyScore is null', () => {
        render(<VehicleSummaryCards summary={{ ...baseSummary, avgSafetyScore: null }} />)
        expect(screen.getByText('-')).toBeInTheDocument()
    })

    test('falls back to "-" when lowestScoringVehicle is missing', () => {
        render(<VehicleSummaryCards summary={{ ...baseSummary, lowestScoringVehicle: { id: undefined, score: undefined} }} />)
        expect(getScoreSeverity).toHaveBeenCalledWith(0)
        expect(screen.getByText('- / 100')).toBeInTheDocument()
    })
})
