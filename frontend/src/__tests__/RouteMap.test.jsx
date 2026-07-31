import {
    render,
    screen,
    fireEvent,
    cleanup,
    act
} from '@testing-library/react'

import '@testing-library/jest-dom'
import RouteMap from '@/components/vehicles/RouteMap'

afterEach(cleanup)

beforeEach(() => {
    global.requestAnimationFrame = jest.fn()
    global.cancelAnimationFrame = jest.fn()

    Element.prototype.requestFullscreen = jest.fn()

    document.exitFullscreen = jest.fn()
})

const routePoints = [
    {lat: -25.7, lng: 28.2},
    {lat: -25.71, lng: 28.21},
    {lat: -25.72, lng: 28.21},
]

describe('RouteMap', () => {
    test('renders the route label', () => {
        render(<RouteMap routePoints={routePoints} routeLabel={"Depot to Warehouse"} />)

        expect(screen.getByText('Depot to Warehouse')).toBeInTheDocument()
    })


    test('shows an inital elapsed 00:00 time', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)
        expect(screen.getByText('00:00/00:03')).toBeInTheDocument()
    })

    test('toggles the play/pause button when play is clicked', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)
        const playButton = screen.getByTestId('play-pause-button')

        expect(screen.getByTestId('play-icon')).toBeInTheDocument()

        fireEvent.click(playButton)
        expect(screen.getByTestId('pause-icon')).toBeInTheDocument()


        fireEvent.click(playButton)
        expect(screen.getByTestId('play-icon')).toBeInTheDocument()
    })

    test('rewind moves the index back by step size stopping at 0', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)

        const rewind = screen.getByTestId('rewind-button')
        fireEvent.click(rewind)

        expect(screen.getByText('00:00/00:03')).toBeInTheDocument()
    })


    test('fast forward moves the index forward by step size stopping at last index', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)

        const fastForward = screen.getByTestId('fast-forward-button')
        fireEvent.click(fastForward)

        expect(screen.getByText('00:03/00:03')).toBeInTheDocument()
    })

    test('scrub bar responds to keyboard arrow input', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)

        const scrubBar = screen.getByTestId('scrub-bar')
        fireEvent.keyDown(scrubBar, {key: 'End'})

        expect(screen.getByText('00:03/00:03')).toBeInTheDocument()
    })

    test('changes playback speed when button is clicked', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)

        const speed2Button = screen.getByText('2x')
        const speed1Button = screen.getByText('1x')

        expect(speed1Button).toHaveClass('bg-fleet-blue')

        fireEvent.click(speed2Button)

        expect(speed2Button).toHaveClass('bg-fleet-blue')
        expect(speed1Button).not.toHaveClass('bg-fleet-blue')
    })


    test('scrubbing progress par sets index based on clicked position', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)

        const scrubBar = screen.getByTestId('scrub-bar')

        scrubBar.getBoundingClientRect = () => ({
            left: 0,
            width: 100
        })

        fireEvent.click(scrubBar, {clientX: 100})

        expect(screen.getByText('00:03/00:03')).toBeInTheDocument()
    })


    test('requests fullscreen when the fullscreen button is clicked', () => {
        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)
        const fullscreenButton = screen.getByTestId('fullscreen-button')

        fireEvent.click(fullscreenButton)

        expect(Element.prototype.requestFullscreen).toHaveBeenCalled()
    })


    test('completes animation and stops at the final point when playing through all parts', () => {
        let rafCallback
        global.requestAnimationFrame = jest.fn((cb) => {
            rafCallback = cb
            return 1
        })

        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)
        
        const playButton = screen.getByTestId('play-pause-button')
        fireEvent.click(playButton)

        act(() => {
            for (let i=0; i<10; i++){
                if(rafCallback){
                    rafCallback(i*2000)
                }
            }
        })

        expect(screen.getByTestId('play-icon')).toBeInTheDocument()
        expect(screen.getByText('00:03/00:03')).toBeInTheDocument()
    })


    test('exits fullscreen when already in fullscreen mode', () => {
        Object.defineProperty(document, 'fullscreenElement', {value: {}, configurable: true})

        render(<RouteMap routePoints={routePoints} routeLabel="Depot to Warehouse" />)
        const fullscreenButton = screen.getByTestId('fullscreen-button')

        fireEvent.click(fullscreenButton)
        expect(document.exitFullscreen).toHaveBeenCalled()

        Object.defineProperty(document, 'fullscreenElement', {value: null, configurable: true})
    })
})