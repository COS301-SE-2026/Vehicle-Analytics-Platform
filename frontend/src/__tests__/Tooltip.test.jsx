import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "./tooltip"

jest.mock("radix-ui", () => ({
  Tooltip: {
    Provider: ({ children, "data-slot": dataSlot, delayDuration, ...props }) => (
      <div data-slot={dataSlot} data-delay={delayDuration} {...props}>{children}</div>
    ),
    Root: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Trigger: ({ children, "data-slot": dataSlot, ...props }) => (
      <button data-slot={dataSlot} {...props}>{children}</button>
    ),
    Portal: ({ children }) => <div data-testid="tooltip-portal">{children}</div>,
    Content: ({ children, "data-slot": dataSlot, className, sideOffset, ...props }) => (
      <div data-slot={dataSlot} className={className} data-side-offset={sideOffset} {...props}>{children}</div>
    ),
    Arrow: ({ className }) => <svg data-testid="tooltip-arrow" className={className} />,
  },
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

// ─── TooltipProvider ─────────────────────────────────────────────────────────

describe("TooltipProvider", () => {
  it("renders with data-slot='tooltip-provider'", () => {
    const { container } = render(<TooltipProvider><div>child</div></TooltipProvider>)
    expect(container.querySelector("[data-slot='tooltip-provider']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<TooltipProvider><span>tooltip child</span></TooltipProvider>)
    expect(screen.getByText("tooltip child")).toBeInTheDocument()
  })

  it("defaults delayDuration to 0", () => {
    const { container } = render(<TooltipProvider><div /></TooltipProvider>)
    expect(container.querySelector("[data-slot='tooltip-provider']")).toHaveAttribute("data-delay", "0")
  })

  it("accepts custom delayDuration", () => {
    const { container } = render(<TooltipProvider delayDuration={500}><div /></TooltipProvider>)
    expect(container.querySelector("[data-slot='tooltip-provider']")).toHaveAttribute("data-delay", "500")
  })
})

// ─── Tooltip ─────────────────────────────────────────────────────────────────

describe("Tooltip", () => {
  it("renders with data-slot='tooltip'", () => {
    const { container } = render(<Tooltip><div>child</div></Tooltip>)
    expect(container.querySelector("[data-slot='tooltip']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<Tooltip><span>tooltip root child</span></Tooltip>)
    expect(screen.getByText("tooltip root child")).toBeInTheDocument()
  })

  it("passes additional props", () => {
    const { container } = render(<Tooltip open><div /></Tooltip>)
    expect(container.querySelector("[data-slot='tooltip']")).toHaveAttribute("open", "")
  })
})

// ─── TooltipTrigger ──────────────────────────────────────────────────────────

describe("TooltipTrigger", () => {
  it("renders with data-slot='tooltip-trigger'", () => {
    const { container } = render(<TooltipTrigger>Hover me</TooltipTrigger>)
    expect(container.querySelector("[data-slot='tooltip-trigger']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<TooltipTrigger>Hover me</TooltipTrigger>)
    expect(screen.getByText("Hover me")).toBeInTheDocument()
  })

  it("passes additional props", () => {
    render(<TooltipTrigger aria-label="info trigger">Hover</TooltipTrigger>)
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "info trigger")
  })
})

// ─── TooltipContent ──────────────────────────────────────────────────────────

describe("TooltipContent", () => {
  it("renders with data-slot='tooltip-content'", () => {
    render(<TooltipContent>Tooltip text</TooltipContent>)
    expect(screen.getByText("Tooltip text")).toBeInTheDocument()
    expect(document.querySelector("[data-slot='tooltip-content']")).toBeInTheDocument()
  })

  it("renders inside a portal", () => {
    render(<TooltipContent>Tip</TooltipContent>)
    expect(screen.getByTestId("tooltip-portal")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<TooltipContent>Save changes</TooltipContent>)
    expect(screen.getByText("Save changes")).toBeInTheDocument()
  })

  it("renders the arrow element", () => {
    render(<TooltipContent>Tip</TooltipContent>)
    expect(screen.getByTestId("tooltip-arrow")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(<TooltipContent className="tip-custom">Tip</TooltipContent>)
    expect(document.querySelector("[data-slot='tooltip-content']").className).toContain("tip-custom")
  })

  it("defaults sideOffset to 0", () => {
    render(<TooltipContent>Tip</TooltipContent>)
    expect(document.querySelector("[data-slot='tooltip-content']")).toHaveAttribute("data-side-offset", "0")
  })

  it("accepts custom sideOffset", () => {
    render(<TooltipContent sideOffset={8}>Tip</TooltipContent>)
    expect(document.querySelector("[data-slot='tooltip-content']")).toHaveAttribute("data-side-offset", "8")
  })

  it("passes additional props like side", () => {
    render(<TooltipContent side="left">Tip</TooltipContent>)
    expect(document.querySelector("[data-slot='tooltip-content']")).toHaveAttribute("side", "left")
  })
})

// ─── Full Tooltip Composition ─────────────────────────────────────────────────

describe("Tooltip composition", () => {
  it("renders a full tooltip structure", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover over me</TooltipTrigger>
          <TooltipContent>This is a tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText("Hover over me")).toBeInTheDocument()
    expect(screen.getByText("This is a tooltip")).toBeInTheDocument()
    expect(screen.getByTestId("tooltip-arrow")).toBeInTheDocument()
  })

  it("renders multiple tooltips inside a single provider", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Button A</TooltipTrigger>
          <TooltipContent>Tooltip A</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>Button B</TooltipTrigger>
          <TooltipContent>Tooltip B</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
    expect(screen.getByText("Button A")).toBeInTheDocument()
    expect(screen.getByText("Tooltip A")).toBeInTheDocument()
    expect(screen.getByText("Button B")).toBeInTheDocument()
    expect(screen.getByText("Tooltip B")).toBeInTheDocument()
  })
})