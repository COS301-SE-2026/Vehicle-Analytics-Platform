import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import FleetMap from '../components/map/FleetMap'

jest.mock('mapbox-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    addControl: jest.fn(),
    remove: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn().mockImplementation(function({ element }) {
    const markerEl = element
    return {
      setLngLat: jest.fn().mockReturnThis(),
      addTo: jest.fn().mockImplementation(function() {
        global.document.body.appendChild(markerEl)
        return this
      }),
      remove: jest.fn().mockImplementation(function() {
        if (markerEl && markerEl.parentNode) {
          markerEl.parentNode.removeChild(markerEl)
        }
      }),
    }
  }),
}))

describe('FleetMap Component', () => {
  const sampleVehicles = [
    { id: 1, lat: -26.2041, lng: 28.0473, status: 'active' },
    { id: 2, lat: -26.2100, lng: 28.0500, status: 'idle' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('renders without crashing and instantiates Mapbox container', () => {
    const mapboxgl = require('mapbox-gl')
    const { container } = render(<FleetMap vehicles={sampleVehicles} />)

    expect(container.firstChild).toBeInTheDocument()
    expect(mapboxgl.Map).toHaveBeenCalledTimes(1)
  })

  test('adds control elements only when minimal mode is false', () => {
    const mapboxgl = require('mapbox-gl')

    const { rerender } = render(<FleetMap vehicles={sampleVehicles} minimal={false} />)

    const mapInstance = mapboxgl.Map.mock.results[0].value
    expect(mapInstance.addControl).toHaveBeenCalled()
    expect(mapboxgl.NavigationControl).toHaveBeenCalled()

    jest.clearAllMocks()

    rerender(<FleetMap vehicles={sampleVehicles} minimal={true} />)
    expect(mapInstance.addControl).not.toHaveBeenCalled()
  })

  test('creates browser markers and handles mouse hover styling rules', () => {
    render(<FleetMap vehicles={sampleVehicles} />)

    const DOMMarkers = document.getElementsByClassName('vehicle-marker')
    expect(DOMMarkers.length).toBe(2)

    const firstMarker = DOMMarkers[0]

    fireEvent.mouseEnter(firstMarker)
    expect(firstMarker.style.width).toBe('36px')

    fireEvent.mouseLeave(firstMarker)
    expect(firstMarker.style.width).toBe('32px')
  })

  test('triggers callback upon vehicle marker element selection', () => {
    const mockClickHandler = jest.fn()
    render(
      <FleetMap vehicles={sampleVehicles} onVehicleClick={mockClickHandler} minimal={false} />
    )

    const DOMMarkers = document.getElementsByClassName('vehicle-marker')
    fireEvent.click(DOMMarkers[0])

    expect(mockClickHandler).toHaveBeenCalledTimes(1)
    expect(mockClickHandler).toHaveBeenCalledWith(sampleVehicles[0])
  })

  test('cleans old markers out when the vehicle records mutate', () => {
    const mapboxgl = require('mapbox-gl')
    const { rerender } = render(<FleetMap vehicles={sampleVehicles} />)

    rerender(<FleetMap vehicles={[sampleVehicles[0]]} />)

    const allMarkers = mapboxgl.Marker.mock.results.map(r => r.value)
    const removeCalls = allMarkers.filter(m => m.remove.mock.calls.length > 0)
    expect(removeCalls.length).toBeGreaterThan(0)
  })
})