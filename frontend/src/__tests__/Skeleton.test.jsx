import React from "react"
import { render, screen } from "@testing-library/react"
import { Skeleton } from "./skeleton"

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

describe("Skeleton", () => {
  it("renders with data-slot='skeleton'", () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelector("[data-slot='skeleton']")).toBeInTheDocument()
  })

  it("renders as a div", () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelector("div[data-slot='skeleton']")).toBeInTheDocument()
  })

  it("includes animate-pulse class by default", () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelector("[data-slot='skeleton']").className).toContain("animate-pulse")
  })

  it("includes rounded-md class by default", () => {
    const { container } = render(<Skeleton />)
    expect(container.querySelector("[data-slot='skeleton']").className).toContain("rounded-md")
  })

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />)
    const el = container.querySelector("[data-slot='skeleton']")
    expect(el.className).toContain("h-4")
    expect(el.className).toContain("w-32")
  })

  it("passes additional props", () => {
    const { container } = render(<Skeleton aria-label="loading" />)
    expect(container.querySelector("[data-slot='skeleton']")).toHaveAttribute("aria-label", "loading")
  })

  it("renders multiple skeletons independently", () => {
    const { container } = render(
      <div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
    expect(container.querySelectorAll("[data-slot='skeleton']")).toHaveLength(3)
  })
})