import {
    render,
    screen,
    fireEvent,
    within,
    cleanup
} from '@testing-library/react'

import '@testing-library/jest-dom'

import VehiclesTable from '@/components/vehicles/VehiclesTable'

const mockNavigate = jest.fn()
afterEach(cleanup)
jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}))

jest.mock('@/components/vehicles/SafetyScoreRing', () => ({
    __esModule: true,
    default: ({ score }) => <div data-testid="safety-score-ring">{score}</div>,
}))

jest.mock('@/components/risk/RiskBadge', () => ({
    __esModule: true,
    default: ({ tier, score }) => (
        <span data-testid="risk-badge" data-tier={tier}>{score}</span>
    ),
}))

function makeDefaultProps() {
    return {
        vehicles: [
            {
                id: 'VH-001',
                status: 'moving',
                hasAlert: true,
                safetyScore: 92,
                avgSafetyScore: 88,
                riskScore: 87,
                riskTier: 'critical',
                lastUpdated: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                stale: false,
            },
            {
                id: 'VH-002',
                status: 'offline',
                hasAlert: false,
                safetyScore: 61,
                avgSafetyScore: 65,
                riskScore: 45,
                riskTier: 'medium',
                lastUpdated: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                stale: true,
            },
        ],
        page: 1,
        totalPages: 3,
        totalVehicles: 25,
        pageSize: 10,
        onPageChange: jest.fn(),
    }
}

describe('VehiclesTable', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2026-08-15T12:00:00.000Z'))
        jest.clearAllMocks()
    })

    afterEach(() => { jest.useRealTimers() })

    test('renders all column headers', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} />)
        const headers = ['VEHICLE ID', 'STATUS', 'DAILY SAFETY', 'AVG SAFETY', 'RISK', 'LAST UPDATED', 'ACTIONS']
        headers.forEach((col) => { expect(screen.getByText(col)).toBeInTheDocument()})
    })

    test('renders a row per vehicle with id and safety scores', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} />)

        const row1 = within(screen.getByTestId('vehicle-row-VH-001'))
        expect(row1.getByText('VH-001')).toBeInTheDocument()
        expect(row1.getByText('92')).toBeInTheDocument() // daily
        expect(row1.getByText('88')).toBeInTheDocument() // avg

        const row2 = within(screen.getByTestId('vehicle-row-VH-002'))
        expect(row2.getByText('VH-002')).toBeInTheDocument()
        expect(row2.getByText('61')).toBeInTheDocument() 
        expect(row2.getByText('65')).toBeInTheDocument() 

        
        
        expect(screen.getAllByTestId('safety-score-ring')).toHaveLength(4)
    })

    test('renders a risk badge per vehicle that has a risk score', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} />)

        const badges = screen.getAllByTestId('risk-badge')
        expect(badges).toHaveLength(2)
        expect(badges[0]).toHaveAttribute('data-tier', 'critical')
        expect(badges[1]).toHaveAttribute('data-tier', 'medium')
    })

    test('renders a dash for vehicles without a risk score', () => {
        const defaultProps = makeDefaultProps()
        defaultProps.vehicles = [
            {
                id: 'VH-003',
                status: 'offline',
                hasAlert: false,
                safetyScore: 75,
                avgSafetyScore: 70,
                lastUpdated: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
                stale: false,
            },
        ]
        render(<VehiclesTable {...defaultProps} />)

        expect(screen.queryByTestId('risk-badge')).not.toBeInTheDocument()
        const row = screen.getByTestId('vehicle-row-VH-003')
        expect(row.textContent).toContain('-')
    })

    test('renders vehicle status badges', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} />)

        const row1 = within(screen.getByTestId('vehicle-row-VH-001'))
        expect(row1.getByText('Moving')).toBeInTheDocument()

        const row2 = within(screen.getByTestId('vehicle-row-VH-002'))
        expect(row2.getByText('Offline')).toBeInTheDocument()
    })

    test('clicking a row navigates to the vehicle profile', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} />)
        fireEvent.click(screen.getByTestId('vehicle-row-VH-001'))
        expect(mockNavigate).toHaveBeenCalledWith('/vehicles/VH-001')
    })

    test('shows the correct "Showing X to Y of Z" range the pagination', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={2} pageSize={10} totalVehicles={25} />)
        expect(screen.getByText('Showing 11 to 20 of 25 vehicles')).toBeInTheDocument()
    })

    test('caps the end of range at totalVehicles on the last page', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={3} pageSize={10} totalVehicles={25} />)
        expect(screen.getByText('Showing 21 to 25 of 25 vehicles')).toBeInTheDocument()
    })

    test('disables the prev button on page 1', () =>{
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={1}/>)
        expect(screen.getByTestId('vehicles-page-prev')).toBeDisabled()
    })

    test('disables the next button on the last page', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={3} totalPages={3} />)
        expect(screen.getByTestId('vehicles-page-next')).toBeDisabled()
    })

    test('calls onPageChange with the previous page when prev is clicked', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={2} />)
        fireEvent.click(screen.getByTestId('vehicles-page-prev'))
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(1)
    })

    test('calls onPageChange with the next page when clicked', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={2} totalPages={3}/>)
        expect(screen.getByTestId('vehicles-page-1')).toBeInTheDocument()
        expect(screen.getByTestId('vehicles-page-2')).toBeInTheDocument()
        expect(screen.getByTestId('vehicles-page-3')).toBeInTheDocument()

        fireEvent.click(screen.getByTestId('vehicles-page-3'))
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(3)
    })

    test('highlights the current page button', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} page={2} totalPages={3} />)
        expect(screen.getByTestId('vehicles-page-2')).toHaveClass('bg-fleet-blue')
        expect(screen.getByTestId('vehicles-page-1')).not.toHaveClass('bg-fleet-blue')
    })

    test('renders relative "last updated" values from timestamps', () => {
        const defaultProps = makeDefaultProps()
        render(<VehiclesTable {...defaultProps} />)
        expect(screen.getByText('2 minutes ago')).toBeInTheDocument()
        expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    })
})
