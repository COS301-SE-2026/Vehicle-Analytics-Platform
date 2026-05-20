import React from "react"
import { render, screen } from "@testing-library/react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./dropdown-menu"

jest.mock("radix-ui", () => ({
  DropdownMenu: {
    Root: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Portal: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Trigger: ({ children, "data-slot": dataSlot, ...props }) => (
      <button data-slot={dataSlot} {...props}>{children}</button>
    ),
    Content: ({ children, "data-slot": dataSlot, className, sideOffset, align, ...props }) => (
      <div data-slot={dataSlot} className={className} {...props}>{children}</div>
    ),
    Group: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    Item: ({ children, "data-slot": dataSlot, className, "data-inset": inset, "data-variant": variant, ...props }) => (
      <div data-slot={dataSlot} className={className} data-inset={inset} data-variant={variant} role="menuitem" {...props}>{children}</div>
    ),
    CheckboxItem: ({ children, "data-slot": dataSlot, className, checked, ...props }) => (
      <div data-slot={dataSlot} className={className} data-checked={checked} role="menuitemcheckbox" {...props}>{children}</div>
    ),
    RadioGroup: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} role="group" {...props}>{children}</div>
    ),
    RadioItem: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} role="menuitemradio" {...props}>{children}</div>
    ),
    Label: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} {...props}>{children}</div>
    ),
    Separator: ({ "data-slot": dataSlot, className, ...props }) => (
      <hr data-slot={dataSlot} className={className} {...props} />
    ),
    Sub: ({ children, "data-slot": dataSlot, ...props }) => (
      <div data-slot={dataSlot} {...props}>{children}</div>
    ),
    SubTrigger: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} {...props}>{children}</div>
    ),
    SubContent: ({ children, "data-slot": dataSlot, className, ...props }) => (
      <div data-slot={dataSlot} className={className} {...props}>{children}</div>
    ),
    ItemIndicator: ({ children }) => <span>{children}</span>,
  },
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

jest.mock("lucide-react", () => ({
  CheckIcon: () => <svg data-testid="check-icon" />,
  ChevronRightIcon: ({ className }) => <svg data-testid="chevron-right-icon" className={className} />,
}))

describe("DropdownMenu", () => {
  it("renders with data-slot='dropdown-menu'", () => {
    const { container } = render(<DropdownMenu><div>content</div></DropdownMenu>)
    expect(container.querySelector("[data-slot='dropdown-menu']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenu><span>child</span></DropdownMenu>)
    expect(screen.getByText("child")).toBeInTheDocument()
  })
})

describe("DropdownMenuTrigger", () => {
  it("renders with data-slot='dropdown-menu-trigger'", () => {
    const { container } = render(<DropdownMenuTrigger>Open</DropdownMenuTrigger>)
    expect(container.querySelector("[data-slot='dropdown-menu-trigger']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>)
    expect(screen.getByText("Open Menu")).toBeInTheDocument()
  })
})

describe("DropdownMenuContent", () => {
  it("renders with data-slot='dropdown-menu-content'", () => {
    const { container } = render(<DropdownMenuContent />)
    expect(container.querySelector("[data-slot='dropdown-menu-content']")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DropdownMenuContent className="content-custom" />)
    expect(container.querySelector("[data-slot='dropdown-menu-content']").className).toContain("content-custom")
  })

  it("renders children", () => {
    render(<DropdownMenuContent><span>Menu item</span></DropdownMenuContent>)
    expect(screen.getByText("Menu item")).toBeInTheDocument()
  })
})

describe("DropdownMenuGroup", () => {
  it("renders with data-slot='dropdown-menu-group'", () => {
    const { container } = render(<DropdownMenuGroup />)
    expect(container.querySelector("[data-slot='dropdown-menu-group']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenuGroup><span>group child</span></DropdownMenuGroup>)
    expect(screen.getByText("group child")).toBeInTheDocument()
  })
})

describe("DropdownMenuItem", () => {
  it("renders with data-slot='dropdown-menu-item'", () => {
    const { container } = render(<DropdownMenuItem>Item</DropdownMenuItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-item']")).toBeInTheDocument()
  })

  it("renders with default variant", () => {
    const { container } = render(<DropdownMenuItem>Item</DropdownMenuItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-item']")).toHaveAttribute("data-variant", "default")
  })

  it("renders with destructive variant", () => {
    const { container } = render(<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-item']")).toHaveAttribute("data-variant", "destructive")
  })

  it("renders children", () => {
    render(<DropdownMenuItem>Edit Profile</DropdownMenuItem>)
    expect(screen.getByText("Edit Profile")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DropdownMenuItem className="item-custom">Item</DropdownMenuItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-item']").className).toContain("item-custom")
  })

  it("sets data-inset when inset prop passed", () => {
    const { container } = render(<DropdownMenuItem inset>Item</DropdownMenuItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-item']")).toHaveAttribute("data-inset")
  })
})

describe("DropdownMenuCheckboxItem", () => {
  it("renders with data-slot='dropdown-menu-checkbox-item'", () => {
    const { container } = render(<DropdownMenuCheckboxItem>Check me</DropdownMenuCheckboxItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-checkbox-item']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenuCheckboxItem>Show Sidebar</DropdownMenuCheckboxItem>)
    expect(screen.getByText("Show Sidebar")).toBeInTheDocument()
  })

  it("renders the check indicator", () => {
    render(<DropdownMenuCheckboxItem checked>Option</DropdownMenuCheckboxItem>)
    expect(screen.getByTestId("check-icon")).toBeInTheDocument()
  })

  it("passes checked prop", () => {
    const { container } = render(<DropdownMenuCheckboxItem checked={true}>Option</DropdownMenuCheckboxItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-checkbox-item']")).toHaveAttribute("data-checked", "true")
  })
})

describe("DropdownMenuRadioGroup", () => {
  it("renders with data-slot='dropdown-menu-radio-group'", () => {
    const { container } = render(<DropdownMenuRadioGroup />)
    expect(container.querySelector("[data-slot='dropdown-menu-radio-group']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenuRadioGroup><span>radio child</span></DropdownMenuRadioGroup>)
    expect(screen.getByText("radio child")).toBeInTheDocument()
  })
})

describe("DropdownMenuRadioItem", () => {
  it("renders with data-slot='dropdown-menu-radio-item'", () => {
    const { container } = render(<DropdownMenuRadioItem>Option A</DropdownMenuRadioItem>)
    expect(container.querySelector("[data-slot='dropdown-menu-radio-item']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenuRadioItem>Option A</DropdownMenuRadioItem>)
    expect(screen.getByText("Option A")).toBeInTheDocument()
  })

  it("renders check icon indicator", () => {
    render(<DropdownMenuRadioItem>Option</DropdownMenuRadioItem>)
    expect(screen.getByTestId("check-icon")).toBeInTheDocument()
  })
})

describe("DropdownMenuLabel", () => {
  it("renders with data-slot='dropdown-menu-label'", () => {
    const { container } = render(<DropdownMenuLabel>My Account</DropdownMenuLabel>)
    expect(container.querySelector("[data-slot='dropdown-menu-label']")).toBeInTheDocument()
  })

  it("renders label text", () => {
    render(<DropdownMenuLabel>My Account</DropdownMenuLabel>)
    expect(screen.getByText("My Account")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DropdownMenuLabel className="label-custom">Label</DropdownMenuLabel>)
    expect(container.querySelector("[data-slot='dropdown-menu-label']").className).toContain("label-custom")
  })
})

describe("DropdownMenuSeparator", () => {
  it("renders with data-slot='dropdown-menu-separator'", () => {
    const { container } = render(<DropdownMenuSeparator />)
    expect(container.querySelector("[data-slot='dropdown-menu-separator']")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DropdownMenuSeparator className="sep-custom" />)
    expect(container.querySelector("[data-slot='dropdown-menu-separator']").className).toContain("sep-custom")
  })
})

describe("DropdownMenuShortcut", () => {
  it("renders with data-slot='dropdown-menu-shortcut'", () => {
    const { container } = render(<DropdownMenuShortcut>⌘K</DropdownMenuShortcut>)
    expect(container.querySelector("[data-slot='dropdown-menu-shortcut']")).toBeInTheDocument()
  })

  it("renders shortcut text", () => {
    render(<DropdownMenuShortcut>⌘P</DropdownMenuShortcut>)
    expect(screen.getByText("⌘P")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<DropdownMenuShortcut className="shortcut-custom">⌘K</DropdownMenuShortcut>)
    expect(container.querySelector("[data-slot='dropdown-menu-shortcut']").className).toContain("shortcut-custom")
  })
})

describe("DropdownMenuSub", () => {
  it("renders with data-slot='dropdown-menu-sub'", () => {
    const { container } = render(<DropdownMenuSub><div>sub</div></DropdownMenuSub>)
    expect(container.querySelector("[data-slot='dropdown-menu-sub']")).toBeInTheDocument()
  })
})

describe("DropdownMenuSubTrigger", () => {
  it("renders with data-slot='dropdown-menu-sub-trigger'", () => {
    const { container } = render(<DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>)
    expect(container.querySelector("[data-slot='dropdown-menu-sub-trigger']")).toBeInTheDocument()
  })

  it("renders children and chevron icon", () => {
    render(<DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>)
    expect(screen.getByText("More options")).toBeInTheDocument()
    expect(screen.getByTestId("chevron-right-icon")).toBeInTheDocument()
  })
})

describe("DropdownMenuSubContent", () => {
  it("renders with data-slot='dropdown-menu-sub-content'", () => {
    const { container } = render(<DropdownMenuSubContent><span>Sub item</span></DropdownMenuSubContent>)
    expect(container.querySelector("[data-slot='dropdown-menu-sub-content']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<DropdownMenuSubContent><span>Sub option</span></DropdownMenuSubContent>)
    expect(screen.getByText("Sub option")).toBeInTheDocument()
  })
})

describe("DropdownMenu composition", () => {
  it("renders a full menu structure", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Options</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem variant="destructive">Delete<DropdownMenuShortcut>⌘D</DropdownMenuShortcut></DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    expect(screen.getByText("Options")).toBeInTheDocument()
    expect(screen.getByText("My Account")).toBeInTheDocument()
    expect(screen.getByText("Profile")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()
    expect(screen.getByText("⌘D")).toBeInTheDocument()
  })
})