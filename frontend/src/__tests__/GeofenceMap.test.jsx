import { render, screen, waitFor } from "@testing-library/react";
import GeofenceMap, { LAYER_FILTERS } from "../components/geofence/GeofenceMap";
import { getGeofencesGeoJSON } from "@/services/geofenceServices";
import { getVehicleLocations } from "@/services/vehicleService";

jest.mock("mapbox-gl", () => {
	const instances = [];

	class MockMap {
		constructor(opts) {
			this.opts = opts;
			this._handlers = {};
			this._layers = new Set();
			this._sources = {};
			instances.push(this);
		}
		on(event, layerOrHandler, maybeHandler) {
			const handler = maybeHandler ?? layerOrHandler;
			const key = maybeHandler ? `${event}:${layerOrHandler}` : event;
			this._handlers[key] = this._handlers[key] || [];
			this._handlers[key].push(handler);
		}
		once(event, handler) {
			this.on(event, handler);
		}
		off() {}
		addControl = jest.fn();
		addSource = jest.fn((id, source) => {
			this._sources[id] = { ...source, setData: jest.fn() };
		});
		getSource = jest.fn((id) => this._sources[id]);
		addLayer = jest.fn((layer) => this._layers.add(layer.id));
		getLayer = jest.fn((id) => this._layers.has(id));
		setFilter = jest.fn();
		isStyleLoaded = jest.fn(() => false);
		getCanvas = jest.fn(() => ({ style: {} }));
		fitBounds = jest.fn();
		getCenter = jest.fn(() => ({ lat: -25.75456, lng: 28.2293 }));
		getZoom = jest.fn(() => 12);
		remove = jest.fn();
		__fireLoad() {
			(this._handlers.load || []).forEach((cb) => cb());
		}
	}

	class MockMarker {
		constructor() {
			this._lngLat = { lng: 0, lat: 0 };
		}
		setLngLat(pos) {
			this._lngLat = { lng: pos[0], lat: pos[1] };
			return this;
		}
		getLngLat() {
			return this._lngLat;
		}
		setPopup() {
			return this;
		}
		addTo() {
			return this;
		}
		getElement() {
			return { style: {} };
		}
		remove = jest.fn();
	}

	class MockPopup {
		setHTML() {
			return this;
		}
	}

	class MockLngLatBounds {
		constructor() {
			this._empty = true;
		}
		extend() {
			this._empty = false;
		}
		isEmpty() {
			return this._empty;
		}
	}

	return {
		__esModule: true,
		default: {
			accessToken: "",
			Map: MockMap,
			NavigationControl: jest.fn(),
			Marker: MockMarker,
			Popup: MockPopup,
			LngLatBounds: MockLngLatBounds,
			__instances: instances,
		},
	};
});

jest.mock("@/services/geofenceServices", () => ({
	getGeofencesGeoJSON: jest.fn().mockResolvedValue({ type: "FeatureCollection", features: [] }),
}));

jest.mock("@/services/vehicleService", () => ({
	getVehicleLocations: jest.fn().mockResolvedValue({ vehicles: [] }),
}));

jest.mock('@mapbox/mapbox-gl-draw', () => jest.fn(() => ({
	getAll: jest.fn(() => ({ features: [] })),
	addControl: jest.fn(),
})));

jest.mock('@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css', () => ({}), {
	virtual: true,
});

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

  test('falls back to default center immediately when geolocation is not supported', async () => {
    global.navigator.geolocation = undefined;
    render(<GeofenceMap onZoneDrawn={() => {}} />);

    await waitFor(() => {
      expect(screen.queryByText(/Locating you/i)).not.toBeInTheDocument();
    });
    
    expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
  });

  test('renders map container', () => {
    const { container } = render(<GeofenceMap onZoneDrawn={() => {}} />);
    expect(container.querySelector('.relative.w-full.h-full')).toBeInTheDocument();
  });
});