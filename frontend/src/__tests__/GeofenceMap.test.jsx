import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import GeofenceMap, { LAYER_FILTERS } from "./GeofenceMap";
import mapboxgl from "mapbox-gl";
import { getGeofencesGeoJSON } from "@/services/geofenceServices";
import { getVehicleLocations } from "@/services/vehicleService";

// --- Mocks ---
vi.mock("@/services/geofenceServices", () => ({
  getGeofencesGeoJSON: vi.fn().mockResolvedValue({
    type: "FeatureCollection",
    features: [],
  }),
}));

vi.mock("@/services/vehicleService", () => ({
  getVehicleLocations: vi.fn().mockResolvedValue({ vehicles: [] }),
}));

vi.mock("mapbox-gl", () => {
  const mockMap = {
    addControl: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    once: vi.fn(),
    remove: vi.fn(),
    addSource: vi.fn(),
    addLayer: vi.fn(),
    getLayer: vi.fn().mockReturnValue(true),
    getSource: vi.fn().mockReturnValue({ setData: vi.fn() }),
    isStyleLoaded: vi.fn().mockReturnValue(true),
    getCanvas: vi.fn().mockReturnValue({ style: {} }),
  };

  return {
    default: {
      accessToken: "",
      Map: vi.fn(() => mockMap),
      NavigationControl: vi.fn(),
      Marker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        setPopup: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
        getElement: vi.fn().mockReturnValue(document.createElement("div")),
      })),
      Popup: vi.fn(() => ({
        setHTML: vi.fn().mockReturnThis(),
      })),
      LngLatBounds: vi.fn(() => ({
        extend: vi.fn(),
        isEmpty: vi.fn().mockReturnValue(false),
      })),
    },
  };
});

vi.mock("@mapbox/mapbox-gl-draw", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      getAll: vi.fn().mockReturnValue({ features: [] }),
    })),
  };
});

describe("GeofenceMap Component", () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Setup navigator.geolocation mock
    Object.defineProperty(global.navigator, "geolocation", {
      value: mockGeolocation,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports correct layer filter definitions", () => {
    expect(LAYER_FILTERS.all).toBeNull();
    expect(LAYER_FILTERS.zones).toEqual(["==", ["get", "source"], "user"]);
    expect(LAYER_FILTERS.hazards[0]).toBe("in");
  });

  it("displays loading spinner initially while obtaining geolocation", () => {
    render(<GeofenceMap />);
    expect(screen.getByText("Locating you...")).toBeInTheDocument();
  });

  it("initializes map when geolocation succeeds", async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success({ coords: { longitude: 28.0, latitude: -26.0 } })
    );

    render(<GeofenceMap />);

    await waitFor(() => {
      expect(mapboxgl.Map).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [28.0, -26.0],
          zoom: 12,
        })
      );
    });

    expect(screen.queryByText("Locating you...")).not.toBeInTheDocument();
  });

  it("falls back to default coordinates when geolocation fails", async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((_, error) =>
      error({ message: "User denied Geolocation" })
    );

    render(<GeofenceMap />);

    await waitFor(() => {
      expect(mapboxgl.Map).toHaveBeenCalledWith(
        expect.objectContaining({
          center: [28.2293, -25.75456],
        })
      );
    });
  });

  it("fetches geofences and vehicle locations on mount", async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) =>
      success({ coords: { longitude: 28.0, latitude: -26.0 } })
    );

    render(<GeofenceMap showVehicles={true} />);

    await waitFor(() => {
      expect(getGeofencesGeoJSON).toHaveBeenCalledTimes(1);
      expect(getVehicleLocations).toHaveBeenCalled();
    });
  });
});