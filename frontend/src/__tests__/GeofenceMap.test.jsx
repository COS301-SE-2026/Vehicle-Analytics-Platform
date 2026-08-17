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


  test('renders map container', () => {
    const { container } = render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(container.querySelector('.relative.w-full.h-full')).toBeInTheDocument();
  });



});
