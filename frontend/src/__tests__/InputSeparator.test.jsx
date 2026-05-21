import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />)
    expect(screen.getByRole("textbox")).toBeInTheDocument()
  })
  it("renders with data-slot='input'", () => {
    const { container } = render(<Input />)
    expect(container.querySelector("[data-slot='input']")).toBeInTheDocument()
  })
  it("renders with custom type", () => {
    const { container } = render(<Input type="email" />)
    expect(container.querySelector("input")).toHaveAttribute("type", "email")
  })
  it("applies custom className", () => {
    const { container } = render(<Input className="input-custom" />)
    expect(container.querySelector("input").className).toContain("input-custom")
  })
  it("renders with placeholder", () => {
    render(<Input placeholder="Search..." />)
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
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
})

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
  it("applies custom className", () => {
    const { container } = render(<Separator className="sep-custom" />)
    expect(container.querySelector("[data-slot='separator']").className).toContain("sep-custom")
  })
})