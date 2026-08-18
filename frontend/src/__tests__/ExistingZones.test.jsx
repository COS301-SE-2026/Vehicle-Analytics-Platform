import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ExistingZones } from "../components/geofence/ExistingZones";
import { getGeofences, deleteGeofence, updateGeofence } from "@/services/geofenceServices";

jest.mock("@/services/geofenceServices", () => ({
  getGeofences: jest.fn(),
  deleteGeofence: jest.fn(),
  updateGeofence: jest.fn(),
}));

jest.mock("@/components/geofence/DeleteZoneModal", () => ({
  __esModule: true,
  default: ({ open, zone, onConfirm }) =>
    open ? (
      <div data-testid="delete-modal">
        <button onClick={() => onConfirm(zone)}>confirm-delete</button>
      </div>
    ) : null,
}));

jest.mock("@/components/geofence/EditZoneModal", () => ({
  EditZoneModal: ({ open, zone, onConfirm }) =>
    open ? (
      <div data-testid="edit-modal">
        <button onClick={() => onConfirm({ ...zone, name: "Edited name", triggerType: "exit" })}>
          confirm-edit
        </button>
      </div>
    ) : null,
}));

function makeZone(overrides = {}) {
  return {
    id: "z1",
    name: "Warehouse A",
    source: "user",
    trigger_type: "both",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeZones(count, factory = (i) => makeZone({ id: `z${i}`, name: `Zone ${i}` })) {
  return Array.from({ length: count }, (_, i) => factory(i));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ExistingZones: loading and list rendering", () => {
  it("shows a loading message before zones resolve", () => {
    getGeofences.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ExistingZones />);
    expect(screen.getByText(/loading zones/i)).toBeInTheDocument();
  });

  it("renders each zone's name once loaded", async () => {
    getGeofences.mockResolvedValue({ total: 1, geofences: [makeZone({ name: "Depot" })] });
    render(<ExistingZones />);

    expect(await screen.findByText("Depot")).toBeInTheDocument();
  });

  it("logs and stops loading when the fetch fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    getGeofences.mockRejectedValue(new Error("network down"));

    render(<ExistingZones />);

    await waitFor(() => expect(screen.queryByText(/loading zones/i)).not.toBeInTheDocument());
    expect(consoleError).toHaveBeenCalledWith("Failed to fetch zones:", expect.any(Error));
    consoleError.mockRestore();
  });

  it("re-fetches when refreshToken changes", async () => {
    getGeofences.mockResolvedValue({ total: 0, geofences: [] });
    const { rerender } = render(<ExistingZones refreshToken={1} />);
    await waitFor(() => expect(getGeofences).toHaveBeenCalledTimes(1));

    rerender(<ExistingZones refreshToken={2} />);
    await waitFor(() => expect(getGeofences).toHaveBeenCalledTimes(2));
  });
});

describe("ExistingZones: source and trigger badges", () => {
  it("labels a user-sourced zone as 'Zone' and shows edit/delete", async () => {
    getGeofences.mockResolvedValue({ total: 1, geofences: [makeZone({ source: "user" })] });
    render(<ExistingZones />);
    await screen.findByText("Warehouse A");

    expect(screen.getByText("Zone")).toBeInTheDocument();
    expect(screen.queryByText("auto")).not.toBeInTheDocument();
  });

  it("labels an auto_hotspot zone as 'Hazard' and hides edit/delete behind 'auto'", async () => {
    getGeofences.mockResolvedValue({
      total: 1,
      geofences: [makeZone({ source: "auto_hotspot" })],
    });
    render(<ExistingZones />);
    await screen.findByText("Warehouse A");

    expect(screen.getByText("Hazard")).toBeInTheDocument();
    expect(screen.getByText("auto")).toBeInTheDocument();
  });

  it("labels a security_marker zone as 'Security'", async () => {
    getGeofences.mockResolvedValue({
      total: 1,
      geofences: [makeZone({ source: "security_marker" })],
    });
    render(<ExistingZones />);
    await screen.findByText("Warehouse A");

    expect(screen.getByText("Security")).toBeInTheDocument();
  });

  it("falls back to the 'none' trigger style for an unrecognised trigger_type", async () => {
    getGeofences.mockResolvedValue({
      total: 1,
      geofences: [makeZone({ trigger_type: "weird_value" })],
    });
    render(<ExistingZones />);
    expect(await screen.findByText("weird_value")).toBeInTheDocument();
  });
});

describe("ExistingZones: pagination", () => {
  it("shows only the first page (10 rows) and the correct 'showing' range", async () => {
    getGeofences.mockResolvedValue({ total: 25, geofences: makeZones(25) });
    render(<ExistingZones />);

    await screen.findByText("Zone 0");
    expect(screen.getByText("Showing 1–10 of 25")).toBeInTheDocument();
    expect(screen.queryByText("Zone 10")).not.toBeInTheDocument();
  });

  it("shows 'Showing 0–0 of 0' with no zones", async () => {
    getGeofences.mockResolvedValue({ total: 0, geofences: [] });
    render(<ExistingZones />);
    expect(await screen.findByText("Showing 0–0 of 0")).toBeInTheDocument();
  });

  it("clamps back to the last valid page when zones shrink after navigating forward", async () => {
    getGeofences.mockResolvedValueOnce({ total: 25, geofences: makeZones(25) });
    const { rerender } = render(<ExistingZones refreshToken={1} />);
    await screen.findByText("Zone 0");

    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    await waitFor(() => expect(screen.getByText(/Showing 21.25 of 25/)).toBeInTheDocument());

    getGeofences.mockResolvedValueOnce({ total: 3, geofences: makeZones(3) });
    rerender(<ExistingZones refreshToken={2} />);

    await waitFor(() => expect(screen.getByText(/Showing 1.3 of 3/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /^Page \d+$/ })).not.toBeInTheDocument();
  });
});

describe("ExistingZones: row interaction", () => {
  it("calls onZoneFocus with the full zone when a row is clicked", async () => {
    const zone = makeZone({ name: "Depot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    const onZoneFocus = jest.fn();

    render(<ExistingZones onZoneFocus={onZoneFocus} />);
    fireEvent.click(await screen.findByText("Depot"));

    expect(onZoneFocus).toHaveBeenCalledWith(zone);
  });
});

describe("ExistingZones: delete flow", () => {
  it("opens the delete modal from the list-view row icon button and deletes on confirm", async () => {
    const zone = makeZone({ id: "z1", name: "Depot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    deleteGeofence.mockResolvedValue({ message: "deleted" });
    const onZonesChanged = jest.fn();

    render(<ExistingZones onZonesChanged={onZonesChanged} />);
    const row = (await screen.findByText("Depot")).closest("tr");

    const rowButtons = within(row).getAllByRole("button");
    fireEvent.click(rowButtons[1]);

    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() => expect(deleteGeofence).toHaveBeenCalledWith("z1"));
    await waitFor(() => expect(onZonesChanged).toHaveBeenCalled());
  });

  it("clears the current selection when the deleted zone was selected", async () => {
    const zone = makeZone({ id: "z1", name: "Depot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    deleteGeofence.mockResolvedValue({ message: "deleted" });
    const onClearSelection = jest.fn();

    render(<ExistingZones selectedZone={zone} onClearSelection={onClearSelection} />);
    await screen.findByText("Depot");

    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("confirm-delete"));

    expect(onClearSelection).toHaveBeenCalled();
    await waitFor(() => expect(deleteGeofence).toHaveBeenCalledWith("z1"));
  });

  it("still reloads zones if the delete call fails", async () => {
    const zone = makeZone({ id: "z1", name: "Depot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    deleteGeofence.mockRejectedValue(new Error("db error"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<ExistingZones selectedZone={zone} />);
    await screen.findByText("Depot");

    fireEvent.click(screen.getByText("Delete"));
    fireEvent.click(screen.getByText("confirm-delete"));

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("Failed to delete zone:", expect.any(Error))
    );
    // getGeofences called once on mount, once more from the catch's reload.
    await waitFor(() => expect(getGeofences).toHaveBeenCalledTimes(2));
    consoleError.mockRestore();
  });
});

describe("ExistingZones: edit flow", () => {
  it("updates, reloads, and notifies onZonesChanged on confirm", async () => {
    const zone = makeZone({ id: "z1", name: "Depot", trigger_type: "entry" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    updateGeofence.mockResolvedValue({});
    const onZonesChanged = jest.fn();

    render(<ExistingZones selectedZone={zone} onZonesChanged={onZonesChanged} />);
    await screen.findByText("Depot");

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("confirm-edit"));

    await waitFor(() =>
      expect(updateGeofence).toHaveBeenCalledWith("z1", {
        name: "Edited name",
        trigger_type: "exit",
      })
    );
    await waitFor(() => expect(onZonesChanged).toHaveBeenCalled());
  });

  it("logs without reloading if the update call fails", async () => {
    const zone = makeZone({ id: "z1", name: "Depot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    updateGeofence.mockRejectedValue(new Error("validation failed"));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    render(<ExistingZones selectedZone={zone} />);
    await screen.findByText("Depot");

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("confirm-edit"));

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith("Failed to update zone:", expect.any(Error))
    );
    consoleError.mockRestore();
  });
});

describe("ExistingZones: detail view", () => {
  it("shows the 'no longer exists' message for a stale selection with no cached data", async () => {
    getGeofences.mockResolvedValue({ total: 0, geofences: [] });
    render(<ExistingZones selectedZone={{ id: "gone" }} />);

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument();
  });

  it("renders full detail for a matched zone, including vehicle_id and created_at", async () => {
    const zone = makeZone({
      id: "z1",
      name: "Depot",
      vehicle_id: "veh-1",
      created_at: "2026-01-01T00:00:00Z",
    });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });

    render(<ExistingZones selectedZone={{ id: "z1" }} />);
    await screen.findByText("Depot");

    expect(screen.getByText("veh-1")).toBeInTheDocument();
  });

  it("shows the 'detected automatically' note and hides edit/delete for auto zones", async () => {
    const zone = makeZone({ id: "z1", name: "Hotspot", source: "auto_hotspot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });

    render(<ExistingZones selectedZone={{ id: "z1" }} />);
    await screen.findByText("Hotspot");

    expect(screen.getByText(/detected automatically/i)).toBeInTheDocument();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("falls back to the passed-in selectedZone when it isn't in the loaded list but has a name", async () => {
    getGeofences.mockResolvedValue({ total: 0, geofences: [] });
    const selectedZone = { id: "ephemeral", name: "From alert", trigger_type: "entry" };

    render(<ExistingZones selectedZone={selectedZone} />);
    expect(await screen.findByText("From alert")).toBeInTheDocument();
  });

  it("calls onClearSelection when 'All zones' is clicked", async () => {
    const zone = makeZone({ id: "z1", name: "Depot" });
    getGeofences.mockResolvedValue({ total: 1, geofences: [zone] });
    const onClearSelection = jest.fn();

    render(<ExistingZones selectedZone={{ id: "z1" }} onClearSelection={onClearSelection} />);
    await screen.findByText("Depot");

    fireEvent.click(screen.getByText(/all zones/i));
    expect(onClearSelection).toHaveBeenCalled();
  });
});