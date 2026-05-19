import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "./avatar"

// Mock radix-ui AvatarPrimitive
jest.mock("radix-ui", () => ({
  Avatar: {
    Root: ({ children, "data-slot": dataSlot, "data-size": dataSize, className, ...props }) => (
      <span data-slot={dataSlot} data-size={dataSize} className={className} {...props}>
        {children}
      </span>
    ),
    Image: ({ "data-slot": dataSlot, className, ...props }) => (
      <img data-slot={dataSlot} className={className} alt="" {...props} />
    ),
    Fallback: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <span data-slot={dataSlot} className={className} {...props}>
        {children}
      </span>
    ),
  },
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

describe("Avatar", () => {
  it("renders with default size", () => {
    const { container } = render(<Avatar />)
    const el = container.querySelector("[data-slot='avatar']")
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute("data-size", "default")
  })

  it("renders with custom size prop", () => {
    const { container } = render(<Avatar size="lg" />)
    const el = container.querySelector("[data-slot='avatar']")
    expect(el).toHaveAttribute("data-size", "lg")
  })

  it("applies custom className", () => {
    const { container } = render(<Avatar className="custom-class" />)
    const el = container.querySelector("[data-slot='avatar']")
    expect(el.className).toContain("custom-class")
  })

  it("passes additional props through", () => {
    const { container } = render(<Avatar aria-label="User avatar" />)
    const el = container.querySelector("[data-slot='avatar']")
    expect(el).toHaveAttribute("aria-label", "User avatar")
  })
})

describe("AvatarImage", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarImage src="/photo.jpg" />)
    const el = container.querySelector("[data-slot='avatar-image']")
    expect(el).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<AvatarImage className="img-custom" />)
    const el = container.querySelector("[data-slot='avatar-image']")
    expect(el.className).toContain("img-custom")
  })

  it("passes src and alt props", () => {
    const { container } = render(<AvatarImage src="/photo.jpg" alt="Profile photo" />)
    const el = container.querySelector("[data-slot='avatar-image']")
    expect(el).toHaveAttribute("src", "/photo.jpg")
    expect(el).toHaveAttribute("alt", "Profile photo")
  })
})

describe("AvatarFallback", () => {
  it("renders children", () => {
    render(<AvatarFallback>AB</AvatarFallback>)
    expect(screen.getByText("AB")).toBeInTheDocument()
  })

  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarFallback>AB</AvatarFallback>)
    const el = container.querySelector("[data-slot='avatar-fallback']")
    expect(el).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<AvatarFallback className="fallback-custom">JD</AvatarFallback>)
    const el = container.querySelector("[data-slot='avatar-fallback']")
    expect(el.className).toContain("fallback-custom")
  })
})

describe("AvatarBadge", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarBadge />)
    const el = container.querySelector("[data-slot='avatar-badge']")
    expect(el).toBeInTheDocument()
  })

  it("renders as a span element", () => {
    const { container } = render(<AvatarBadge />)
    expect(container.querySelector("span[data-slot='avatar-badge']")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<AvatarBadge className="badge-custom" />)
    const el = container.querySelector("[data-slot='avatar-badge']")
    expect(el.className).toContain("badge-custom")
  })

  it("renders children content", () => {
    render(<AvatarBadge>3</AvatarBadge>)
    expect(screen.getByText("3")).toBeInTheDocument()
  })
})

describe("AvatarGroup", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarGroup />)
    const el = container.querySelector("[data-slot='avatar-group']")
    expect(el).toBeInTheDocument()
  })

  it("renders as a div element", () => {
    const { container } = render(<AvatarGroup />)
    expect(container.querySelector("div[data-slot='avatar-group']")).toBeInTheDocument()
  })

  it("renders multiple Avatar children", () => {
    const { container } = render(
      <AvatarGroup>
        <Avatar data-testid="a1" />
        <Avatar data-testid="a2" />
      </AvatarGroup>
    )
    const avatars = container.querySelectorAll("[data-slot='avatar']")
    expect(avatars).toHaveLength(2)
  })

  it("applies custom className", () => {
    const { container } = render(<AvatarGroup className="group-custom" />)
    const el = container.querySelector("[data-slot='avatar-group']")
    expect(el.className).toContain("group-custom")
  })
})

describe("AvatarGroupCount", () => {
  it("renders with correct data-slot", () => {
    const { container } = render(<AvatarGroupCount>+3</AvatarGroupCount>)
    const el = container.querySelector("[data-slot='avatar-group-count']")
    expect(el).toBeInTheDocument()
  })

  it("renders children text", () => {
    render(<AvatarGroupCount>+5</AvatarGroupCount>)
    expect(screen.getByText("+5")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<AvatarGroupCount className="count-custom">+2</AvatarGroupCount>)
    const el = container.querySelector("[data-slot='avatar-group-count']")
    expect(el.className).toContain("count-custom")
  })
})