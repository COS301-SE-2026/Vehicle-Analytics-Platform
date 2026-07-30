import { render, screen } from '@testing-library/react';
import GeofenceMap from '@/components/geofence/GeofenceMap';

jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    addControl: jest.fn(),
    on: jest.fn(),
    remove: jest.fn(),
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
    global.navigator.geolocation = {
      getCurrentPosition: jest.fn(),
    };
  });

  test('shows a locating indicator on initial render', () => {
    render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(screen.getByText(/Locating you/i)).toBeInTheDocument();
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });
});