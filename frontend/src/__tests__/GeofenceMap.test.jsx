import { render, screen, waitFor, act } from "@testing-library/react";
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
    // Test helper, not part of the real mapboxgl API.
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

jest.mock("@mapbox/mapbox-gl-draw", () => {
  return jest.fn().mockImplementation(() => ({
    getAll: jest.fn(() => ({ features: [] })),
  }));
});

jest.mock("@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css", () => ({}), {
  virtual: true,
});

jest.mock("@/services/geofenceServices", () => ({
  getGeofencesGeoJSON: jest.fn(),
}));

jest.mock("@/services/vehicleService", () => ({
  getVehicleLocations: jest.fn(),
}));

function mockGeolocationSuccess(coords = { longitude: 10, latitude: 20 }) {
  global.navigator.geolocation = {
    getCurrentPosition: jest.fn((onSuccess) =>
      onSuccess({ coords })
    ),
  };
}

function mockGeolocationError() {
  global.navigator.geolocation = {
    getCurrentPosition: jest.fn((_onSuccess, onError) =>
      onError({ message: "denied" })
    ),
  };
}

function mockGeolocationUnsupported() {
  delete global.navigator.geolocation;
}

function latestMapInstance() {
  // eslint-disable-next-line global-require
  const mapboxgl = require("mapbox-gl").default;
  return mapboxgl.__instances[mapboxgl.__instances.length - 1];
}

beforeEach(() => {
  jest.clearAllMocks();
  getGeofencesGeoJSON.mockResolvedValue({ type: "FeatureCollection", features: [] });
  getVehicleLocations.mockResolvedValue({ vehicles: [] });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("LAYER_FILTERS", () => {
  it("has no filter for 'all'", () => {
    expect(LAYER_FILTERS.all).toBeNull();
  });

  it("filters zones to source === 'user'", () => {
    expect(LAYER_FILTERS.zones).toEqual(["==", ["get", "source"], "user"]);
  });

  it("filters hazards to auto_hotspot and security_marker", () => {
    expect(LAYER_FILTERS.hazards).toEqual([
      "in",
      ["get", "source"],
      ["literal", ["auto_hotspot", "security_marker"]],
    ]);
  });
});

describe("GeofenceMap: geolocation resolution", () => {
  it("shows the locating overlay before a position resolves", () => {
    global.navigator.geolocation = { getCurrentPosition: jest.fn() };
    render(<GeofenceMap />);
    expect(screen.getByText(/locating you/i)).toBeInTheDocument();
  });

  it("centers the map on the browser's reported position", async () => {
    mockGeolocationSuccess({ longitude: 11.11, latitude: 22.22 });
    render(<GeofenceMap />);

    await waitFor(() => {
      expect(latestMapInstance().opts.center).toEqual([11.11, 22.22]);
    });
  });

  it("falls back to DEFAULT_CENTER when geolocation is unsupported", async () => {
    mockGeolocationUnsupported();
    render(<GeofenceMap />);

    await waitFor(() => {
      expect(latestMapInstance().opts.center).toEqual([28.2293, -25.75456]);
    });
  });

  it("falls back to DEFAULT_CENTER when the user denies the permission", async () => {
    mockGeolocationError();
    render(<GeofenceMap />);

    await waitFor(() => {
      expect(latestMapInstance().opts.center).toEqual([28.2293, -25.75456]);
    });
  });
});

describe("GeofenceMap: map initialisation", () => {
  beforeEach(() => mockGeolocationSuccess());

  it("adds navigation and draw controls exactly once", async () => {
    render(<GeofenceMap />);
    await waitFor(() => expect(latestMapInstance()).toBeDefined());

    const mapInstance = latestMapInstance();
    // NavigationControl + MapboxDraw + the custom "Full Map" button.
    expect(mapInstance.addControl).toHaveBeenCalledTimes(3);
  });

  it("registers the three geofence layers once the style loads", async () => {
    render(<GeofenceMap />);
    await waitFor(() => expect(latestMapInstance()).toBeDefined());

    const mapInstance = latestMapInstance();
    act(() => mapInstance.__fireLoad());

    expect(mapInstance.addSource).toHaveBeenCalledWith(
      "existing-geofences",
      expect.objectContaining({ type: "geojson" })
    );
    expect(mapInstance.addLayer).toHaveBeenCalledTimes(3);
  });
});

describe("GeofenceMap: zone loading", () => {
  beforeEach(() => mockGeolocationSuccess());

  it("fetches geofences and calls onZonesLoaded once the source is populated", async () => {
    const featureCollection = {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: { id: 1 }, geometry: null }],
    };
    getGeofencesGeoJSON.mockResolvedValue(featureCollection);
    const onZonesLoaded = jest.fn();

    render(<GeofenceMap onZonesLoaded={onZonesLoaded} />);
    await waitFor(() => expect(latestMapInstance()).toBeDefined());

    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    await waitFor(() => expect(getGeofencesGeoJSON).toHaveBeenCalled());
    await waitFor(() => expect(onZonesLoaded).toHaveBeenCalled());
  });

  it("logs and does not throw when the geofence fetch fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getGeofencesGeoJSON.mockRejectedValue(new Error("network down"));

    render(<GeofenceMap />);
    await waitFor(() => expect(latestMapInstance()).toBeDefined());

    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "Failed to load existing zones:",
        expect.any(Error)
      )
    );
    consoleError.mockRestore();
  });
});

describe("GeofenceMap: vehicle polling", () => {
  beforeEach(() => {
    mockGeolocationSuccess();
    jest.useFakeTimers({ legacyFakeTimers: false });
  });

  it("fetches vehicle locations on mount when showVehicles is true", async () => {
    getVehicleLocations.mockResolvedValue({
      vehicles: [{ id: "v1", lat: -25.7, lng: 28.2, status: "active" }],
    });

    render(<GeofenceMap showVehicles />);

    await waitFor(() => expect(getVehicleLocations).toHaveBeenCalled());
  });

  it("does not fetch vehicle locations when showVehicles is false", async () => {
    render(<GeofenceMap showVehicles={false} />);
    await waitFor(() => expect(latestMapInstance()).toBeDefined());

    expect(getVehicleLocations).not.toHaveBeenCalled();
  });

  it("polls on the configured interval and stops on unmount", async () => {
    getVehicleLocations.mockResolvedValue({ vehicles: [] });
    const { unmount } = render(<GeofenceMap showVehicles />);

    await waitFor(() => expect(getVehicleLocations).toHaveBeenCalledTimes(1));

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(getVehicleLocations).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    // No further calls after unmount -- the interval was cleared.
    expect(getVehicleLocations).toHaveBeenCalledTimes(2);
  });
});
