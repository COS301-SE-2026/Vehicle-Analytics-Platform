import { render, screen, fireEvent } from "@testing-library/react";
import AnomalyDistribution from "../components/reports/AnomalyDistribution";

jest.mock("@/components/ui/anomalyCharts", () => ({
  AnomalyFunnelChart: () => <div data-testid="funnel-chart" />,
  statusLabel: (status) => status,
}));

beforeAll(() => {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const points = [
  { vehicleId: "1124", value: 83, exposure: 600, observed: 500, expected: 14, status: "flagged" },
  { vehicleId: "200", value: 2, exposure: 1000, observed: 20, expected: 23, status: "normal" },
];

const rateFeature = {
  feature: "overspeedEvents_rate",
  label: "Overspeed rate",
  kind: "rate",
  unitLabel: "per 100 km",
  status: "scored",
  distribution: { flagLine: 12.5, chanceRate: 2.3, exposureLabel: "Km driven", points },
};

const speedFeature = {
  feature: "topSpeed",
  label: "Top trip speed (90th percentile)",
  kind: "speed",
  unitLabel: "km/h",
  status: "scored",
  distribution: { flagLine: 140, chanceRate: null, exposureLabel: "Trips", points },
};

const notReportedFeature = {
  feature: "idlingEvents_rate",
  label: "Idling rate",
  kind: "rate",
  status: "not_reported",
};

function renderDistribution(features, behaviourKey) {
  return render(
    <AnomalyDistribution features={features} behaviourKey={behaviourKey} alpha={0.001} peerNoun="fleet" />
  );
}

function openTableHint() {
  fireEvent.click(screen.getByRole("button", { name: "How to read: Vehicles to look at" }));
}

describe("AnomalyDistribution: vehicles table info", () => {
  it("explains every column of a rate behaviour, including Incidents and Expected", async () => {
    renderDistribution({ overspeedEvents_rate: rateFeature }, "overspeedEvents_rate");
    openTableHint();

    expect(await screen.findByText(/is how much each vehicle drove in the period/)).toBeInTheDocument();
    expect(screen.getByText(/is how many the vehicle recorded/)).toBeInTheDocument();
    expect(screen.getByText(/would have recorded at the other/)).toBeInTheDocument();
    expect(screen.getByText(/is the result: stands out, unconfirmed/)).toBeInTheDocument();
    expect(screen.getByText(/Untick the box to see every vehicle/)).toBeInTheDocument();
  });

  it("leaves out the Incidents and Expected explanations for a speed behaviour", async () => {
    renderDistribution({ topSpeed: speedFeature }, "topSpeed");
    openTableHint();

    expect(await screen.findByText(/is how much each vehicle drove in the period/)).toBeInTheDocument();
    expect(screen.queryByText(/is how many the vehicle recorded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/would have recorded at the other/)).not.toBeInTheDocument();
  });

  it("no longer shows the Expected footnote under the table", () => {
    renderDistribution({ overspeedEvents_rate: rateFeature }, "overspeedEvents_rate");
    expect(screen.queryByText(/would have recorded at the other/)).not.toBeInTheDocument();
  });
});

describe("AnomalyDistribution: removed notes", () => {
  it("does not list behaviours that could not be compared", () => {
    renderDistribution(
      { overspeedEvents_rate: rateFeature, idlingEvents_rate: notReportedFeature },
      "overspeedEvents_rate"
    );
    expect(screen.queryByText(/Too few devices report/)).not.toBeInTheDocument();
  });

  it("shows only the empty message when no behaviour can be plotted", () => {
    renderDistribution({ idlingEvents_rate: notReportedFeature }, "idlingEvents_rate");

    expect(screen.getByText("No behaviour had enough vehicles with data to plot.")).toBeInTheDocument();
    expect(screen.queryByText(/Too few devices report/)).not.toBeInTheDocument();
  });
});

describe("AnomalyDistribution: table", () => {
  it("lists only flagged vehicles by default, and every vehicle when the filter is off", () => {
    renderDistribution({ overspeedEvents_rate: rateFeature }, "overspeedEvents_rate");
    const table = screen.getByTestId("anomaly-vehicle-table");

    expect(table).toHaveTextContent("1124");
    expect(table).not.toHaveTextContent("200");

    fireEvent.click(screen.getByLabelText("Only vehicles that stand out"));
    expect(table).toHaveTextContent("200");
  });
});
