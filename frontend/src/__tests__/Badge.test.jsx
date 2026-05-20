import React from "react"
import { render, screen } from "@testing-library/react"
import { Badge, badgeVariants } from "@/components/ui/badge"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))
jest.mock("class-variance-authority", () => ({
  cva: (base, config) => (variants = {}) => {
    const classes = [base]
    if (config?.variants && variants) {
      Object.entries(variants).forEach(([key, val]) => {
        if (config.variants[key]?.[val]) classes.push(config.variants[key][val])
      })
    }
    return classes.filter(Boolean).join(" ")
  },
}))

describe("Badge", () => {
  it("renders with default variant", () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText("New")).toHaveAttribute("data-slot", "badge")
    expect(screen.getByText("New")).toHaveAttribute("data-variant", "default")
  })
  it("renders as a span by default", () => {
    render(<Badge>Label</Badge>)
    expect(screen.getByText("Label").tagName).toBe("SPAN")
  })
  it.each(["default","secondary","destructive","outline","ghost","link"])("renders variant: %s", (variant) => {
    render(<Badge variant={variant}>{variant}</Badge>)
    expect(screen.getByText(variant)).toHaveAttribute("data-variant", variant)
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
  })
  it("passes extra props to the element", () => {
    render(<Badge aria-label="status badge">Status</Badge>)
    expect(screen.getByText("Status")).toHaveAttribute("aria-label", "status badge")
  })
})

describe("badgeVariants", () => {
  it("is a function", () => { expect(typeof badgeVariants).toBe("function") })
  it("returns a string", () => { expect(typeof badgeVariants({ variant: "default" })).toBe("string") })
  it("returns different classes for different variants", () => {
    expect(badgeVariants({ variant: "default" })).not.toBe(badgeVariants({ variant: "destructive" }))
  })
})