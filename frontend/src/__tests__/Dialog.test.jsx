import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./dialog"

// Mock radix-ui Dialog primitives
jest.mock("radix-ui", () => ({
  Dialog: {
    Root: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Trigger: ({ children, "data-slot": dataSlot, ...props }) => (
      <button data-slot={dataSlot} {...props}>{children}</button>
    ),
    Portal: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Close: ({ children, "data-slot": dataSlot, asChild, ...props }) => (
      <button data-slot={dataSlot} {...props}>{children}</button>
    ),
    Overlay: ({ "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} {...props} />
    ),
    Content: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} role="dialog" {...props}>{children}</div>
    ),
    Title: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <h2 data-slot={dataSlot} className={className} {...props}>{children}</h2>
    ),
    Description: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <p data-slot={dataSlot} className={className} {...props}>{children}</p>
    ),
  },
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

jest.mock("lucide-react", () => ({
  XIcon: () => <svg data-testid="x-icon" />,
}))

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

  it("renders children", () => {
    render(<Dialog><span>dialog child</span></Dialog>)
    expect(screen.getByText("dialog child")).toBeInTheDocument()
  })
})

describe("DialogTrigger", () => {
  it("renders with data-slot='dialog-trigger'", () => {
    const { container } = render(<DialogTrigger>Open</DialogTrigger>)
    expect(container.querySelector("[data-slot='dialog-trigger']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DialogTrigger>Open Dialog</DialogTrigger>)
    expect(screen.getByText("Open Dialog")).toBeInTheDocument()
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
  it("renders with data-slot='dialog-content'", () => {
    render(<DialogContent>Content</DialogContent>)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

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
    render(<DialogContent className="content-custom">Content</DialogContent>)
    expect(screen.getByRole("dialog").className).toContain("content-custom")
  })

  it("renders sr-only Close label", () => {
    render(<DialogContent>Content</DialogContent>)
    expect(screen.getByText("Close")).toBeInTheDocument()
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

  it("applies custom className", () => {
    const { container } = render(<DialogHeader className="header-custom" />)
    expect(container.querySelector("[data-slot='dialog-header']").className).toContain("header-custom")
  })
})

describe("DialogFooter", () => {
  it("renders with data-slot='dialog-footer'", () => {
    const { container } = render(<DialogFooter />)
    expect(container.querySelector("[data-slot='dialog-footer']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DialogFooter><button>Cancel</button></DialogFooter>)
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
  })

  it("does not show close button by default", () => {
    const { container } = render(<DialogFooter />)
    expect(screen.queryByText("Close")).not.toBeInTheDocument()
  })

  it("shows close button when showCloseButton=true", () => {
    render(<DialogFooter showCloseButton={true} />)
    expect(screen.getByText("Close")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DialogFooter className="footer-custom" />)
    expect(container.querySelector("[data-slot='dialog-footer']").className).toContain("footer-custom")
  })
})

describe("DialogTitle", () => {
  it("renders with data-slot='dialog-title'", () => {
    const { container } = render(<DialogTitle>My Title</DialogTitle>)
    expect(container.querySelector("[data-slot='dialog-title']")).toBeInTheDocument()
  })

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
  it("renders with data-slot='dialog-description'", () => {
    const { container } = render(<DialogDescription>Desc</DialogDescription>)
    expect(container.querySelector("[data-slot='dialog-description']")).toBeInTheDocument()
  })

  it("renders description text", () => {
    render(<DialogDescription>Are you sure you want to proceed?</DialogDescription>)
    expect(screen.getByText("Are you sure you want to proceed?")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DialogDescription className="desc-custom">Text</DialogDescription>)
    expect(container.querySelector("[data-slot='dialog-description']").className).toContain("desc-custom")
  })
})

describe("Dialog composition", () => {
  it("renders a full dialog with all subcomponents", () => {
    render(
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button>Cancel</button>
            <button>Confirm</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByText("Open")).toBeInTheDocument()
    expect(screen.getByText("Delete Vehicle")).toBeInTheDocument()
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
    expect(screen.getByText("Confirm")).toBeInTheDocument()
  })
})