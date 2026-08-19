import { render, screen } from '@testing-library/react';
import GeofenceMap from '@/components/geofence/GeofenceMap';

jest.mock('@/services/geofenceServices', () => ({
  getGeofencesGeoJSON: jest.fn().mockResolvedValue({
    type: 'FeatureCollection',
    features: [],
  }),
}));

jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    remove: jest.fn(),
    isStyleLoaded: jest.fn().mockReturnValue(true),
    getSource: jest.fn().mockReturnValue({
      setData: jest.fn(),
    }),
    addSource: jest.fn(),
    addLayer: jest.fn(),
  })),
  NavigationControl: jest.fn(),
}));

jest.mock('@mapbox/mapbox-gl-draw', () => jest.fn(() => ({
  getAll: jest.fn(() => ({ features: [] })),
  addControl: jest.fn(),
})));

jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" className="animate-spin" />,
}));

describe('GeofenceMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn(),
    };
  });

  test('falls back to default center immediately when geolocation is not supported', () => {
    global.navigator.geolocation = undefined;
    render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(screen.queryByText(/Locating you/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
  });

  test('renders map container', () => {
    const { container } = render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(container.querySelector('.relative.w-full.h-full')).toBeInTheDocument();
  });

  test('handles geolocation success', () => {
    const mockPosition = {
      coords: {
        longitude: 28.2293,
        latitude: -25.75456,
      },
    };
    global.navigator.geolocation.getCurrentPosition.mockImplementation((success) => {
      success(mockPosition);
    });

    render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(global.navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
  });

    test('handles geolocation failure', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      global.navigator.geolocation.getCurrentPosition.mockImplementation((success, error) => {
      error(new Error('Geolocation failed'));
    });

    render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(global.navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

});
