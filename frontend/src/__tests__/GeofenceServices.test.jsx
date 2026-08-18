import useAuthStore from "../store/authStore";
import {
  createGeofence,
  getGeofences,
  getGeofencesGeoJSON,
  updateGeofence,
  deleteGeofence,
  getGeofenceEvents,
  deleteGeofenceEvents,
  discoverFrequentStops,
  createGeofenceFromCluster,
  discoverFrequentEvents,
} from "../services/geofenceServices";

jest.mock("../store/authStore", () => ({
  __esModule: true,
  default: { getState: jest.fn() },
}));

const API_BASE_URL = "http://localhost:5000";

function mockJsonResponse(ok, body) {
  return {
    ok,
    json: jest.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
  useAuthStore.getState.mockReturnValue({ token: "test-token" });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("getAuthHeaders (exercised via every call)", () => {
  it("attaches a Bearer token when one is present", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 0, geofences: [] } }));
    await getGeofences();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { "Content-Type": "application/json", Authorization: "Bearer test-token" },
      })
    );
  });

  it("omits Authorization when there is no token", async () => {
    useAuthStore.getState.mockReturnValue({ token: null });
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 0, geofences: [] } }));
    await getGeofences();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { "Content-Type": "application/json" } })
    );
  });

  it("falls back to no Authorization when the store throws", async () => {
    useAuthStore.getState.mockImplementation(() => {
      throw new Error("store not ready");
    });
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 0, geofences: [] } }));

    await getGeofences();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { "Content-Type": "application/json" } })
    );
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("createGeofence", () => {
  it("POSTs to /api/geofences and unwraps message + geofence", async () => {
    const payload = { name: "Depot", boundary: {} };
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, { data: { message: "created", geofence: { id: 1 } } })
    );

    const result = await createGeofence(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
    );
    expect(result).toEqual({ message: "created", geofence: { id: 1 } });
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(createGeofence({})).rejects.toThrow("Failed to create a geofence");
  });
});

describe("getGeofences", () => {
  it("fetches without a source filter by default", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 2, geofences: [1, 2] } }));
    const result = await getGeofences();

    expect(global.fetch).toHaveBeenCalledWith(`${API_BASE_URL}/api/geofences`, expect.any(Object));
    expect(result).toEqual({ total: 2, geofences: [1, 2] });
  });

  it("appends an encoded source query param when given", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 0, geofences: [] } }));
    await getGeofences("user zones");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences?source=${encodeURIComponent("user zones")}`,
      expect.any(Object)
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(getGeofences()).rejects.toThrow("Failed to fetch geofences");
  });
});

describe("getGeofencesGeoJSON", () => {
  it("fetches the fleet-wide GeoJSON when no vehicle_id is given", async () => {
    const fc = { type: "FeatureCollection", features: [] };
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: fc }));

    const result = await getGeofencesGeoJSON();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/geojson`,
      expect.any(Object)
    );
    expect(result).toEqual(fc);
  });

  it("scopes to a vehicle_id when given", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: {} }));
    await getGeofencesGeoJSON("veh-1");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/geojson?vehicle_id=veh-1`,
      expect.any(Object)
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(getGeofencesGeoJSON()).rejects.toThrow("Failed to fetch geofences geojson");
  });
});

describe("updateGeofence", () => {
  it("sends a PUT with the update body to the geofence's URL", async () => {
    const update = { name: "New name" };
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: {} }));

    await updateGeofence("gf-1", update);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/gf-1`,
      expect.objectContaining({ method: "PUT", body: JSON.stringify(update) })
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(updateGeofence("gf-1", {})).rejects.toThrow("Failed to update geofence");
  });
});

describe("deleteGeofence", () => {
  it("sends a DELETE to the geofence's URL", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { message: "deleted" }));
    await deleteGeofence("gf-1");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/gf-1`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(deleteGeofence("gf-1")).rejects.toThrow("Failed to delete geofence");
  });
});

describe("getGeofenceEvents", () => {
  const baseEvent = (overrides) => ({
    id: 1,
    geofence_id: "gf-1",
    vehicle_id: "veh-1",
    geofence_name: "Depot",
    event_time: "2026-01-01T10:00:00Z",
    created_at: "2026-01-01T09:00:00Z",
    ...overrides,
  });

  it("requests the unscoped events URL when no geofence_id is given", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 0, events: [] } }));
    await getGeofenceEvents();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/events`,
      expect.any(Object)
    );
  });

  it("scopes to a geofence_id when given", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 0, events: [] } }));
    await getGeofenceEvents("gf-1");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/events?geofence_id=gf-1`,
      expect.any(Object)
    );
  });

  it("sorts events newest first by event_time, falling back to created_at", async () => {
    const events = [
      baseEvent({ id: "old", event_time: "2026-01-01T08:00:00Z" }),
      baseEvent({ id: "new", event_time: "2026-01-01T12:00:00Z" }),
      baseEvent({ id: "no-event-time", event_time: undefined, created_at: "2026-01-01T10:30:00Z" }),
    ];
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { total: 3, events } }));

    const result = await getGeofenceEvents();

    expect(result.events.map((e) => e.id)).toEqual(["new", "no-event-time", "old"]);
  });

  it.each([
    ["security_alert", "security", "Security alert - veh-1: Depot"],
    ["hotspot_created", "hotspot", "New hazard detected: Depot"],
    ["entry", "crossing", "veh-1 entry Depot"],
    ["exit", "crossing", "veh-1 exit Depot"],
    ["something_unrecognised", "other", "veh-1 something_unrecognised Depot"],
  ])("maps event_type=%s to kind=%s with the expected message", async (event_type, expectedKind, expectedMessage) => {
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, { data: { total: 1, events: [baseEvent({ event_type })] } })
    );

    const result = await getGeofenceEvents();

    expect(result.events[0].kind).toBe(expectedKind);
    expect(result.events[0].message).toBe(expectedMessage);
    expect(result.events[0].read).toBe(false);
  });

  it("falls back to 'unknown zone' when geofence_name is missing", async () => {
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, {
        data: { total: 1, events: [baseEvent({ event_type: "entry", geofence_name: undefined })] },
      })
    );

    const result = await getGeofenceEvents();
    expect(result.events[0].message).toBe("veh-1 entry unknown zone");
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(getGeofenceEvents()).rejects.toThrow("Failed to fetch geofence events");
  });
});

describe("deleteGeofenceEvents", () => {
  it("sends a plain DELETE when no options are given", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { deleted: 0 } }));
    await deleteGeofenceEvents();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/events`,
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("builds a query string from geofence_id, event_type, and before", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(true, { data: { deleted: 3 } }));
    const result = await deleteGeofenceEvents({
      geofence_id: "gf-1",
      event_type: "entry",
      before: "2026-01-01",
    });

    const [url] = global.fetch.mock.calls[0];
    const params = new URL(url).searchParams;
    expect(params.get("geofence_id")).toBe("gf-1");
    expect(params.get("event_type")).toBe("entry");
    expect(params.get("before")).toBe("2026-01-01");
    expect(result).toEqual({ deleted: 3 });
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(deleteGeofenceEvents()).rejects.toThrow("Failed to delete geofence alerts");
  });
});

describe("discoverFrequentStops", () => {
  it("requests stops for the given vehicle_id", async () => {
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, { data: { total_clusters: 1, clusters: [{}] } })
    );
    const result = await discoverFrequentStops("veh-1");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/discover/stops?vehicle_id=veh-1`,
      expect.any(Object)
    );
    expect(result).toEqual({ total_clusters: 1, clusters: [{}] });
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(discoverFrequentStops("veh-1")).rejects.toThrow("Failed to fetch geofence events");
  });
});

describe("createGeofenceFromCluster", () => {
  it("POSTs the cluster payload and unwraps message + geofence", async () => {
    const payload = { name: "Cluster zone", center_lat: 1, center_lng: 2 };
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, { data: { message: "created", geofence: { id: 5 } } })
    );

    const result = await createGeofenceFromCluster(payload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/discover/create`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) })
    );
    expect(result).toEqual({ message: "created", geofence: { id: 5 } });
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(createGeofenceFromCluster({})).rejects.toThrow(
      "Failed to create geofence from cluster"
    );
  });
});

describe("discoverFrequentEvents", () => {
  it("builds the query string with all three optional params", async () => {
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, { data: { total_hotspots: 0, hotspots: [] } })
    );
    await discoverFrequentEvents("veh-1", "green_driving_type", "harsh_braking");

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/discover/events?vehicle_id=veh-1&event_category=green_driving_type&event_detail=harsh_braking`,
      expect.any(Object)
    );
  });

  it("defaults missing params to empty strings rather than the literal 'undefined'", async () => {
    global.fetch.mockResolvedValue(
      mockJsonResponse(true, { data: { total_hotspots: 0, hotspots: [] } })
    );
    await discoverFrequentEvents();

    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/api/geofences/discover/events?vehicle_id=&event_category=&event_detail=`,
      expect.any(Object)
    );
  });

  it("throws when the response is not ok", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse(false, {}));
    await expect(discoverFrequentEvents()).rejects.toThrow("Failed to fetch geofence events");
  });
});