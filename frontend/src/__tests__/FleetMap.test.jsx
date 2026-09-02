import { render, waitFor, act } from "@testing-library/react";
import FleetMap from "../components/map/FleetMap";
import { getGeofencesGeoJSON } from "@/services/geofenceServices";

jest.mock("mapbox-gl", () => {
  const instances = [];
  const markerInstances = [];

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
    isStyleLoaded = jest.fn(() => false);
    getCanvas = jest.fn(() => ({ style: {} }));
    easeTo = jest.fn();
    resize = jest.fn();
    remove = jest.fn();
    __fireLoad() {
      (this._handlers.load || []).forEach((cb) => cb());
    }
    // Test helper: simulate a click event on the given layer with the
    // given feature, the way mapboxgl would invoke a click:<layer> handler.
    __fireLayerClick(layer, feature) {
      (this._handlers[`click:${layer}`] || []).forEach((cb) =>
        cb({ features: feature ? [feature] : [] })
      );
    }
  }

  class MockMarker {
    constructor({ element } = {}) {
      this._el = element;
      this._lngLat = { lng: 0, lat: 0 };
      markerInstances.push(this);
    }
    setLngLat(pos) {
      this._lngLat = { lng: pos[0], lat: pos[1] };
      return this;
    }
    getLngLat() {
      return this._lngLat;
    }
    getElement() {
      return this._el;
    }
    addTo() {
      return this;
    }
    remove = jest.fn();
  }

  return {
    __esModule: true,
    default: {
      accessToken: "",
      Map: MockMap,
      NavigationControl: jest.fn(),
      Marker: MockMarker,
      __instances: instances,
      __markerInstances: markerInstances,
    },
  };
});

jest.mock("mapbox-gl/dist/mapbox-gl.css", () => ({}), { virtual: true });

jest.mock("@/services/geofenceServices", () => ({
  getGeofencesGeoJSON: jest.fn(),
}));

function latestMapInstance() {
   
  const mapboxgl = require("mapbox-gl").default;
  return mapboxgl.__instances[mapboxgl.__instances.length - 1];
}

function markerInstances() {
  return require("mapbox-gl").default.__markerInstances;
}

let resizeCallback = null;
beforeAll(() => {
  global.ResizeObserver = class {
    constructor(cb) {
      resizeCallback = cb;
    }
    observe = jest.fn();
    disconnect = jest.fn();
  };
});

let rafQueue = [];
let rafId = 0;
beforeAll(() => {
  global.requestAnimationFrame = jest.fn((cb) => {
    const id = ++rafId;
    rafQueue.push({ id, cb });
    return id;
  });
  global.cancelAnimationFrame = jest.fn((id) => {
    rafQueue = rafQueue.filter((entry) => entry.id !== id);
  });
});
function flushRAF(timestamp) {
  const due = rafQueue;
  rafQueue = [];
  due.forEach(({ cb }) => cb(timestamp));
}

beforeEach(() => {
  jest.clearAllMocks();
  rafQueue = [];
  resizeCallback = null;
  markerInstances().length = 0;
  getGeofencesGeoJSON.mockResolvedValue({ type: "FeatureCollection", features: [] });
});

describe("FleetMap: initialisation", () => {
  it("centers on DEFAULT_CENTER when no initialView is given", () => {
    render(<FleetMap />);
    expect(latestMapInstance().opts.center).toEqual([28.2293, -25.75456]);
    expect(latestMapInstance().opts.zoom).toBe(12);
  });

  it("uses a valid initialView center and zoom", () => {
    render(<FleetMap initialView={{ center: [10, 20], zoom: 8 }} />);
    expect(latestMapInstance().opts.center).toEqual([10, 20]);
    expect(latestMapInstance().opts.zoom).toBe(8);
  });

  it("falls back to DEFAULT_CENTER when initialView is [0, 0] (treated as unset)", () => {
    render(<FleetMap initialView={{ center: [0, 0], zoom: 8 }} />);
    expect(latestMapInstance().opts.center).toEqual([28.2293, -25.75456]);
  });

  it("falls back to DEFAULT_CENTER when initialView contains NaN", () => {
    render(<FleetMap initialView={{ center: [NaN, 20], zoom: 8 }} />);
    expect(latestMapInstance().opts.center).toEqual([28.2293, -25.75456]);
  });

  it("adds the geofence and trail sources/layers once the style loads", () => {
    render(<FleetMap />);
    const mapInstance = latestMapInstance();
    act(() => mapInstance.__fireLoad());

    expect(mapInstance.addSource).toHaveBeenCalledWith(
      "fleetmap-geofences",
      expect.objectContaining({ type: "geojson" })
    );
    expect(mapInstance.addSource).toHaveBeenCalledWith(
      "fleetmap-trails",
      expect.objectContaining({ type: "geojson", lineMetrics: true })
    );
    expect(mapInstance.addLayer).toHaveBeenCalledTimes(3); // fill, outline, trail line
  });

  it("fetches geofences on load and populates the geofence source", async () => {
    const fc = { type: "FeatureCollection", features: [{ type: "Feature" }] };
    getGeofencesGeoJSON.mockResolvedValue(fc);

    render(<FleetMap />);
    const mapInstance = latestMapInstance();
    act(() => mapInstance.__fireLoad());

    await waitFor(() =>
      expect(mapInstance.getSource("fleetmap-geofences").setData).toHaveBeenCalledWith(fc)
    );
  });

  it("logs without throwing when the geofence fetch fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getGeofencesGeoJSON.mockRejectedValue(new Error("network down"));

    render(<FleetMap />);
    act(() => latestMapInstance().__fireLoad());

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("FleetMap: failed to load geofences", expect.any(Error))
    );
    consoleError.mockRestore();
  });
});

describe("FleetMap: resize handling", () => {
  it("calls map.resize() when the container's ResizeObserver fires", () => {
    render(<FleetMap />);
    const mapInstance = latestMapInstance();

    act(() => resizeCallback([]));
    expect(mapInstance.resize).toHaveBeenCalled();
  });
});

describe("FleetMap: geofence click handling", () => {
  it("calls onGeofenceClick with the clicked feature's properties", () => {
    const onGeofenceClick = jest.fn();
    render(<FleetMap onGeofenceClick={onGeofenceClick} />);
    const mapInstance = latestMapInstance();

    act(() => mapInstance.__fireLoad());

    // DIAGNOSTIC -- remove once the root cause is found.
    console.log("registered click handlers:", mapInstance._handlers["click:fleetmap-geofences-fill"]);
    console.log("all handler keys:", Object.keys(mapInstance._handlers));

    mapInstance.__fireLayerClick("fleetmap-geofences-fill", {
      properties: { id: "gf-1", name: "Depot" },
    });

    expect(onGeofenceClick).toHaveBeenCalledWith({ id: "gf-1", name: "Depot" });
  });

  it("does nothing when the click event has no feature", () => {
    const onGeofenceClick = jest.fn();
    render(<FleetMap onGeofenceClick={onGeofenceClick} />);
    const mapInstance = latestMapInstance();
    act(() => mapInstance.__fireLoad());

    mapInstance.__fireLayerClick("fleetmap-geofences-fill", null);

    expect(onGeofenceClick).not.toHaveBeenCalled();
  });

  it("does not bind a click handler at all when onGeofenceClick is not given", () => {
    render(<FleetMap />);
    const mapInstance = latestMapInstance();
    act(() => mapInstance.__fireLoad());

    expect(mapInstance._handlers["click:fleetmap-geofences-fill"]).toBeUndefined();
  });
});

describe("FleetMap: trail buffer", () => {
  it("sets trail data when the buffer has a new timestamp", () => {
    render(<FleetMap buffer={{ type: "FeatureCollection", features: [], timestamp: 111 }} />);
    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    expect(mapInstance.getSource("fleetmap-trails").setData).toHaveBeenCalled();
  });

  it("does not re-set trail data when the buffer's timestamp is unchanged", () => {
    const buffer = { type: "FeatureCollection", features: [], timestamp: 111 };
    const { rerender } = render(<FleetMap buffer={buffer} />);
    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    const callsAfterFirst = mapInstance.getSource("fleetmap-trails").setData.mock.calls.length;
    rerender(<FleetMap buffer={{ ...buffer }} />); // same timestamp, new object identity

    expect(mapInstance.getSource("fleetmap-trails").setData.mock.calls.length).toBe(callsAfterFirst);
  });
});

describe("FleetMap: vehicle markers", () => {
  it("creates one marker per vehicle with finite coordinates", () => {
    render(
      <FleetMap
        vehicles={[
          { id: "v1", lat: -25.7, lng: 28.2, status: "active" },
          { id: "v2", lat: -25.8, lng: 28.3, status: "idle" },
        ]}
      />
    );
    expect(markerInstances()).toHaveLength(2);
  });

  it("skips a vehicle with non-finite coordinates and creates no marker for it", () => {
    render(
      <FleetMap
        vehicles={[
          { id: "v1", lat: NaN, lng: 28.2, status: "active" },
          { id: "v2", lat: -25.8, lng: 28.3, status: "idle" },
        ]}
      />
    );
    expect(markerInstances()).toHaveLength(1);
  });

  it("updates an existing marker's colour on status change instead of creating a new one", () => {
    const vehicle = { id: "v1", lat: -25.7, lng: 28.2, status: "active" };
    const { rerender } = render(<FleetMap vehicles={[vehicle]} />);
    expect(markerInstances()).toHaveLength(1);

    rerender(<FleetMap vehicles={[{ ...vehicle, status: "idle" }]} />);

    expect(markerInstances()).toHaveLength(1);
    expect(markerInstances()[0].getElement().style.backgroundColor).toBe("rgb(245, 158, 11)"); // idle colour
  });

  it("removes the marker for a vehicle that drops out of the list", () => {
    const v1 = { id: "v1", lat: -25.7, lng: 28.2, status: "active" };
    const v2 = { id: "v2", lat: -25.8, lng: 28.3, status: "idle" };
    const { rerender } = render(<FleetMap vehicles={[v1, v2]} />);
    expect(markerInstances()).toHaveLength(2);

    const v1Marker = markerInstances()[0];
    const v2Marker = markerInstances()[1];

    rerender(<FleetMap vehicles={[v1]} />);

    expect(v2Marker.remove).toHaveBeenCalled();
    expect(v1Marker.remove).not.toHaveBeenCalled();
  });

  it("calls onVehicleClick with the vehicle when its marker is clicked and minimal is false", () => {
    const onVehicleClick = jest.fn();
    const vehicle = { id: "v1", lat: -25.7, lng: 28.2, status: "active" };
    render(<FleetMap vehicles={[vehicle]} onVehicleClick={onVehicleClick} minimal={false} />);

    markerInstances()[0].getElement().onclick({ preventDefault: jest.fn(), stopPropagation: jest.fn() });

    expect(onVehicleClick).toHaveBeenCalledWith(vehicle);
  });

  it("does not attach a click handler when minimal is true", () => {
    const onVehicleClick = jest.fn();
    const vehicle = { id: "v1", lat: -25.7, lng: 28.2, status: "active" };
    render(<FleetMap vehicles={[vehicle]} onVehicleClick={onVehicleClick} minimal />);

    expect(markerInstances()[0].getElement().onclick).toBeNull();
  });

  
});

describe("FleetMap: minimal single-vehicle recenter", () => {
  it("eases to the vehicle's position when minimal and exactly one vehicle", () => {
    render(
      <FleetMap minimal vehicles={[{ id: "v1", lat: -25.7, lng: 28.2, status: "active" }]} />
    );
    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    expect(mapInstance.easeTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [28.2, -25.7], zoom: 15 })
    );
  });

  it("does not recenter when there is more than one vehicle", () => {
    render(
      <FleetMap
        minimal
        vehicles={[
          { id: "v1", lat: -25.7, lng: 28.2, status: "active" },
          { id: "v2", lat: -25.8, lng: 28.3, status: "idle" },
        ]}
      />
    );
    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    expect(mapInstance.easeTo).not.toHaveBeenCalled();
  });

  it("does not recenter when minimal is false", () => {
    render(<FleetMap vehicles={[{ id: "v1", lat: -25.7, lng: 28.2, status: "active" }]} />);
    const mapInstance = latestMapInstance();
    mapInstance.isStyleLoaded.mockReturnValue(true);
    act(() => mapInstance.__fireLoad());

    expect(mapInstance.easeTo).not.toHaveBeenCalled();
  });
});