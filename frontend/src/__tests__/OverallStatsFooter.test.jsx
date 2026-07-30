import {
    render,
    screen
} from '@testing-library/react'

import'@testing-library/jest-dom'

import OverallStatsFooter from '@/components/vehicles/OverallStatsFooter'

const baseStats = {
    overallSafetyScore: 87,
    overallRating: 'Excellent',
    totalDistanceKm: 12345,
    totalTrips: 42,
    incidentsPer100Km: 1.5,
    activeDays: 28,
}

describe('OverallStatsFooter', () => {
    test('renders the overall safety score', () => {
        render(<OverallStatsFooter stats={baseStats} />)
        expect(screen.getByText('87')).toBeInTheDocument()
    })

    test('renders safety score rating lable and value', () => {
        render(<OverallStatsFooter stats={baseStats} />)
        expect(screen.getByText('SAFETY RATING')).toBeInTheDocument()
        expect(screen.getByText('Excellent')).toBeInTheDocument()
    })

    test('formats total distance with the seperators', () => {
        render(<OverallStatsFooter stats={baseStats} />)
        expect(screen.getByText('TOTAL DISTANCE')).toBeInTheDocument()
        expect(screen.getByText('12,345 km')).toBeInTheDocument()
    })

    test('renders incidents per 100km', () => {
        render(<OverallStatsFooter stats={baseStats} />)
        expect(screen.getByText('INCIDENTS')).toBeInTheDocument()
        expect(screen.getByText('1.5 / 100km')).toBeInTheDocument()
    })


    test('renders active days', () => {
        render(<OverallStatsFooter stats={baseStats} />)
        expect(screen.getByText('ACTIVE DAYS')).toBeInTheDocument()
        expect(screen.getByText('28 Days')).toBeInTheDocument()
    })

    test('renders total trips recorded', () => {
        render(<OverallStatsFooter stats={baseStats} />)
        expect(screen.getByText('TRIPS RECORDED')).toBeInTheDocument()
        expect(screen.getByText('42 Total')).toBeInTheDocument()
    })

    test('formats a small distance without seperator', () => {
        render(<OverallStatsFooter stats={{...baseStats, totalDistanceKm: 800}} />)

        expect(screen.getByText('800 km')).toBeInTheDocument()
    })
})