import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import FleetMap from '../components/map/FleetMap' 

// Mock Mapbox GL completely
const mockAddControl = jest.fn()
const mockRemove = jest.fn()
const mockSetLngLat = jest.fn().mockReturnThis()
const mockAddTo = jest.fn().mockReturnThis()

jest.mock('mapbox-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    addControl: mockAddControl,
    remove: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: mockSetLngLat,
    addTo: mockAddTo,
    remove: mockRemove,
  })),
}))

// ✅ import.meta.env line removed — handled globally in jest.setup.js

describe('FleetMap Component', () => {
  const sampleVehicles = [
    { id: 1, lat: -26.2041, lng: 28.0473, status: 'active' },
    { id: 2, lat: -26.2100, lng: 28.0500, status: 'idle' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockRemove.mockClear()
  })

  test('renders without crashing and instantiates Mapbox container', () => {
    const mapboxgl = require('mapbox-gl')
    const { container } = render(<FleetMap vehicles={sampleVehicles} />)
    
    expect(container.firstChild).toBeInTheDocument()
    expect(mapboxgl.Map).toHaveBeenCalledTimes(1)
  })

  test('adds control elements only when minimal mode is false', () => {
    const mapboxgl = require('mapbox-gl')
    
    // Default minimal = false
    const { rerender } = render(<FleetMap vehicles={sampleVehicles} minimal={false} />)
    expect(mockAddControl).toHaveBeenCalled()
    expect(mapboxgl.NavigationControl).toHaveBeenCalled()

    jest.clearAllMocks()

    // Minimal = true
    rerender(<FleetMap vehicles={sampleVehicles} minimal={true} />)
    expect(mockAddControl).not.toHaveBeenCalled()
  })

  test('creates browser markers and handles mouse hover styling rules', () => {
    const { container } = render(<FleetMap vehicles={sampleVehicles} />)
    
    const DOMMarkers = container.getElementsByClassName('vehicle-marker')
    expect(DOMMarkers.length).toBe(2)

    const firstMarker = DOMMarkers[0]

    fireEvent.mouseEnter(firstMarker)
    expect(firstMarker.style.width).toBe('36px')

    fireEvent.mouseLeave(firstMarker)
    expect(firstMarker.style.width).toBe('32px')
  })

  test('triggers callback upon vehicle marker element selection', () => {
    const mockClickHandler = jest.fn()
    const { container } = render(
      <FleetMap vehicles={sampleVehicles} onVehicleClick={mockClickHandler} minimal={false} />
    )

    const DOMMarkers = container.getElementsByClassName('vehicle-marker')
    fireEvent.click(DOMMarkers[0])

    expect(mockClickHandler).toHaveBeenCalledTimes(1)
    expect(mockClickHandler).toHaveBeenCalledWith(sampleVehicles[0])
  })

  test('cleans old markers out when the vehicle records mutate', () => {
    const { rerender } = render(<FleetMap vehicles={sampleVehicles} />)
    
    rerender(<FleetMap vehicles={[sampleVehicles[0]]} />)
    
    expect(mockRemove).toHaveBeenCalled()
  })
})