import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  SidebarProvider, Sidebar, SidebarTrigger, SidebarInset,
  SidebarHeader, SidebarFooter, SidebarContent, SidebarGroup,
  SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem,
  SidebarMenuButton, SidebarMenuBadge, SidebarMenuSkeleton,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarSeparator, SidebarInput, useSidebar,
} from "@/components/ui/sidebar"

jest.mock("@/hooks/use-mobile", () => ({ useIsMobile: jest.fn(() => false) }))
jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))
jest.mock("class-variance-authority", () => ({ cva: (base) => () => base }))
jest.mock("lucide-react", () => ({ PanelLeftIcon: () => <svg data-testid="panel-left-icon" /> }))
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }) => (
    <button onClick={onClick} className={className} {...props}>{children}</button>
  ),
}))
jest.mock("@/components/ui/input", () => ({
  Input: ({ className, ...props }) => <input className={className} {...props} />,
}))
jest.mock("@/components/ui/separator", () => ({
  Separator: ({ className, ...props }) => <hr className={className} {...props} />,
}))
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className, ...props }) => <div className={className} data-testid="skeleton" {...props} />,
}))
jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, ...props }) => <div data-testid="sheet" {...props}>{children}</div>,
  SheetContent: ({ children, ...props }) => <div data-testid="sheet-content" {...props}>{children}</div>,
  SheetHeader: ({ children, ...props }) => <div {...props}>{children}</div>,
  SheetTitle: ({ children, ...props }) => <h2 {...props}>{children}</h2>,
  SheetDescription: ({ children, ...props }) => <p {...props}>{children}</p>,
}))
jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }) => <div>{children}</div>,
  TooltipTrigger: ({ children }) => <div>{children}</div>,
  TooltipContent: ({ children, ...props }) => <div data-testid="tooltip-content" {...props}>{children}</div>,
}))

const renderWithProvider = (ui, providerProps = {}) =>
  render(<SidebarProvider {...providerProps}>{ui}</SidebarProvider>)

describe("SidebarProvider", () => {
  it("renders with data-slot='sidebar-wrapper'", () => {
    const { container } = render(<SidebarProvider><div /></SidebarProvider>)
    expect(container.querySelector("[data-slot='sidebar-wrapper']")).toBeInTheDocument()
  })
  it("renders children", () => {
    render(<SidebarProvider><span>provider child</span></SidebarProvider>)
    expect(screen.getByText("provider child")).toBeInTheDocument()
  })
  it("defaults to open=true (expanded)", () => {
    let ctx
    const T = () => { ctx = useSidebar(); return null }
    renderWithProvider(<T />)
    expect(ctx.open).toBe(true)
    expect(ctx.state).toBe("expanded")
  })
  it("respects defaultOpen=false", () => {
    let ctx
    const T = () => { ctx = useSidebar(); return null }
    renderWithProvider(<T />, { defaultOpen: false })
    expect(ctx.open).toBe(false)
    expect(ctx.state).toBe("collapsed")
  })
})

describe("useSidebar", () => {
  it("throws when used outside SidebarProvider", () => {
    const T = () => { useSidebar(); return null }
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<T />)).toThrow("useSidebar must be used within a SidebarProvider.")
    spy.mockRestore()
  })
  it("returns context values", () => {
    let ctx
    const T = () => { ctx = useSidebar(); return null }
    renderWithProvider(<T />)
    expect(ctx).toHaveProperty("open")
    expect(ctx).toHaveProperty("toggleSidebar")
    expect(ctx).toHaveProperty("state")
  })
})

describe("SidebarTrigger", () => {
  it("renders with data-slot='sidebar-trigger'", () => {
    const { container } = renderWithProvider(<SidebarTrigger />)
    expect(container.querySelector("[data-slot='sidebar-trigger']")).toBeInTheDocument()
  })
  it("renders PanelLeftIcon", () => {
    renderWithProvider(<SidebarTrigger />)
    expect(screen.getByTestId("panel-left-icon")).toBeInTheDocument()
  })
  it("toggles sidebar on click", () => {
    let ctx
    const T = () => { ctx = useSidebar(); return <SidebarTrigger /> }
    renderWithProvider(<T />)
    expect(ctx.open).toBe(true)
    fireEvent.click(screen.getByRole("button"))
    expect(ctx.open).toBe(false)
  })
  it("calls custom onClick handler", () => {
    const handleClick = jest.fn()
    renderWithProvider(<SidebarTrigger onClick={handleClick} />)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

describe("SidebarInset", () => {
  it("renders as a main element", () => {
    renderWithProvider(<SidebarInset />)
    expect(screen.getByRole("main")).toBeInTheDocument()
  })
  it("renders children", () => {
    renderWithProvider(<SidebarInset><p>page content</p></SidebarInset>)
    expect(screen.getByText("page content")).toBeInTheDocument()
  })
})

describe("SidebarHeader / Footer / Content", () => {
  it("renders SidebarHeader", () => {
    const { container } = renderWithProvider(<SidebarHeader />)
    expect(container.querySelector("[data-slot='sidebar-header']")).toBeInTheDocument()
  })
  it("renders SidebarFooter", () => {
    const { container } = renderWithProvider(<SidebarFooter />)
    expect(container.querySelector("[data-slot='sidebar-footer']")).toBeInTheDocument()
  })
  it("renders SidebarContent with children", () => {
    renderWithProvider(<SidebarContent><span>content child</span></SidebarContent>)
    expect(screen.getByText("content child")).toBeInTheDocument()
  })
})

describe("SidebarGroup / Label / Content", () => {
  it("renders SidebarGroup", () => {
    const { container } = renderWithProvider(<SidebarGroup />)
    expect(container.querySelector("[data-slot='sidebar-group']")).toBeInTheDocument()
  })
  it("renders SidebarGroupLabel text", () => {
    renderWithProvider(<SidebarGroupLabel>Navigation</SidebarGroupLabel>)
    expect(screen.getByText("Navigation")).toBeInTheDocument()
  })
  it("renders SidebarGroupLabel as Slot when asChild=true", () => {
    renderWithProvider(<SidebarGroupLabel asChild>Label</SidebarGroupLabel>)
    expect(screen.getByTestId("slot-root")).toBeInTheDocument()
  })
})

describe("SidebarMenu / MenuItem / MenuButton", () => {
  it("renders SidebarMenu as ul", () => {
    const { container } = renderWithProvider(<SidebarMenu />)
    expect(container.querySelector("ul[data-slot='sidebar-menu']")).toBeInTheDocument()
  })
  it("renders SidebarMenuItem as li", () => {
    const { container } = renderWithProvider(<SidebarMenu><SidebarMenuItem /></SidebarMenu>)
    expect(container.querySelector("li[data-slot='sidebar-menu-item']")).toBeInTheDocument()
  })
  it("renders SidebarMenuButton children", () => {
    renderWithProvider(<SidebarMenu><SidebarMenuItem><SidebarMenuButton>Dashboard</SidebarMenuButton></SidebarMenuItem></SidebarMenu>)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })
  it("sets data-active when isActive=true", () => {
    const { container } = renderWithProvider(
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive>Active</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    )
    expect(container.querySelector("[data-slot='sidebar-menu-button']")).toHaveAttribute("data-active", "true")
  })
  it("renders tooltip when tooltip prop provided", () => {
    renderWithProvider(
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Dashboard">DB</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    )
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument()
  })
})

describe("SidebarMenuBadge", () => {
  it("renders badge content", () => {
    renderWithProvider(<SidebarMenuBadge>12</SidebarMenuBadge>)
    expect(screen.getByText("12")).toBeInTheDocument()
  })
})

describe("SidebarMenuSkeleton", () => {
  it("renders skeleton text by default", () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(container.querySelector("[data-sidebar='menu-skeleton-text']")).toBeInTheDocument()
  })
  it("renders icon skeleton when showIcon=true", () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton showIcon />)
    expect(container.querySelector("[data-sidebar='menu-skeleton-icon']")).toBeInTheDocument()
  })
})

describe("SidebarMenuSub", () => {
  it("renders as ul", () => {
    const { container } = renderWithProvider(<SidebarMenuSub />)
    expect(container.querySelector("ul[data-slot='sidebar-menu-sub']")).toBeInTheDocument()
  })
})

describe("SidebarMenuSubButton", () => {
  it("renders children", () => {
    renderWithProvider(<SidebarMenuSubButton>Sub item</SidebarMenuSubButton>)
    expect(screen.getByText("Sub item")).toBeInTheDocument()
  })
  it("sets data-active when isActive=true", () => {
    const { container } = renderWithProvider(<SidebarMenuSubButton isActive>Active sub</SidebarMenuSubButton>)
    expect(container.querySelector("[data-slot='sidebar-menu-sub-button']")).toHaveAttribute("data-active", "true")
  })
})

describe("SidebarInput", () => {
  it("renders an input", () => {
    renderWithProvider(<SidebarInput placeholder="Search..." />)
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
  })
})

describe("Keyboard shortcut", () => {
  it("toggles sidebar on Ctrl+B", () => {
    let ctx
    const T = () => { ctx = useSidebar(); return null }
    renderWithProvider(<T />)
    expect(ctx.open).toBe(true)
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
    expect(ctx.open).toBe(false)
  })
  it("does not toggle on unrelated key", () => {
    let ctx
    const T = () => { ctx = useSidebar(); return null }
    renderWithProvider(<T />)
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    expect(ctx.open).toBe(true)
  })
})