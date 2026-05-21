import React from 'react'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('mapbox-gl', () => ({
  __esModule: true,
  default: {
    Map: jest.fn(),
    Marker: jest.fn(),
    NavigationControl: jest.fn(),
    accessToken: '',
  },
}))

jest.mock('mapbox-gl/dist/mapbox-gl.css', () => {})

import FleetMap from '@/components/map/FleetMap'
import mapboxgl from 'mapbox-gl'

const VEHICLES = [
  { id: '1', lat: -26.2, lng: 28.0, status: 'active' },
  { id: '2', lat: -26.3, lng: 28.1, status: 'idle' },
  { id: '3', lat: -26.4, lng: 28.2, status: 'offline' },
]

describe('FleetMap', () => {
  let mockMapInstance
  let mockMarkerInstance

  beforeEach(() => {
    jest.clearAllMocks()

    mockMarkerInstance = {
      setLngLat: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockReturnThis(),
      remove: jest.fn(),
    }

    mockMapInstance = {
      addControl: jest.fn(),
      remove: jest.fn(),
    }

    mapboxgl.Map.mockReturnValue(mockMapInstance)
    mapboxgl.Marker.mockReturnValue(mockMarkerInstance)
  })

  //  Map initialisation 
  describe('map initialisation', () => {
    it('creates a mapbox Map on mount', () => {
      render(<FleetMap />)
      expect(mapboxgl.Map).toHaveBeenCalledTimes(1)
    })

    it('uses zoom 10 when minimal is false (default)', () => {
      render(<FleetMap minimal={false} />)
      expect(mapboxgl.Map).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 10 })
      )
    })

    it('uses zoom 9 when minimal is true', () => {
      render(<FleetMap minimal={true} />)
      expect(mapboxgl.Map).toHaveBeenCalledWith(
        expect.objectContaining({ zoom: 9 })
      )
    })

    it('adds a NavigationControl when minimal is false', () => {
      render(<FleetMap minimal={false} />)
      expect(mockMapInstance.addControl).toHaveBeenCalledTimes(1)
      expect(mapboxgl.NavigationControl).toHaveBeenCalledWith({ showCompass: false })
    })

    it('does not add a NavigationControl when minimal is true', () => {
      render(<FleetMap minimal={true} />)
      expect(mockMapInstance.addControl).not.toHaveBeenCalled()
    })

    it('does not reinitialise the map if already mounted (map.current guard)', () => {
      const { rerender } = render(<FleetMap vehicles={VEHICLES} />)
      rerender(<FleetMap vehicles={VEHICLES} />)
      expect(mapboxgl.Map).toHaveBeenCalledTimes(1)
    })
  })

  //  Marker rendering 

  describe('markers', () => {
    it('creates a marker for each vehicle', () => {
      render(<FleetMap vehicles={VEHICLES} />)
      expect(mapboxgl.Marker).toHaveBeenCalledTimes(VEHICLES.length)
    })

    it('renders no markers when vehicles list is empty', () => {
      render(<FleetMap vehicles={[]} />)
      expect(mapboxgl.Marker).not.toHaveBeenCalled()
    })

    it('uses the offline fallback color for an unknown status', () => {
      let capturedEl
      mapboxgl.Marker.mockImplementation(({ element }) => {
        capturedEl = element
        return mockMarkerInstance
      })

      render(<FleetMap vehicles={[{ id: '99', lat: -26.2, lng: 28.0, status: 'maintenance' }]} />)
      expect(capturedEl.style.background).toBe('rgb(156, 163, 175)')
    })

    it('removes old markers before adding new ones on vehicle update', () => {
      const { rerender } = render(<FleetMap vehicles={VEHICLES} />)
      rerender(<FleetMap vehicles={[VEHICLES[0]]} />)
      expect(mockMarkerInstance.remove).toHaveBeenCalled()
    })
  })

  //  Click handling 

  describe('onVehicleClick', () => {
    it('attaches a click listener when not minimal and onVehicleClick is provided', () => {
      let capturedEl
      mapboxgl.Marker.mockImplementation(({ element }) => {
        capturedEl = element
        return mockMarkerInstance
      })

      const onVehicleClick = jest.fn()
      render(<FleetMap vehicles={[VEHICLES[0]]} onVehicleClick={onVehicleClick} minimal={false} />)

      capturedEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onVehicleClick).toHaveBeenCalledWith(VEHICLES[0])
    })

    it('does not attach a click listener when minimal is true', () => {
      let capturedEl
      mapboxgl.Marker.mockImplementation(({ element }) => {
        capturedEl = element
        return mockMarkerInstance
      })

      const onVehicleClick = jest.fn()
      render(<FleetMap vehicles={[VEHICLES[0]]} onVehicleClick={onVehicleClick} minimal={true} />)

      capturedEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(onVehicleClick).not.toHaveBeenCalled()
    })

    it('does not throw when clicked with no onVehicleClick provided', () => {
      let capturedEl
      mapboxgl.Marker.mockImplementation(({ element }) => {
        capturedEl = element
        return mockMarkerInstance
      })

      render(<FleetMap vehicles={[VEHICLES[0]]} minimal={false} />)
      expect(() =>
        capturedEl.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      ).not.toThrow()
    })
  })

  //  Marker hover styles

  describe('marker hover styles', () => {
    it('enlarges the marker on mouseenter', () => {
      let capturedEl
      mapboxgl.Marker.mockImplementation(({ element }) => {
        capturedEl = element
        return mockMarkerInstance
      })

      render(<FleetMap vehicles={[VEHICLES[0]]} />)
      capturedEl.dispatchEvent(new MouseEvent('mouseenter'))
      expect(capturedEl.style.width).toBe('36px')
      expect(capturedEl.style.height).toBe('36px')
    })

    it('restores marker size on mouseleave', () => {
      let capturedEl
      mapboxgl.Marker.mockImplementation(({ element }) => {
        capturedEl = element
        return mockMarkerInstance
      })

      render(<FleetMap vehicles={[VEHICLES[0]]} />)
      capturedEl.dispatchEvent(new MouseEvent('mouseenter'))
      capturedEl.dispatchEvent(new MouseEvent('mouseleave'))
      expect(capturedEl.style.width).toBe('32px')
      expect(capturedEl.style.height).toBe('32px')
    })
  })
})