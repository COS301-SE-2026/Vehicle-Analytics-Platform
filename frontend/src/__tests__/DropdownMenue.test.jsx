import React from "react"
import { render, screen } from "@testing-library/react"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuItem, DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))
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
})

describe("DropdownMenuRadioGroup", () => {
  it("renders with data-slot='dropdown-menu-radio-group'", () => {
    const { container } = render(<DropdownMenuRadioGroup />)
    expect(container.querySelector("[data-slot='dropdown-menu-radio-group']")).toBeInTheDocument()
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
})

describe("DropdownMenuSeparator", () => {
  it("renders with data-slot='dropdown-menu-separator'", () => {
    const { container } = render(<DropdownMenuSeparator />)
    expect(container.querySelector("[data-slot='dropdown-menu-separator']")).toBeInTheDocument()
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
})

describe("DropdownMenuSub", () => {
  it("renders with data-slot='dropdown-menu-sub'", () => {
    const { container } = render(<DropdownMenuSub><div>sub</div></DropdownMenuSub>)
    expect(container.querySelector("[data-slot='dropdown-menu-sub']")).toBeInTheDocument()
  })
})

describe("DropdownMenuSubTrigger", () => {
  it("renders children and chevron icon", () => {
    render(<DropdownMenuSubTrigger>More options</DropdownMenuSubTrigger>)
    expect(screen.getByText("More options")).toBeInTheDocument()
    expect(screen.getByTestId("chevron-right-icon")).toBeInTheDocument()
  })
})

describe("DropdownMenuSubContent", () => {
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
            <DropdownMenuItem variant="destructive">
              Delete<DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
            </DropdownMenuItem>
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