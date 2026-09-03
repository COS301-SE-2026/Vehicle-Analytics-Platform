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

const baseVehicles = [
    {
        id: 'VH-001',
        status: 'moving',
        hasAlert: true,
        safetyScore: 92,
        lastUpdated:'2 min ago',
        stale: false,
    },
    {
        id: 'VH-002',
        status: 'offline',
        hasAlert: false,
        safetyScore: 61,
        lastUpdated:'3 hours ago',
        stale: true,
    },
]

const defaultProps = {
    vehicles: baseVehicles,
    page: 1,
    totalPages: 3,
    totalVehicles: 25,
    pageSize: 10,
    onPageChange: jest.fn(),
}


describe('VehiclesTable', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('renders all column headers', () => {
        render(<VehiclesTable {...defaultProps} />);
        ['VEHICLE ID', 'STATUS', 'ALERTS', 'SAFETY SCORE', 'LAST UPDATED', 'ACTIONS'].forEach((col) => {
            expect(screen.getByText(col)).toBeInTheDocument()
        })
    })

    test('renders a row per vehicle with id and safety score', () => {
        render(<VehiclesTable {...defaultProps} />)

        const row1 = within(screen.getByTestId('vehicle-row-VH-001'))
        expect(row1.getByText('VH-001')).toBeInTheDocument()
        expect(row1.getByText('92')).toBeInTheDocument()

        const row2 = within(screen.getByTestId('vehicle-row-VH-002'))
        expect(row2.getByText('VH-002')).toBeInTheDocument()
        expect(row2.getByText('61')).toBeInTheDocument()

        expect(screen.getAllByTestId('safety-score-ring')).toHaveLength(2)

    })

    test('renders vehicle status badges', () => {
        render(<VehiclesTable {...defaultProps} />)

        const row1 = within(screen.getByTestId('vehicle-row-VH-001'))
        expect(row1.getByText('Moving')).toBeInTheDocument()

        const row2 = within(screen.getByTestId('vehicle-row-VH-002'))
        expect(row2.getByText('Offline')).toBeInTheDocument()
    })

    test('clicking a row navigates to the vehicle profile', () => {
        render(<VehiclesTable {...defaultProps} />)
        fireEvent.click(screen.getByTestId('vehicle-row-VH-001'))
        expect(mockNavigate).toHaveBeenCalledWith('/vehicles/VH-001')
    })

    test('shows the correct "Showing X to Y of Z" range the pagination', () => {
        render(<VehiclesTable {...defaultProps} page={2} pageSize={10} totalVehicles={25} />)
        expect(screen.getByText('Showing 11 to 20 of 25 vehicles')).toBeInTheDocument()
    })

    test('caps the end of range at totalVehicles on the last page', () => {
        render(<VehiclesTable {...defaultProps} page={3} pageSize={10} totalVehicles={25} />)
        expect(screen.getByText('Showing 21 to 25 of 25 vehicles')).toBeInTheDocument()
    })

    test('disables the prev button on page 1', () =>{
        render(<VehiclesTable {...defaultProps} page={1}/>)
        expect(screen.getByTestId('vehicles-page-prev')).toBeDisabled()
    })

    test('disables the next button on the last page', () => {
        render(<VehiclesTable {...defaultProps} page={3} totalPages={3} />)
        expect(screen.getByTestId('vehicles-page-next')).toBeDisabled()
    })

    test('calls onPageChange with the previous page when prev is clicked', () => {
        render(<VehiclesTable {...defaultProps} page={2} />)
        fireEvent.click(screen.getByTestId('vehicles-page-prev'))
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(1)
    })

    test('calls onPageChange with the next page when clicked', () => {
        render(<VehiclesTable {...defaultProps} page={2} totalPages={3}/>)
        expect(screen.getByTestId('vehicles-page-1')).toBeInTheDocument()
        expect(screen.getByTestId('vehicles-page-2')).toBeInTheDocument()
        expect(screen.getByTestId('vehicles-page-3')).toBeInTheDocument()

        fireEvent.click(screen.getByTestId('vehicles-page-3'))
        expect(defaultProps.onPageChange).toHaveBeenCalledWith(3)
    })

    test('highlights the current page button', () => {
        render(<VehiclesTable {...defaultProps} page={2} totalPages={3} />)
        expect(screen.getByTestId('vehicles-page-2')).toHaveClass('bg-fleet-blue')
        expect(screen.getByTestId('vehicles-page-1')).not.toHaveClass('bg-fleet-blue')
    })
})
