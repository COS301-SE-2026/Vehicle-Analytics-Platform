import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Sheet, SheetTrigger, SheetClose, SheetContent,
  SheetHeader, SheetFooter, SheetTitle, SheetDescription,
} from "@/components/ui/sheet"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))
jest.mock("lucide-react", () => ({ XIcon: () => <svg data-testid="x-icon" /> }))
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, className, variant, size, ...props }) => (
    <button className={className} data-variant={variant} data-size={size} {...props}>{children}</button>
  ),
}))

// KEY FIX: Mock radix-ui Dialog (used as SheetPrimitive) to render children
// directly in the DOM instead of through a Portal. Without this, SheetContent,
// SheetTrigger etc. are invisible to container.querySelector().
jest.mock("radix-ui", () => {
  const passthrough = (dataSlot) => {
    const Comp = ({ children, ...props }) => {
      // Remove Radix-specific props that cause React DOM warnings
      const { onOpenChange, onEscapeKeyDown, onPointerDownOutside,
              onInteractOutside, onFocusOutside, asChild, modal,
              defaultOpen, open, ...rest } = props
      return <div data-slot={dataSlot} {...rest}>{children}</div>
    }
    Comp.displayName = dataSlot
    return Comp
  }

  return {
    Dialog: {
      Root:        passthrough('sheet'),
      Trigger:     passthrough('sheet-trigger'),
      Close:       passthrough('sheet-close'),
      // Portal: render children inline (no actual portal)
      Portal:      ({ children }) => <>{children}</>,
      Overlay:     passthrough('sheet-overlay'),
      Content:     passthrough('sheet-content'),
      Title:       passthrough('sheet-title'),
      Description: passthrough('sheet-description'),
    },
  }
})

describe("Sheet", () => {
  it("renders with data-slot='sheet'", () => {
    const { container } = render(<Sheet><div>content</div></Sheet>)
    expect(container.querySelector("[data-slot='sheet']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<Sheet><span>sheet child</span></Sheet>)
    expect(screen.getByText("sheet child")).toBeInTheDocument()
  })
})

describe("SheetTrigger", () => {
  it("renders with data-slot='sheet-trigger'", () => {
    const { container } = render(<SheetTrigger>Open</SheetTrigger>)
    expect(container.querySelector("[data-slot='sheet-trigger']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<SheetTrigger>Open Sheet</SheetTrigger>)
    expect(screen.getByText("Open Sheet")).toBeInTheDocument()
  })
})

describe("SheetClose", () => {
  it("renders with data-slot='sheet-close'", () => {
    const { container } = render(<SheetClose>Close</SheetClose>)
    expect(container.querySelector("[data-slot='sheet-close']")).toBeInTheDocument()
  })
})

describe("SheetContent", () => {
  it("renders with data-slot='sheet-content'", () => {
    const { container } = render(<SheetContent>Content</SheetContent>)
    expect(container.querySelector("[data-slot='sheet-content']")).toBeInTheDocument()
  })
  it("renders with default side='right'", () => {
    const { container } = render(<SheetContent>Content</SheetContent>)
    expect(container.querySelector("[data-slot='sheet-content']")).toHaveAttribute("data-side", "right")
  })
  it.each(["top","right","bottom","left"])("renders with side='%s'", (side) => {
    const { container } = render(<SheetContent side={side}>Content</SheetContent>)
    expect(container.querySelector("[data-slot='sheet-content']")).toHaveAttribute("data-side", side)
  })
  it("shows close button by default", () => {
    render(<SheetContent>Content</SheetContent>)
    expect(screen.getByTestId("x-icon")).toBeInTheDocument()
  })
  it("hides close button when showCloseButton=false", () => {
    render(<SheetContent showCloseButton={false}>Content</SheetContent>)
    expect(screen.queryByTestId("x-icon")).not.toBeInTheDocument()
  })
  it("renders children", () => {
    render(<SheetContent showCloseButton={false}><p>Sheet body</p></SheetContent>)
    expect(screen.getByText("Sheet body")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<SheetContent className="content-custom">Content</SheetContent>)
    expect(container.querySelector("[data-slot='sheet-content']").className).toContain("content-custom")
  })
})

describe("SheetHeader", () => {
  it("renders with data-slot='sheet-header'", () => {
    const { container } = render(<SheetHeader />)
    expect(container.querySelector("[data-slot='sheet-header']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<SheetHeader><span>Header content</span></SheetHeader>)
    expect(screen.getByText("Header content")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<SheetHeader className="header-custom" />)
    expect(container.querySelector("[data-slot='sheet-header']").className).toContain("header-custom")
  })
})

describe("SheetFooter", () => {
  it("renders with data-slot='sheet-footer'", () => {
    const { container } = render(<SheetFooter />)
    expect(container.querySelector("[data-slot='sheet-footer']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<SheetFooter><button>Save</button></SheetFooter>)
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument()
  })
})

describe("SheetTitle", () => {
  it("renders title text", () => {
    render(<SheetTitle>Edit Settings</SheetTitle>)
    expect(screen.getByText("Edit Settings")).toBeInTheDocument()
  })
  it("applies custom className", () => {
    const { container } = render(<SheetTitle className="title-custom">Title</SheetTitle>)
    expect(container.querySelector("[data-slot='sheet-title']").className).toContain("title-custom")
  })
})

describe("SheetDescription", () => {
  it("renders description text", () => {
    render(<SheetDescription>Make changes here.</SheetDescription>)
    expect(screen.getByText("Make changes here.")).toBeInTheDocument()
  })
})

describe("Sheet composition", () => {
  it("renders a full sheet", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Settings</SheetTrigger>
        <SheetContent showCloseButton={false} side="right">
          <SheetHeader>
            <SheetTitle>User Settings</SheetTitle>
            <SheetDescription>Adjust your preferences below.</SheetDescription>
          </SheetHeader>
          <SheetFooter><button>Save changes</button></SheetFooter>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText("Open Settings")).toBeInTheDocument()
    expect(screen.getByText("User Settings")).toBeInTheDocument()
    expect(screen.getByText("Adjust your preferences below.")).toBeInTheDocument()
    expect(screen.getByText("Save changes")).toBeInTheDocument()
  })
})