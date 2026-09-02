import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ZoneAlerts } from "../components/geofence/ZoneAlerts";
import { getGeofenceEvents, deleteGeofenceEvents } from "@/services/geofenceServices";

jest.mock("@/services/geofenceServices", () => ({
	getGeofenceEvents: jest.fn(),
	deleteGeofenceEvents: jest.fn(),
}));

jest.mock('@/components/ui/button', () => ({
	Button: ({ children, onClick, className, type }) => (
		<button type={type || 'button'} onClick={onClick} className={className}>{children}</button>
	),
}));

jest.mock("lucide-react", () => ({
	AlertTriangle: (props) => <svg data-testid="icon-crossing" {...props} />,
	Bell: (props) => <svg data-testid="icon-other" {...props} />,
	ShieldAlert: (props) => <svg data-testid="icon-security" {...props} />,
	MapPinned: (props) => <svg data-testid="icon-hotspot" {...props} />,
	Trash2: (props) => <svg data-testid="icon-trash" {...props} />,
	ChevronLeft: (props) => <svg data-testid="icon-chevron-left" {...props} />,
	ChevronRight: (props) => <svg data-testid="icon-chevron-right" {...props} />,
}));

function makeAlert(overrides = {}) {
	return {
		id: "a1",
		kind: "other",
		message: "Something happened",
		time: "1/1/2026, 10:00:00 AM",
		geofence_id: "gf-1",
		...overrides,
	};
}

function makeAlerts(count) {
	return Array.from({ length: count }, (_, i) =>
		makeAlert({ id: `a${i}`, message: `Alert ${i}` })
	);
}

beforeEach(() => {
	jest.clearAllMocks();
});

describe("ZoneAlerts: loading and empty states", () => {
	it("shows a loading message before alerts resolve", () => {
		getGeofenceEvents.mockReturnValue(new Promise(() => {}));
		render(<ZoneAlerts />);
		expect(screen.getByText(/loading alerts/i)).toBeInTheDocument();
	});

	it("shows 'No alerts.' and hides Clear/pagination when there are none", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 0, events: [] });
		render(<ZoneAlerts />);

		expect(await screen.findByText("No alerts.")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /clear all alerts/i })).not.toBeInTheDocument();
		expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();
	});

	it("logs and stops loading when the fetch fails", async () => {
		const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
		getGeofenceEvents.mockRejectedValue(new Error("network down"));

		render(<ZoneAlerts />);

		await waitFor(() => expect(screen.queryByText(/loading alerts/i)).not.toBeInTheDocument());
		expect(consoleError).toHaveBeenCalledWith("Failed to fetch alerts: ", expect.any(Error));
		consoleError.mockRestore();
	});
});

describe("ZoneAlerts: rendering alerts", () => {
	it("renders each alert's message and time", async () => {
		getGeofenceEvents.mockResolvedValue({
			total: 1,
			events: [makeAlert({ message: "Depot breached", time: "yesterday" })],
		});
		render(<ZoneAlerts />);

		expect(await screen.findByText("Depot breached")).toBeInTheDocument();
		expect(screen.getByText("yesterday")).toBeInTheDocument();
	});

	it.each([
		["security", "icon-security"],
		["hotspot", "icon-hotspot"],
		["crossing", "icon-crossing"],
		["other", "icon-other"],
		["unrecognised_kind", "icon-other"],
	])("shows the %s icon for kind=%s", async (kind, expectedTestId) => {
		getGeofenceEvents.mockResolvedValue({ total: 1, events: [makeAlert({ kind })] });
		render(<ZoneAlerts />);

		await screen.findByText("Something happened");
		expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
	});

	it("applies alert styling only to security-kind alerts", async () => {
		getGeofenceEvents.mockResolvedValue({
			total: 1,
			events: [makeAlert({ kind: "security", message: "Break-in" })],
		});
		render(<ZoneAlerts />);

		const message = await screen.findByText("Break-in");
		expect(message.className).toEqual(expect.stringContaining("text-fleet-alert"));
	});
});

describe("ZoneAlerts: focus interaction", () => {
	it("renders as a clickable button and calls onAlertFocus when geofence_id and onAlertFocus are both present", async () => {
		const alert = makeAlert({ geofence_id: "gf-1", message: "Depot breach" });
		getGeofenceEvents.mockResolvedValue({ total: 1, events: [alert] });
		const onAlertFocus = jest.fn();

		render(<ZoneAlerts onAlertFocus={onAlertFocus} />);
		const button = await screen.findByRole("button", { name: /show depot breach on map/i });
		fireEvent.click(button);

		expect(onAlertFocus).toHaveBeenCalledWith(alert);
	});

	it("renders as a plain (non-interactive) div when geofence_id is missing", async () => {
		getGeofenceEvents.mockResolvedValue({
			total: 1,
			events: [makeAlert({ geofence_id: null, message: "Fleet-wide hotspot" })],
		});
		const onAlertFocus = jest.fn();

		render(<ZoneAlerts onAlertFocus={onAlertFocus} />);
		await screen.findByText("Fleet-wide hotspot");

		expect(screen.queryByRole("button", { name: /show fleet-wide hotspot on map/i })).not.toBeInTheDocument();
	});

	it("renders as a plain div when onAlertFocus is not provided", async () => {
		getGeofenceEvents.mockResolvedValue({
			total: 1,
			events: [makeAlert({ geofence_id: "gf-1", message: "Depot breach" })],
		});

		render(<ZoneAlerts />);
		await screen.findByText("Depot breach");

		expect(screen.queryByRole("button", { name: /show depot breach on map/i })).not.toBeInTheDocument();
	});
});

describe("ZoneAlerts: pagination", () => {
	it("shows only the first 6 alerts and the correct 'showing' range", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 10, events: makeAlerts(10) });
		render(<ZoneAlerts />);

		await screen.findByText("Alert 0");
		expect(screen.getByText(/Showing 1.6 of 10/)).toBeInTheDocument();
		expect(screen.queryByText("Alert 6")).not.toBeInTheDocument();
	});

	it("navigates to page 2 via the real Pagination control", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 10, events: makeAlerts(10) });
		render(<ZoneAlerts />);
		await screen.findByText("Alert 0");

		fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

		expect(await screen.findByText("Alert 6")).toBeInTheDocument();
		expect(screen.queryByText("Alert 0")).not.toBeInTheDocument();
		expect(screen.getByText(/Showing 7.10 of 10/)).toBeInTheDocument();
	});

	it("resets to page 1 when refreshToken changes", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 10, events: makeAlerts(10) });
		const { rerender } = render(<ZoneAlerts refreshToken={1} />);
		await screen.findByText("Alert 0");

		fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
		await screen.findByText("Alert 6");

		getGeofenceEvents.mockResolvedValue({ total: 10, events: makeAlerts(10) });
		rerender(<ZoneAlerts refreshToken={2} />);

		await waitFor(() => expect(screen.getByText(/Showing 1.6 of 10/)).toBeInTheDocument());
	});

	it("clamps back to the last valid page when alerts shrink below the current page", async () => {
		getGeofenceEvents.mockResolvedValueOnce({ total: 10, events: makeAlerts(10) });
		const { rerender } = render(<ZoneAlerts refreshToken={1} />);
		await screen.findByText("Alert 0");
		fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
		await screen.findByText("Alert 6");

		getGeofenceEvents.mockResolvedValueOnce({ total: 2, events: makeAlerts(2) });
		rerender(<ZoneAlerts refreshToken={2} />);

		await waitFor(() => expect(screen.getByText(/Showing 1.2 of 2/)).toBeInTheDocument());
		expect(screen.queryByRole("button", { name: /^Page \d+$/ })).not.toBeInTheDocument();
	});
});

describe("ZoneAlerts: clear flow", () => {
	it("clears alerts, resets to page 1, and notifies onAlertsCleared on success", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 1, events: [makeAlert()] });
		deleteGeofenceEvents.mockResolvedValue({ deleted: 1 });
		const onAlertsCleared = jest.fn();

		render(<ZoneAlerts onAlertsCleared={onAlertsCleared} />);
		await screen.findByText("Something happened");

		fireEvent.click(screen.getByRole("button", { name: /clear all alerts/i }));

		await waitFor(() => expect(screen.getByText("No alerts.")).toBeInTheDocument());
		expect(onAlertsCleared).toHaveBeenCalled();
	});

	it("disables the Clear button while clearing is in progress", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 1, events: [makeAlert()] });
		let resolveDelete;
		deleteGeofenceEvents.mockReturnValue(new Promise((res) => (resolveDelete = res)));

		render(<ZoneAlerts />);
		await screen.findByText("Something happened");

		const clearButton = screen.getByRole("button", { name: /clear all alerts/i });
		fireEvent.click(clearButton);

		expect(await screen.findByText(/clearing/i)).toBeInTheDocument();
		expect(clearButton).toBeDisabled();

		resolveDelete({ deleted: 1 });
		await waitFor(() => expect(screen.getByText("No alerts.")).toBeInTheDocument());
	});

	it("re-enables the Clear button and logs if the delete call fails", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 1, events: [makeAlert()] });
		deleteGeofenceEvents.mockRejectedValue(new Error("db error"));
		const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

		render(<ZoneAlerts />);
		await screen.findByText("Something happened");
		fireEvent.click(screen.getByRole("button", { name: /clear all alerts/i }));

		await waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith("Failed to clear alerts:", expect.any(Error))
		);
		expect(screen.getByText("Something happened")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /clear all alerts/i })).not.toBeDisabled();
		consoleError.mockRestore();
	});
});

describe("ZoneAlerts: activity drawer", () => {
	it("opens the drawer when 'View All Activity' is clicked", async () => {
		getGeofenceEvents.mockResolvedValue({ total: 0, events: [] });
		render(<ZoneAlerts />);
		await screen.findByText("No alerts.");

		expect(screen.getByTestId("activity-drawer")).toHaveAttribute("data-open", "false");
		fireEvent.click(screen.getByRole("button", { name: /view all activity/i }));
		expect(screen.getByTestId("activity-drawer")).toHaveAttribute("data-open", "true");
	});
});