import React from "react"
import { render, screen } from "@testing-library/react"
import {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet"

jest.mock("radix-ui", () => ({
  Dialog: {
    Root: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Trigger: ({ children, "data-slot": dataSlot, ...props }) => (
      <button data-slot={dataSlot} {...props}>{children}</button>
    ),
    Close: ({ children, "data-slot": dataSlot, asChild, ...props }) => (
      <button data-slot={dataSlot} {...props}>{children}</button>
    ),
    Portal: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Overlay: ({ "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} {...props} />
    ),
    Content: ({ children, "data-slot": dataSlot, "data-side": dataSide, className, ...props }) => (
      <div data-slot={dataSlot} data-side={dataSide} className={className} role="dialog" {...props}>{children}</div>
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
    const { container } = render(<SheetTrigger>Open Sheet</SheetTrigger>)
    expect(container.querySelector("[data-slot='sheet-trigger']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<SheetTrigger>Open</SheetTrigger>)
    expect(screen.getByText("Open")).toBeInTheDocument()
  })
})

describe("SheetClose", () => {
  it("renders with data-slot='sheet-close'", () => {
    const { container } = render(<SheetClose>Close</SheetClose>)
    expect(container.querySelector("[data-slot='sheet-close']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<SheetClose>Close Sheet</SheetClose>)
    expect(screen.getByText("Close Sheet")).toBeInTheDocument()
  })
})

describe("SheetContent", () => {
  it("renders with data-slot='sheet-content'", () => {
    render(<SheetContent>Content</SheetContent>)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("renders with default side='right'", () => {
    render(<SheetContent>Content</SheetContent>)
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", "right")
  })

  it.each(["top", "right", "bottom", "left"])("renders with side='%s'", (side) => {
    render(<SheetContent side={side}>Content</SheetContent>)
    expect(screen.getByRole("dialog")).toHaveAttribute("data-side", side)
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
    render(<SheetContent className="content-custom">Content</SheetContent>)
    expect(screen.getByRole("dialog").className).toContain("content-custom")
  })

  it("renders sr-only Close label", () => {
    render(<SheetContent>Content</SheetContent>)
    expect(screen.getByText("Close")).toBeInTheDocument()
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

  it("applies custom className", () => {
    const { container } = render(<SheetFooter className="footer-custom" />)
    expect(container.querySelector("[data-slot='sheet-footer']").className).toContain("footer-custom")
  })
})

describe("SheetTitle", () => {
  it("renders with data-slot='sheet-title'", () => {
    const { container } = render(<SheetTitle>My Sheet</SheetTitle>)
    expect(container.querySelector("[data-slot='sheet-title']")).toBeInTheDocument()
  })

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
  it("renders with data-slot='sheet-description'", () => {
    const { container } = render(<SheetDescription>Desc</SheetDescription>)
    expect(container.querySelector("[data-slot='sheet-description']")).toBeInTheDocument()
  })

  it("renders description text", () => {
    render(<SheetDescription>Make changes to your settings here.</SheetDescription>)
    expect(screen.getByText("Make changes to your settings here.")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<SheetDescription className="desc-custom">Text</SheetDescription>)
    expect(container.querySelector("[data-slot='sheet-description']").className).toContain("desc-custom")
  })
})

describe("Sheet composition", () => {
  it("renders a full sheet with all subcomponents", () => {
    render(
      <Sheet>
        <SheetTrigger>Open Settings</SheetTrigger>
        <SheetContent showCloseButton={false} side="right">
          <SheetHeader>
            <SheetTitle>User Settings</SheetTitle>
            <SheetDescription>Adjust your preferences below.</SheetDescription>
          </SheetHeader>
          <SheetFooter>
            <button>Save changes</button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText("Open Settings")).toBeInTheDocument()
    expect(screen.getByText("User Settings")).toBeInTheDocument()
    expect(screen.getByText("Adjust your preferences below.")).toBeInTheDocument()
    expect(screen.getByText("Save changes")).toBeInTheDocument()
  })
})