import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Button, buttonVariants } from "./button"

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
    const btn = screen.getByRole("button")
    expect(btn).toHaveAttribute("data-variant", "default")
    expect(btn).toHaveAttribute("data-size", "default")
  })

  it.each(["default", "outline", "secondary", "ghost", "destructive", "link"])(
    "renders variant: %s",
    (variant) => {
      render(<Button variant={variant}>{variant}</Button>)
      expect(screen.getByRole("button")).toHaveAttribute("data-variant", variant)
    }
  )

  it.each(["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"])(
    "renders size: %s",
    (size) => {
      render(<Button size={size}>Size</Button>)
      expect(screen.getByRole("button")).toHaveAttribute("data-size", size)
    }
  )

  it("applies custom className", () => {
    render(<Button className="my-custom">Custom</Button>)
    expect(screen.getByRole("button").className).toContain("my-custom")
  })

  it("renders as Slot.Root when asChild is true", () => {
    render(<Button asChild>Child</Button>)
    expect(screen.getByTestId("slot-root")).toBeInTheDocument()
  })

  it("does not render as Slot.Root when asChild is false", () => {
    render(<Button asChild={false}>Not Slot</Button>)
    expect(screen.queryByTestId("slot-root")).not.toBeInTheDocument()
  })

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("does not call onClick when disabled", () => {
    const handleClick = jest.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
  })

  it("passes through arbitrary props", () => {
    render(<Button aria-label="submit form">Submit</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "submit form")
  })

  it("renders children correctly", () => {
    render(<Button>Save Changes</Button>)
    expect(screen.getByText("Save Changes")).toBeInTheDocument()
  })

  it("renders with type attribute", () => {
    render(<Button type="submit">Submit</Button>)
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit")
  })
})

describe("buttonVariants", () => {
  it("is a function (CVA output)", () => {
    expect(typeof buttonVariants).toBe("function")
  })

  it("returns a string of class names", () => {
    const result = buttonVariants({ variant: "default", size: "default" })
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns different classes for different variants", () => {
    const defaultClasses = buttonVariants({ variant: "default" })
    const ghostClasses = buttonVariants({ variant: "ghost" })
    expect(defaultClasses).not.toBe(ghostClasses)
  })

  it("returns different classes for different sizes", () => {
    const defaultSize = buttonVariants({ size: "default" })
    const lgSize = buttonVariants({ size: "lg" })
    expect(defaultSize).not.toBe(lgSize)
  })
})