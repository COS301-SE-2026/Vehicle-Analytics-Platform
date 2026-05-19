import React from "react"
import { render, screen } from "@testing-library/react"
import { Badge, badgeVariants } from "./badge"

jest.mock("radix-ui", () => ({
  Slot: {
    Root: ({ children, ...props }) => <span data-testid="slot-root" {...props}>{children}</span>,
  },
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

jest.mock("class-variance-authority", () => ({
  cva: (base, config) => (variants = {}) => {
    const classes = [base]
    if (config?.variants && variants) {
      Object.entries(variants).forEach(([key, value]) => {
        if (config.variants[key]?.[value]) {
          classes.push(config.variants[key][value])
        }
      })
    }
    return classes.filter(Boolean).join(" ")
  },
}))

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>New</Badge>)
    const badge = screen.getByText("New")
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute("data-slot", "badge")
    expect(badge).toHaveAttribute("data-variant", "default")
  })

  it("renders as a span by default", () => {
    render(<Badge>Label</Badge>)
    expect(screen.getByText("Label").tagName).toBe("SPAN")
  })

  it("renders children correctly", () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it.each([
    "default",
    "secondary",
    "destructive",
    "outline",
    "ghost",
    "link",
  ])("renders variant: %s", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>)
    const badge = screen.getByText(variant)
    expect(badge).toHaveAttribute("data-variant", variant)
  })

  it("applies custom className", () => {
    render(<Badge className="custom-badge">Tag</Badge>)
    expect(screen.getByText("Tag").className).toContain("custom-badge")
  })

  it("renders as Slot.Root when asChild is true", () => {
    render(<Badge asChild>Child</Badge>)
    expect(screen.getByTestId("slot-root")).toBeInTheDocument()
  })

  it("renders as span when asChild is false", () => {
    render(<Badge asChild={false}>Not Slot</Badge>)
    expect(screen.queryByTestId("slot-root")).not.toBeInTheDocument()
    expect(screen.getByText("Not Slot").tagName).toBe("SPAN")
  })

  it("passes extra props to the element", () => {
    render(<Badge aria-label="status badge">Status</Badge>)
    expect(screen.getByText("Status")).toHaveAttribute("aria-label", "status badge")
  })
})

describe("badgeVariants", () => {
  it("is a function (CVA output)", () => {
    expect(typeof badgeVariants).toBe("function")
  })

  it("returns a string of class names", () => {
    const result = badgeVariants({ variant: "default" })
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns different classes for different variants", () => {
    const defaultClasses = badgeVariants({ variant: "default" })
    const destructiveClasses = badgeVariants({ variant: "destructive" })
    expect(defaultClasses).not.toBe(destructiveClasses)
  })
})