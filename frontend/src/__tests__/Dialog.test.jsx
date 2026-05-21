import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Dialog, DialogTrigger, DialogOverlay, DialogContent,
  DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))
jest.mock("lucide-react", () => ({ XIcon: () => <svg data-testid="x-icon" /> }))
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, className, variant, size, ...props }) => (
    <button className={className} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

describe("Dialog", () => {
  it("renders with data-slot='dialog'", () => {
    const { container } = render(<Dialog><div>content</div></Dialog>)
    expect(container.querySelector("[data-slot='dialog']")).toBeInTheDocument()
  })
})

describe("DialogTrigger", () => {
  it("renders with data-slot='dialog-trigger'", () => {
    const { container } = render(<DialogTrigger>Open</DialogTrigger>)
    expect(container.querySelector("[data-slot='dialog-trigger']")).toBeInTheDocument()
  })
})

describe("DialogOverlay", () => {
  it("renders with data-slot='dialog-overlay'", () => {
    const { container } = render(<DialogOverlay />)
    expect(container.querySelector("[data-slot='dialog-overlay']")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<DialogOverlay className="overlay-custom" />)
    expect(container.querySelector("[data-slot='dialog-overlay']").className).toContain("overlay-custom")
  })
})

describe("DialogContent", () => {
  it("renders children", () => {
    render(<DialogContent>Inner content</DialogContent>)
    expect(screen.getByText("Inner content")).toBeInTheDocument()
  })
  it("shows close button by default", () => {
    render(<DialogContent>Content</DialogContent>)
    expect(screen.getByTestId("x-icon")).toBeInTheDocument()
  })
  it("hides close button when showCloseButton=false", () => {
    render(<DialogContent showCloseButton={false}>Content</DialogContent>)
    expect(screen.queryByTestId("x-icon")).not.toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<DialogContent className="content-custom">Content</DialogContent>)
    expect(container.querySelector("[data-slot='dialog-content']").className).toContain("content-custom")
  })
})

describe("DialogHeader", () => {
  it("renders with data-slot='dialog-header'", () => {
    const { container } = render(<DialogHeader />)
    expect(container.querySelector("[data-slot='dialog-header']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<DialogHeader><span>Header child</span></DialogHeader>)
    expect(screen.getByText("Header child")).toBeInTheDocument()
  })
})

describe("DialogFooter", () => {
  it("renders with data-slot='dialog-footer'", () => {
    const { container } = render(<DialogFooter />)
    expect(container.querySelector("[data-slot='dialog-footer']")).toBeInTheDocument()
  })
  it("shows close button when showCloseButton=true", () => {
    render(<DialogFooter showCloseButton={true} />)
    expect(screen.getByText("Close")).toBeInTheDocument()
  })
  it("does not show close button by default", () => {
    render(<DialogFooter />)
    expect(screen.queryByText("Close")).not.toBeInTheDocument()
  })
})

describe("DialogTitle", () => {
  it("renders title text", () => {
    render(<DialogTitle>Confirm Action</DialogTitle>)
    expect(screen.getByText("Confirm Action")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<DialogTitle className="title-custom">Title</DialogTitle>)
    expect(container.querySelector("[data-slot='dialog-title']").className).toContain("title-custom")
  })
})

describe("DialogDescription", () => {
  it("renders description text", () => {
    render(<DialogDescription>Are you sure?</DialogDescription>)
    expect(screen.getByText("Are you sure?")).toBeInTheDocument()
  })
})

describe("Dialog composition", () => {
  it("renders a full dialog", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter><button>Cancel</button></DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText("Open")).toBeInTheDocument()
    expect(screen.getByText("Delete Vehicle")).toBeInTheDocument()
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument()
  })
})