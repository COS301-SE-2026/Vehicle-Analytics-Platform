import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Geofence from "../pages/geofence/Geofence";

jest.mock("@/components/geofence/ZoneDetails", () => ({
  ZoneDetails: ({ drawnShape, onZoneCreated }) => (
    <div data-testid="zone-details">
      <span data-testid="drawn-shape">{drawnShape ? JSON.stringify(drawnShape) : "none"}</span>
      <button onClick={onZoneCreated}>fire-zone-created</button>
    </div>
  ),
}));

jest.mock("@/components/geofence/ExistingZones", () => ({
  ExistingZones: ({ refreshToken, selectedZone, onZoneFocus }) => (
    <div data-testid="existing-zones">
      <span data-testid="existing-zones-refresh-token">{refreshToken}</span>
      <span data-testid="existing-zones-selected">
        {selectedZone ? JSON.stringify(selectedZone) : "none"}
      </span>
      <button onClick={() => onZoneFocus({ id: "zone-1", source: "user" })}>
        focus-user-zone
      </button>
      <button onClick={() => onZoneFocus({ id: "zone-2", source: "auto_hotspot" })}>
        focus-hazard-zone
      </button>
    </div>
  ),
}));

jest.mock("@/components/geofence/ZoneAlerts", () => ({
  ZoneAlerts: ({ refreshToken, onAlertFocus }) => (
    <div data-testid="zone-alerts">
      <span data-testid="zone-alerts-refresh-token">{refreshToken}</span>
      <button onClick={() => onAlertFocus({ geofence_id: "gf-1", kind: "security" })}>
        focus-security-alert
      </button>
      <button onClick={() => onAlertFocus({ geofence_id: "gf-2", kind: "other" })}>
        focus-other-alert
      </button>
    </div>
  ),
}));

jest.mock("@/components/geofence/GeofenceMap", () => ({
  __esModule: true,
  default: ({ onZoneDrawn, onZoneSelected, onZonesLoaded, focusZoneId, layerMode, showVehicles }) => (
    <div data-testid="geofence-map">
      <span data-testid="map-focus-zone-id">{focusZoneId ?? "none"}</span>
      <span data-testid="map-layer-mode">{layerMode}</span>
      <span data-testid="map-show-vehicles">{String(showVehicles)}</span>
      <button onClick={() => onZoneDrawn({ type: "Feature" })}>fire-zone-drawn</button>
      <button onClick={() => onZoneSelected({ id: "zone-3" })}>fire-zone-selected</button>
      <button onClick={onZonesLoaded}>fire-zones-loaded</button>
    </div>
  ),
}));

function setUrl(path) {
  window.history.pushState({}, "", path);
}

beforeEach(() => {
  setUrl("/geofence");
});

describe("Geofence: layer mode controls", () => {
  it("defaults to the 'all' layer with only that button pressed", () => {
    render(<Geofence />);
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Zones" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Hazards" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("all");
  });

  it("switches layer mode and passes it down to GeofenceMap", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByRole("button", { name: "Zones" }));

    expect(screen.getByRole("button", { name: "Zones" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("zones");
  });
});

describe("Geofence: vehicle toggle", () => {
  it("starts with vehicles shown", () => {
    render(<Geofence />);
    expect(screen.getByRole("button", { name: /vehicles/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("map-show-vehicles")).toHaveTextContent("true");
  });

  it("toggles showVehicles off and back on", () => {
    render(<Geofence />);
    const toggle = screen.getByRole("button", { name: /vehicles/i });

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("map-show-vehicles")).toHaveTextContent("false");

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("map-show-vehicles")).toHaveTextContent("true");
  });
});

describe("Geofence: handleZoneFocus (table row click)", () => {
  it("selects the zone and focuses it on the map", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByText("focus-user-zone"));

    expect(screen.getByTestId("map-focus-zone-id")).toHaveTextContent("zone-1");
    expect(screen.getByTestId("existing-zones-selected")).toHaveTextContent("zone-1");
  });

  it("keeps layer mode when the focused zone is already visible", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByRole("button", { name: "Zones" })); // filter to user zones
    fireEvent.click(screen.getByText("focus-user-zone")); // source: "user" -- stays visible

    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("zones");
  });

  it("resets to 'all' when the focused zone would be hidden by the current filter", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByRole("button", { name: "Zones" })); // filter to user zones
    fireEvent.click(screen.getByText("focus-hazard-zone")); // source: "auto_hotspot" -- would be hidden

    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("all");
  });
});

describe("Geofence: handleAlertFocus", () => {
  it("selects the alert's geofence and focuses it on the map", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByText("focus-security-alert"));

    expect(screen.getByTestId("map-focus-zone-id")).toHaveTextContent("gf-1");
  });

  it("resets to 'all' when a hazard alert is focused under the 'zones' filter", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByRole("button", { name: "Zones" }));
    fireEvent.click(screen.getByText("focus-security-alert")); // kind: "security" -- treated as hazard

    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("all");
  });

  it("resets to 'all' when a non-hazard-kind alert is focused under the 'hazards' filter", () => {
    // Documents current behaviour, not a correctness claim: handleAlertFocus
    // only recognises kind === "security" | "hotspot" as a hazard. Any other
    // kind -- including this "other" -- is treated as a zone for visibility
    // purposes, which may or may not match how the map itself classifies it
    // (GeofenceMap.LAYER_FILTERS.hazards keys off `source`, not `kind`).
    render(<Geofence />);
    fireEvent.click(screen.getByRole("button", { name: "Hazards" }));
    fireEvent.click(screen.getByText("focus-other-alert"));

    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("all");
  });
});

describe("Geofence: zonesVersion / refreshToken propagation", () => {
  it("bumps refreshToken on ExistingZones and ZoneAlerts when a zone is created", () => {
    render(<Geofence />);
    const before = screen.getByTestId("existing-zones-refresh-token").textContent;

    fireEvent.click(screen.getByText("fire-zone-created"));

    expect(screen.getByTestId("existing-zones-refresh-token").textContent).not.toBe(before);
    expect(screen.getByTestId("zone-alerts-refresh-token").textContent).toBe(
      screen.getByTestId("existing-zones-refresh-token").textContent
    );
  });

  it("clears the drawn shape once a zone is created", () => {
    render(<Geofence />);
    fireEvent.click(screen.getByText("fire-zone-drawn"));
    expect(screen.getByTestId("drawn-shape")).toHaveTextContent("Feature");

    fireEvent.click(screen.getByText("fire-zone-created"));
    expect(screen.getByTestId("drawn-shape")).toHaveTextContent("none");
  });
});

describe("Geofence: ?zoneId= URL param on mount", () => {
  it("selects and focuses the zone named in the URL, and strips the param", async () => {
    setUrl("/geofence?zoneId=99");
    render(<Geofence />);

    expect(screen.getByTestId("map-focus-zone-id")).toHaveTextContent("99");
    expect(screen.getByTestId("map-layer-mode")).toHaveTextContent("all");

    await waitFor(() => {
      expect(window.location.search).not.toContain("zoneId");
    });
  });

  it("does nothing when there is no zoneId param", () => {
    render(<Geofence />);
    expect(screen.getByTestId("map-focus-zone-id")).toHaveTextContent("none");
  });
});