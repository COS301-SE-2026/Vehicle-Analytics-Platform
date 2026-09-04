import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import FleetGroupCards from '@/components/vehicles/FleetGroupCards'
import { getVehiclesList } from '@/services/vehicleService'

jest.mock('@/services/vehicleService')

const groups = [
    {id: 1, name: 'North Fleet', description: 'Northern region', vehicle_count: 8},
    {id: 2, name: 'South Fleet', description: null, vehicle_count: 3},
]

describe('FleetGroupCards', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        getVehiclesList.mockResolvedValue({ stats: { moving: 2, idle: 1, offline: 5}})
    })


    test('renders a card per group with name and vehicle count', () => {
        render(<FleetGroupCards groups={groups} onSelect={jest.fn()} />)
        expect(screen.getByText('North Fleet')).toBeInTheDocument()
        expect(screen.getByText('South Fleet')).toBeInTheDocument()
        expect(screen.getByText('8 vehicles')).toBeInTheDocument()
        expect(screen.getByText('3 vehicles')).toBeInTheDocument()
    })

    test('shows "View vehicles" on every card', () => {
        render(<FleetGroupCards groups={groups} onSelect={jest.fn()} />)
        expect(screen.getAllByText('View vehicles')).toHaveLength(2)
    })

    test('calls onSelect with the correct group when a card is clicked', () => {
        const onSelect = jest.fn()
        render(<FleetGroupCards groups={groups} onSelect={onSelect}></FleetGroupCards>)
        fireEvent.click(screen.getByText('North Fleet'))
        expect(onSelect).toHaveBeenCalledWith(groups[0])
        expect(onSelect).toHaveBeenCalledTimes(1)
    })

    test('shows a dash for each status count before stats have been loaded', () => {
        getVehiclesList.mockReturnValue(new Promise(() => {}))
        render(<FleetGroupCards groups={[groups[0]]} onSelect={jest.fn()}></FleetGroupCards>)
        expect(screen.getByText('Active')).toBeInTheDocument()
        expect(screen.getByText('Idle')).toBeInTheDocument()
        expect(screen.getByText('Offline')).toBeInTheDocument()
        expect(screen.getAllByText('-')).toHaveLength(3)
    })
    

    test('fetches and displays per-group status counts once loaded', async () => {
        render(<FleetGroupCards groups={[groups[0]]} onSelect={jest.fn()}></FleetGroupCards>)
        await waitFor(() => expect(getVehiclesList).toHaveBeenCalledWith({ fleetGroupId: 1, limit: 1}))
        await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
    })

    test('fetches stats independently for each group by its own id', async () => {
        render(<FleetGroupCards groups={groups} onSelect={jest.fn()}></FleetGroupCards>)
        await waitFor(() => expect(getVehiclesList).toHaveBeenCalledTimes(2))
        expect(getVehiclesList).toHaveBeenCalledWith({ fleetGroupId: 1, limit: 1})
        expect(getVehiclesList).toHaveBeenCalledWith({ fleetGroupId: 2, limit: 1})
    })

    test('renders the description when one is provided', () => {
        render(<FleetGroupCards groups={[groups[0]]} onSelect={jest.fn()}></FleetGroupCards>)
        expect(screen.getByText('Northern region')).toBeInTheDocument()
    })

    test('omits the description when none is provided', () => {
        render(<FleetGroupCards groups={[groups[1]]} onSelect={jest.fn()}></FleetGroupCards>)
        expect(screen.queryByText('Northern region')).not.toBeInTheDocument()
    })

    test('does not crash and shows dashes when the stats fetch fails', async () => {
        getVehiclesList.mockRejectedValue(new Error('network error'))
        render(<FleetGroupCards groups={[groups[0]]} onSelect={jest.fn()}></FleetGroupCards>)
        await waitFor(() => expect(getVehiclesList).toHaveBeenCalledWith({ fleetGroupId: 1, limit: 1}))
        expect(screen.getAllByText('-')).toHaveLength(3)
    })

    test('renders nothing but the grid wrapper when groups is empty', () => {
        const {container} = render(<FleetGroupCards groups={[]} onSelect={jest.fn()}></FleetGroupCards>)
        expect(container.querySelectorAll('button')).toHaveLength(0)
    })
})