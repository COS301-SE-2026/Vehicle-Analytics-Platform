import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Button, buttonVariants } from "@/components/ui/button"

// cn just joins strings
jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))

// cva mock: base classes + variant classes, AND passes className through
jest.mock("class-variance-authority", () => ({
  cva: (base, config) => ({ className, ...variants } = {}) => {
    const classes = [base]
    if (config?.variants && variants) {
      Object.entries(variants).forEach(([key, val]) => {
        if (val && config.variants[key]?.[val]) {
          classes.push(config.variants[key][val])
        }
      })
    }
    // className is passed separately by cn() in the component, so we include it here
    if (className) classes.push(className)
    return classes.filter(Boolean).join(" ")
  },
}))

// Mock Slot.Root so asChild renders a detectable element
jest.mock("radix-ui", () => ({
  Slot: {
    Root: ({ children, ...props }) => (
      <div data-testid="slot-root" {...props}>{children}</div>
    ),
  },
}))

describe("Button", () => {
  it("renders as a button element by default", () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument()
  })

  it("renders with data-slot='button'", () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-slot", "button")
  })

  it("renders with default variant and size data attributes", () => {
    render(<Button>Click</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", "default")
    expect(screen.getByRole("button")).toHaveAttribute("data-size", "default")
  })

  it.each(["default","outline","secondary","ghost","destructive","link"])("renders variant: %s", (variant) => {
    render(<Button variant={variant}>{variant}</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant)
  })

  it.each(["default","xs","sm","lg","icon","icon-xs","icon-sm","icon-lg"])("renders size: %s", (size) => {
    render(<Button size={size}>Size</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("data-size", size)
  })

  it("applies custom className", () => {
    render(<Button className="my-custom">Custom</Button>)
    expect(screen.getByRole("button").className).toContain("my-custom")
  })

  it("renders as Slot.Root when asChild is true", () => {
    render(<Button asChild>Child</Button>)
    expect(screen.getByTestId("slot-root")).toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("renders with type attribute", () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit")
  })
})

describe("buttonVariants", () => {
  it("is a function", () => {
    expect(typeof buttonVariants).toBe("function")
  })

  it("returns a string", () => {
    expect(typeof buttonVariants({ variant: "default", size: "default" })).toBe("string")
  })

  it("returns different classes for different variants", () => {
    expect(buttonVariants({ variant: "default" })).not.toBe(buttonVariants({ variant: "ghost" }))
  })
})