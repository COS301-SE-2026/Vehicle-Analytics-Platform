import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "../components/ui/pagination";

jest.mock("lucide-react", () => ({
  ChevronLeft: (props) => <svg data-testid="icon-chevron-left" {...props} />,
  ChevronRight: (props) => <svg data-testid="icon-chevron-right" {...props} />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, "aria-label": ariaLabel, "aria-current": ariaCurrent }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </button>
  ),
}));

function pageButtons() {
  return screen.getAllByRole("button").filter((b) => /^Page \d+$/.test(b.getAttribute("aria-label")));
}

describe("Pagination: no-op cases", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when totalPages is 0", () => {
    const { container } = render(<Pagination page={1} totalPages={0} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Pagination: small page counts (<=7), no windowing", () => {
  it("renders every page as its own button with no ellipsis", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);
    expect(pageButtons().map((b) => b.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("marks the current page with aria-current='page' and no others", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);
    const buttons = pageButtons();
    expect(buttons.find((b) => b.textContent === "3")).toHaveAttribute("aria-current", "page");
    expect(buttons.find((b) => b.textContent === "1")).not.toHaveAttribute("aria-current");
  });
});

describe("Pagination: windowing above 7 pages", () => {
  it("shows first, last, current-1/current/current+1, with one ellipsis on each side for a middle page", () => {
    render(<Pagination page={25} totalPages={50} onPageChange={() => {}} />);
    expect(pageButtons().map((b) => b.textContent)).toEqual(["1", "24", "25", "26", "50"]);
    expect(screen.getAllByText("…")).toHaveLength(2);
  });

  it("collapses the gap into a single run when current is near the start", () => {
    // current=2, total=20 -> {1,2,3,20}: 1,2,3 are consecutive, only one
    // jump (3 -> 20), so exactly one ellipsis, not two.
    render(<Pagination page={2} totalPages={20} onPageChange={() => {}} />);
    expect(pageButtons().map((b) => b.textContent)).toEqual(["1", "2", "3", "20"]);
    expect(screen.getAllByText("…")).toHaveLength(1);
  });

  it("collapses the gap into a single run when current is near the end", () => {
    render(<Pagination page={19} totalPages={20} onPageChange={() => {}} />);
    expect(pageButtons().map((b) => b.textContent)).toEqual(["1", "18", "19", "20"]);
    expect(screen.getAllByText("…")).toHaveLength(1);
  });

  it("does not duplicate a page number that appears in both the edge and the current-page window", () => {
    // current=1, total=20 -> set {1, 20, 1, 0, 2} -> 0 filtered out, 1
    // deduplicated by Set -> {1, 2, 20}.
    render(<Pagination page={1} totalPages={20} onPageChange={() => {}} />);
    expect(pageButtons().map((b) => b.textContent)).toEqual(["1", "2", "20"]);
  });

  it("ellipsis spans are not buttons and are aria-hidden", () => {
    render(<Pagination page={25} totalPages={50} onPageChange={() => {}} />);
    const gaps = screen.getAllByText("…");
    gaps.forEach((gap) => {
      expect(gap.tagName).toBe("SPAN");
      expect(gap).toHaveAttribute("aria-hidden", "true");
    });
  });
});

describe("Pagination: navigation", () => {
  it("calls onPageChange with the clicked page number", () => {
    const onPageChange = jest.fn();
    render(<Pagination page={1} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageChange(page - 1) when Previous is clicked", () => {
    const onPageChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange(page + 1) when Next is clicked", () => {
    const onPageChange = jest.fn();
    render(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("disables Next on the last page", () => {
    render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("does not disable Previous/Next on interior pages", () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Previous page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).not.toBeDisabled();
  });
});

describe("Pagination: className passthrough", () => {
  it("appends the given className to the wrapper", () => {
    const { container } = render(
      <Pagination page={1} totalPages={5} onPageChange={() => {}} className="my-extra-class" />
    );
    expect(container.firstChild.className).toEqual(expect.stringContaining("my-extra-class"));
  });
});