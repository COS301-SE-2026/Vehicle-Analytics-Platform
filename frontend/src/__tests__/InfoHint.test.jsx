import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InfoHint, { HowCalculated, Formula } from "../components/reports/InfoHint";

beforeAll(() => {
  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const HINT_TEXT = "Events per 100 km driven.";

function renderHint(label = "Fleet event rates") {
  return render(
    <InfoHint label={label}>
      <p>{HINT_TEXT}</p>
    </InfoHint>
  );
}

function getTrigger(label = "Fleet event rates") {
  return screen.getByRole("button", { name: `How to read: ${label}` });
}

describe("InfoHint: trigger", () => {
  it("renders a button named after the label", () => {
    renderHint();
    expect(getTrigger()).toBeInTheDocument();
    expect(getTrigger()).toHaveAttribute("type", "button");
  });

  it("hides the icon from screen readers", () => {
    const { container } = renderHint();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("starts closed", () => {
    renderHint();
    expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument();
    expect(getTrigger()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("InfoHint: opening and closing", () => {
  it("opens on click and shows its content", async () => {
    renderHint();
    fireEvent.click(getTrigger());

    expect(await screen.findByText(HINT_TEXT)).toBeInTheDocument();
    expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on a second click", async () => {
    renderHint();
    fireEvent.click(getTrigger());
    await screen.findByText(HINT_TEXT);

    fireEvent.click(getTrigger());

    await waitFor(() => {
      expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument();
    });
    expect(getTrigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    renderHint();
    fireEvent.click(getTrigger());
    const content = await screen.findByRole("dialog");

    // Radix attaches its Escape listener a tick after opening.
    await waitFor(() => {
      fireEvent.keyDown(content, { key: "Escape" });
      expect(screen.queryByText(HINT_TEXT)).not.toBeInTheDocument();
    });
    expect(getTrigger()).toHaveFocus();
  });

  it("opens only the hint that was clicked when several are on the page", async () => {
    render(
      <>
        <InfoHint label="First"><p>First hint</p></InfoHint>
        <InfoHint label="Second"><p>Second hint</p></InfoHint>
      </>
    );

    fireEvent.click(getTrigger("First"));

    expect(await screen.findByText("First hint")).toBeInTheDocument();
    expect(screen.queryByText("Second hint")).not.toBeInTheDocument();
  });
});

describe("InfoHint: popover styling", () => {
  // Regression: shadcn's default bg-popover resolved to nothing in this theme,
  // which left the popover see-through.
  it("has a solid background and border", async () => {
    renderHint();
    fireEvent.click(getTrigger());

    const content = await screen.findByRole("dialog");
    expect(content).toHaveClass("bg-white");
    expect(content).toHaveClass("border");
  });

  it("scrolls instead of growing past the screen", async () => {
    renderHint();
    fireEvent.click(getTrigger());

    const content = await screen.findByRole("dialog");
    expect(content).toHaveClass("overflow-y-auto");
  });
});

describe("HowCalculated", () => {
  it("renders the heading followed by its children", () => {
    render(
      <HowCalculated>
        <p>formula goes here</p>
      </HowCalculated>
    );

    expect(screen.getByText("How it's calculated")).toBeInTheDocument();
    expect(screen.getByText("formula goes here")).toBeInTheDocument();
  });
});

describe("Formula", () => {
  it("renders the label and the formula", () => {
    render(<Formula label="Rate per 100 km">events ÷ km × 100</Formula>);

    expect(screen.getByText("Rate per 100 km")).toBeInTheDocument();
    expect(screen.getByText("events ÷ km × 100")).toBeInTheDocument();
  });

  it("renders the note when one is given", () => {
    render(
      <Formula label="Chance in any 10 km" note="Assumes a Poisson process.">
        1 − e^(−rate × 10 ÷ 100)
      </Formula>
    );

    expect(screen.getByText("Assumes a Poisson process.")).toBeInTheDocument();
  });

  it("renders only the label and formula when there is no note", () => {
    const { container } = render(<Formula label="Rate">events ÷ km × 100</Formula>);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("keeps rich formula content such as superscripts", () => {
    const { container } = render(
      <Formula label="Trip chance">
        1 − e<sup>−rate × km ÷ 100</sup>
      </Formula>
    );

    expect(container.querySelector("sup")).toHaveTextContent("−rate × km ÷ 100");
  });
});