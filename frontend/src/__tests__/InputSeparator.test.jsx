import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Input } from "./input"
import { Separator } from "./separator"

jest.mock("radix-ui", () => ({
  Separator: {
    Root: ({ "data-slot": dataSlot, className, orientation, decorative, ...props }) => (
      <div
        data-slot={dataSlot}
        className={className}
        data-orientation={orientation}
        data-decorative={decorative}
        role={decorative ? "none" : "separator"}
        {...props}
      />
    ),
  },
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

// ─── Input ───────────────────────────────────────────────────────────────────

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })

  it("renders with data-slot='input'", () => {
    const { container } = render(<Input />)
    expect(container.querySelector("[data-slot='input']")).toBeInTheDocument()
  })

  it("renders with default type (text)", () => {
    render(<Input />)
    expect(screen.getByRole("textbox")).toHaveAttribute("type", "text")
  })

  it("renders with custom type", () => {
    const { container } = render(<Input type="email" />)
    expect(container.querySelector("input")).toHaveAttribute("type", "email")
  })

  it("renders with type='password'", () => {
    const { container } = render(<Input type="password" />)
    expect(container.querySelector("input")).toHaveAttribute("type", "password")
  })

  it("renders with type='number'", () => {
    const { container } = render(<Input type="number" />)
    expect(container.querySelector("input")).toHaveAttribute("type", "number")
  })

  it("applies custom className", () => {
    const { container } = render(<Input className="input-custom" />)
    expect(container.querySelector("input").className).toContain("input-custom")
  })

  it("renders with placeholder", () => {
    render(<Input placeholder="Search vehicles..." />)
    expect(screen.getByPlaceholderText("Search vehicles...")).toBeInTheDocument()
  })

  it("renders with value", () => {
    render(<Input value="test value" onChange={() => {}} />)
    expect(screen.getByDisplayValue("test value")).toBeInTheDocument()
  })

  it("calls onChange when value changes", () => {
    const handleChange = jest.fn()
    render(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it("is disabled when disabled prop is passed", () => {
    render(<Input disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("renders with aria-invalid", () => {
    render(<Input aria-invalid="true" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true")
  })

  it("passes additional props", () => {
    render(<Input name="email" autoComplete="off" />)
    expect(screen.getByRole("textbox")).toHaveAttribute("name", "email")
    expect(screen.getByRole("textbox")).toHaveAttribute("autoComplete", "off")
  })

  it("renders with maxLength", () => {
    render(<Input maxLength={50} />)
    expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "50")
  })
})

// ─── Separator ───────────────────────────────────────────────────────────────

describe("Separator", () => {
  it("renders with data-slot='separator'", () => {
    const { container } = render(<Separator />)
    expect(container.querySelector("[data-slot='separator']")).toBeInTheDocument()
  })

  it("renders as horizontal by default", () => {
    const { container } = render(<Separator />)
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute("data-orientation", "horizontal")
  })

  it("renders as vertical when orientation='vertical'", () => {
    const { container } = render(<Separator orientation="vertical" />)
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute("data-orientation", "vertical")
  })

  it("is decorative by default", () => {
    const { container } = render(<Separator />)
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute("data-decorative", "true")
  })

  it("can be set as non-decorative", () => {
    const { container } = render(<Separator decorative={false} />)
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute("data-decorative", "false")
  })

  it("applies custom className", () => {
    const { container } = render(<Separator className="sep-custom" />)
    expect(container.querySelector("[data-slot='separator']").className).toContain("sep-custom")
  })

  it("passes additional props", () => {
    const { container } = render(<Separator aria-label="section divider" />)
    expect(container.querySelector("[data-slot='separator']")).toHaveAttribute("aria-label", "section divider")
  })
})