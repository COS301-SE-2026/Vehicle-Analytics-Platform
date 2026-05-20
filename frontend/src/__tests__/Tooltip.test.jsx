import React from "react"
import { render, screen } from "@testing-library/react"
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))

describe("TooltipProvider", () => {
  it("renders with data-slot='tooltip-provider'", () => {
    const { container } = render(<TooltipProvider><div /></TooltipProvider>)
    expect(container.querySelector("[data-slot='tooltip-provider']")).toBeInTheDocument()
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

describe("Tooltip", () => {
  it("renders with data-slot='tooltip'", () => {
    const { container } = render(<Tooltip><div>child</div></Tooltip>)
    expect(container.querySelector("[data-slot='tooltip']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<Tooltip><span>tooltip child</span></Tooltip>)
    expect(screen.getByText("tooltip child")).toBeInTheDocument()
  })
})

describe("TooltipTrigger", () => {
  it("renders with data-slot='tooltip-trigger'", () => {
    const { container } = render(<TooltipTrigger>Hover</TooltipTrigger>)
    expect(container.querySelector("[data-slot='tooltip-trigger']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<TooltipTrigger>Hover me</TooltipTrigger>)
    expect(screen.getByText("Hover me")).toBeInTheDocument()
  })
})

describe("TooltipContent", () => {
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
})

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
})