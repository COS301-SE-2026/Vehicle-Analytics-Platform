import { render, screen, fireEvent, act } from "@testing-library/react";
import FleetMapPlaceholder from "../components/dashboard/LiveFleetMapPlaceholder";

let lastOnVehicleClick = null;
jest.mock("../components/map/FleetMap", () => ({
  __esModule: true,
  default: ({ vehicles, buffer, initialView, onGeofenceClick, onVehicleClick, minimal }) => {
    lastOnVehicleClick = onVehicleClick;
    return (
      <div data-testid="fleet-map">
        <span data-testid="map-vehicle-count">{vehicles?.length ?? 0}</span>
        <span data-testid="map-buffer-timestamp">{buffer?.timestamp ?? "none"}</span>
        <span data-testid="map-initial-zoom">{initialView?.zoom ?? "none"}</span>
        <span data-testid="map-minimal">{String(minimal)}</span>
        <button onClick={() => onGeofenceClick?.({ id: "gf-1" })}>fire-geofence-click</button>
      </div>
    );
  },
}));

jest.mock("lucide-react", () => ({
  Truck: (props) => <svg data-testid="icon-truck" {...props} />,
  X: (props) => <svg data-testid="icon-x" {...props} />,
  MapPin: (props) => <svg data-testid="icon-mappin" {...props} />,
  Clock: (props) => <svg data-testid="icon-clock" {...props} />,
  Waypoints: (props) => <svg data-testid="icon-waypoints" {...props} />,
}));

function clickVehicle(vehicle) {
  act(() => {
    lastOnVehicleClick(vehicle);
  });
}

function baseProps(overrides = {}) {
  return {
    active: 3,
    idle: 1,
    offline: 2,
    total: 6,
    vehicles: [{ id: "v1", status: "active", speed: 42 }],
    buffer: { type: "FeatureCollection", features: [] },
    ...overrides,
  };
}

beforeEach(() => {
  lastOnVehicleClick = null;
});

describe("FleetMapPlaceholder: summary card", () => {
  it("renders active/idle/offline/total counts", () => {
    render(<FleetMapPlaceholder {...baseProps({ active: 5, idle: 2, offline: 1, total: 8, vehicles: [] })} />);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});

describe("FleetMapPlaceholder: props passed to FleetMap", () => {
  it("passes vehicles, buffer, initialView, minimal=false, and onGeofenceClick through", () => {
    const onGeofenceClick = jest.fn();
    render(
      <FleetMapPlaceholder
        {...baseProps({
          buffer: { type: "FeatureCollection", features: [], timestamp: 999 },
          vehicles: [{ id: "v1" }, { id: "v2" }],
        })}
        initialView={{ center: [10, 20], zoom: 14 }}
        onGeofenceClick={onGeofenceClick}
      />
    );

    expect(screen.getByTestId("map-vehicle-count")).toHaveTextContent("2");
    expect(screen.getByTestId("map-buffer-timestamp")).toHaveTextContent("999");
    expect(screen.getByTestId("map-initial-zoom")).toHaveTextContent("14");
    expect(screen.getByTestId("map-minimal")).toHaveTextContent("false");

    fireEvent.click(screen.getByText("fire-geofence-click"));
    expect(onGeofenceClick).toHaveBeenCalledWith({ id: "gf-1" });
  });
});

describe("FleetMapPlaceholder: vehicle panel visibility", () => {
  it("shows no panel initially", () => {
    render(<FleetMapPlaceholder {...baseProps()} />);
    expect(screen.queryByText("Current Speed")).not.toBeInTheDocument();
  });

  it("opens the panel with the matching vehicle when a marker is clicked", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", status: "active", speed: 42 }] })} />);
    clickVehicle({ id: "v1" });

    expect(screen.getByText("v1")).toBeInTheDocument();
    expect(screen.getByText("Current Speed")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("matches vehicle id across string/number type mismatches", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: 7, status: "idle" }] })} />);
    clickVehicle({ id: "7" }); // clicked marker reports a string id

    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("shows no panel if the clicked vehicle id has no match in the current vehicles list", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1" }] })} />);
    clickVehicle({ id: "unknown-id" });

    expect(screen.queryByText("Current Speed")).not.toBeInTheDocument();
  });

  it("closes the panel when the close button is clicked", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", status: "active" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText("Current Speed")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("icon-x").closest("button"));
    expect(screen.queryByText("Current Speed")).not.toBeInTheDocument();
  });

  it("closes the panel when a null vehicle id is reported", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", status: "active" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText("Current Speed")).toBeInTheDocument();

    clickVehicle(null);
    expect(screen.queryByText("Current Speed")).not.toBeInTheDocument();
  });
});

describe("FleetMapPlaceholder: VehiclePanel status", () => {
  it("shows MOVING with green styling when status is active", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", status: "active" }] })} />);
    clickVehicle({ id: "v1" });

    const badge = screen.getByText("MOVING");
    expect(badge.className).toEqual(expect.stringContaining("bg-green-100"));
  });

  it("shows the uppercased status with amber styling for a non-active status", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", status: "idle" }] })} />);
    clickVehicle({ id: "v1" });

    const badge = screen.getByText("IDLE");
    expect(badge.className).toEqual(expect.stringContaining("bg-amber-100"));
  });

  it("falls back to UNKNOWN when status is missing", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1" }] })} />);
    clickVehicle({ id: "v1" });

    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });
});

describe("FleetMapPlaceholder: VehiclePanel location fallback chain", () => {
  it("prefers displayName over city and coordinates", () => {
    render(
      <FleetMapPlaceholder
        {...baseProps({
          vehicles: [{ id: "v1", displayName: "Depot Rd", city: "Pretoria", lat: -25.7, lng: 28.2 }],
        })}
      />
    );
    clickVehicle({ id: "v1" });
    expect(screen.getByText("Depot Rd")).toBeInTheDocument();
  });

  it("falls back to city when displayName is absent", () => {
    render(
      <FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", city: "Pretoria", lat: -25.7, lng: 28.2 }] })} />
    );
    clickVehicle({ id: "v1" });
    expect(screen.getByText("Pretoria")).toBeInTheDocument();
  });

  it("falls back to formatted coordinates when displayName and city are absent", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", lat: -25.75456, lng: 28.2293 }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText("-25.7546, 28.2293")).toBeInTheDocument();
  });

  it("falls back to 'Unknown' when nothing is available", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });
});

describe("FleetMapPlaceholder: VehiclePanel lastUpdate formatting", () => {
  it("formats a Date instance as a locale time", () => {
    const date = new Date("2026-01-01T10:30:00");
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", lastUpdate: date }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText(date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }))).toBeInTheDocument();
  });

  it("parses a valid date string and formats it the same way", () => {
    const iso = "2026-01-01T10:30:00";
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", lastUpdate: iso }] })} />);
    clickVehicle({ id: "v1" });
    const expected = new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("shows an unparseable string as-is rather than 'Invalid Date'", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", lastUpdate: "not a date" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText("not a date")).toBeInTheDocument();
  });

  it("shows 'Unknown' when lastUpdate is missing", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });
});

describe("FleetMapPlaceholder: VehiclePanel remaining fields", () => {
  it("shows odometer, ignition, and movement when present", () => {
    render(
      <FleetMapPlaceholder
        {...baseProps({
          vehicles: [{ id: "v1", total_odometer: 12345, ignition: "On", movement: "Movement On" }],
        })}
      />
    );
    clickVehicle({ id: "v1" });
    expect(screen.getByText("12345")).toBeInTheDocument();
    expect(screen.getByText("On")).toBeInTheDocument();
    expect(screen.getByText("Movement On")).toBeInTheDocument();
  });

  it("falls back to 'Unknown' for ignition and movement when absent", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getAllByText("Unknown").length).toBeGreaterThanOrEqual(2);
  });

  it("shows device_id when present, falling back to 'Vehicle'", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1", device_id: "IMEI-123" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText("IMEI-123")).toBeInTheDocument();
  });

  it("falls back to 'Vehicle' when device_id is absent", () => {
    render(<FleetMapPlaceholder {...baseProps({ vehicles: [{ id: "v1" }] })} />);
    clickVehicle({ id: "v1" });
    expect(screen.getByText("Vehicle")).toBeInTheDocument();
  });
});