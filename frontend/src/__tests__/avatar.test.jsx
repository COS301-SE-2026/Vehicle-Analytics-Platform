import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Avatar, AvatarImage, AvatarFallback, AvatarBadge,
  AvatarGroup, AvatarGroupCount,
} from "@/components/ui/avatar"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))

describe("Avatar", () => {
  it("renders with default size", () => {
    const { container } = render(<Avatar />)
    expect(container.querySelector("[data-slot='avatar']")).toHaveAttribute("data-size", "default")
  })
  it("renders with custom size prop", () => {
    const { container } = render(<Avatar size="lg" />)
    expect(container.querySelector("[data-slot='avatar']")).toHaveAttribute("data-size", "lg")
  })
  it("applies custom className", () => {
    const { container } = render(<Avatar className="custom-class" />)
    expect(container.querySelector("[data-slot='avatar']").className).toContain("custom-class")
  })
  it("passes additional props through", () => {
    const { container } = render(<Avatar aria-label="User avatar" />)
    expect(container.querySelector("[data-slot='avatar']")).toHaveAttribute("aria-label", "User avatar")
  })
})

describe("AvatarImage", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<Avatar><AvatarImage src="/photo.jpg" /></Avatar>)
    expect(container.querySelector("[data-slot='avatar-image']")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<Avatar><AvatarImage className="img-custom" /></Avatar>)
    expect(container.querySelector("[data-slot='avatar-image']").className).toContain("img-custom")
  })
})

describe("AvatarFallback", () => {
  it("renders children", () => {
    render(<Avatar><AvatarFallback>AB</AvatarFallback></Avatar>)
    expect(screen.getByText("AB")).toBeInTheDocument()
  })
  it("renders with correct data-slot", () => {
    const { container } = render(<Avatar><AvatarFallback>AB</AvatarFallback></Avatar>)
    expect(container.querySelector("[data-slot='avatar-fallback']")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<Avatar><AvatarFallback className="fb-custom">JD</AvatarFallback></Avatar>)
    expect(container.querySelector("[data-slot='avatar-fallback']").className).toContain("fb-custom")
  })
})

describe("AvatarBadge", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarBadge />)
    expect(container.querySelector("[data-slot='avatar-badge']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<AvatarBadge>3</AvatarBadge>)
    expect(screen.getByText("3")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<AvatarBadge className="badge-custom" />)
    expect(container.querySelector("[data-slot='avatar-badge']").className).toContain("badge-custom")
  })
})

describe("AvatarGroup", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarGroup />)
    expect(container.querySelector("[data-slot='avatar-group']")).toBeInTheDocument()
  })
  it("renders multiple Avatar children", () => {
    const { container } = render(<AvatarGroup><Avatar /><Avatar /></AvatarGroup>)
    expect(container.querySelectorAll("[data-slot='avatar']")).toHaveLength(2)
  })
  it("applies custom className", () => {
    const { container } = render(<AvatarGroup className="group-custom" />)
    expect(container.querySelector("[data-slot='avatar-group']").className).toContain("group-custom")
  })
})

describe("AvatarGroupCount", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarGroupCount>+3</AvatarGroupCount>)
    expect(container.querySelector("[data-slot='avatar-group-count']")).toBeInTheDocument()
  })
  it("renders children text", () => {
    render(<AvatarGroupCount>+5</AvatarGroupCount>)
    expect(screen.getByText("+5")).toBeInTheDocument()
  })
})