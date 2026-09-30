import { render, screen, fireEvent } from "@testing-library/react";
import AnomalyReport from "../components/reports/AnomalyReport";
import { getAnomalies } from "@/services/anomalyService";

jest.mock("@/services/anomalyService", () => ({
  getAnomalies: jest.fn(),
}));

// The chart itself is covered by its own tests; here we only need the report around it.
jest.mock("@/components/ui/anomalyCharts", () => ({
  AnomalyFunnelChart: () => <div data-testid="funnel-chart" />,
  statusLabel: (status) => status,
}));

jest.mock("@/components/ui/calendar", () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

// Radix positions popovers with floating-ui, which needs ResizeObserver.
beforeAll(() => {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const FEATURE_KEY = "overspeedEvents_rate";

function buildResult(overrides = {}) {
  return {
    scope: { type: "fleet", id: null, label: "Assigned fleet", vehicleCount: 95 },
    peerGroup: { type: "fleet", label: "Assigned fleet", vehicleCount: 95 },
    period: { type: "current", label: "Last 7 days to and including 30 Sep" },
    anomalies: {
      headline: "1 vehicle stands out this period.",
      summary: { vehiclesFlagged: 1, featuresScored: 1, vehiclesEvaluated: 95 },
      peers: { noun: "fleet", vehicles: 95, vehiclesEvaluated: 95 },
      exposure: { basis: "distance", label: "per 100 km driven", distanceSource: "telemetry" },
      parameters: {
        zThreshold: 3.5,
        alpha: 0.001,
        minSupportingEvents: 3,
        minPeerVehicles: 5,
        reportingLookbackDays: 90,
      },
      dataQuality: {
        notes: ["Telemetry distance could not be read, so distance comes from completed trips only."],
      },
      features: {
        [FEATURE_KEY]: {
          feature: FEATURE_KEY,
          label: "Overspeed rate",
          kind: "rate",
          unitLabel: "per 100 km",
          status: "scored",
          distribution: {
            flagLine: 12.5,
            chanceRate: 2.3,
            exposureLabel: "Km driven",
            points: [
              { vehicleId: "1124", value: 83, exposure: 600, observed: 500, expected: 14, status: "flagged" },
              { vehicleId: "200", value: 2, exposure: 1000, observed: 20, expected: 23, status: "normal" },
            ],
          },
        },
      },
      flagged: [
        {
          vehicleId: "1124",
          severity: "high",
          flagCount: 1,
          totalIncidents: 500,
          distanceKm: 600,
          flags: [
            {
              feature: FEATURE_KEY,
              explanation: "Overspeed at 83 per 100 km, against a median of 2.3 for the other vehicles.",
              ratio: 36.7,
              evidence: { observed: 500, expected: 14 },
              method: "modified_z",
            },
          ],
          cautions: [{ code: "sparse_type", message: "Most other vehicles recorded no overspeed incidents." }],
        },
      ],
      ...overrides,
    },
  };
}

async function renderAndDetect(result = buildResult()) {
  getAnomalies.mockResolvedValue(result);
  render(
    <AnomalyReport scopes={{ groups: [], vehicles: [] }} scopeValue="fleet" onScopeChange={jest.fn()} />
  );
  fireEvent.click(screen.getByTestId("anomaly-detect"));
  await screen.findByTestId("anomaly-headline");
}

function openHint(label) {
  fireEvent.click(screen.getByRole("button", { name: `How to read: ${label}` }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AnomalyReport: layout after detection", () => {
  it("shows the headline, the chart and the findings", async () => {
    await renderAndDetect();

    expect(screen.getByTestId("anomaly-headline")).toHaveTextContent("1 vehicle stands out this period.");
    expect(screen.getByTestId("funnel-chart")).toBeInTheDocument();
    expect(screen.getByTestId("finding-1124")).toBeInTheDocument();
  });

  it("shows the chart's one-line description instead of the long explanation", async () => {
    await renderAndDetect();

    expect(screen.getByText("Each dot is a vehicle, and its colour shows the result.")).toBeInTheDocument();
    expect(screen.queryByText(/above the red flag line/)).not.toBeInTheDocument();
  });
});

describe("AnomalyReport: removed warnings", () => {
  it("does not show data-quality notes under the headline", async () => {
    await renderAndDetect();
    expect(screen.queryByText(/Telemetry distance could not be read/)).not.toBeInTheDocument();
  });


  it("no longer has a separate 'How the detection works' section", async () => {
    await renderAndDetect();
    expect(screen.queryByText("How the detection works", { selector: "summary" })).not.toBeInTheDocument();
  });
});

describe("AnomalyReport: info popovers", () => {
  it("explains the method steps from the headline's info icon", async () => {
    await renderAndDetect();
    openHint("How the detection works");

    expect(await screen.findByText("Merge bursts.")).toBeInTheDocument();
    expect(screen.getByText(/in the 90 days to the end of the period/)).toBeInTheDocument();
    expect(screen.getByText(/A vehicle is unusual above 3\.5/)).toBeInTheDocument();
  });

  it("explains how to read the chart, with its formulas", async () => {
    await renderAndDetect();
    openHint("Vehicles compared with the fleet: overspeed");

    expect(await screen.findByText(/above the red flag line and above the dotted chance limit/)).toBeInTheDocument();
    expect(screen.getByText("Distance from normal (modified z-score)")).toBeInTheDocument();
    expect(screen.getByText(/unusual when z > 3\.5/)).toBeInTheDocument();
    expect(screen.getByText(/and at least 3 incidents/)).toBeInTheDocument();
  });

  it("explains the finding cards and how severity is decided", async () => {
    await renderAndDetect();
    openHint("Vehicles that stand out");

    expect(await screen.findByText(/One card per vehicle that stands out/)).toBeInTheDocument();
    expect(screen.getByText("Severity")).toBeInTheDocument();
    expect(screen.getByText(/High: z ≥ 8/)).toBeInTheDocument();
  });
});
