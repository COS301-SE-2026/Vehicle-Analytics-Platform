import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
  SidebarFooter,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarInput,
  useSidebar,
} from "./sidebar"

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: jest.fn(() => false),
}))

jest.mock("@/lib/utils", () => ({
  cn: (...args) => args.filter(Boolean).join(" "),
}))

jest.mock("class-variance-authority", () => ({
  cva: (base) => () => base,
}))

jest.mock("lucide-react", () => ({
  PanelLeftIcon: () => <svg data-testid="panel-left-icon" />,
}))

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
  TooltipTrigger: ({ children, asChild }) => <div>{children}</div>,
  TooltipContent: ({ children, ...props }) => <div data-testid="tooltip-content" {...props}>{children}</div>,
}))

jest.mock("radix-ui", () => ({
  Slot: {
    Root: ({ children, ...props }) => <span data-testid="slot-root" {...props}>{children}</span>,
  },
}))

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderWithProvider = (ui, providerProps = {}) =>
  render(<SidebarProvider {...providerProps}>{ui}</SidebarProvider>)

// ─── SidebarProvider ─────────────────────────────────────────────────────────

describe("SidebarProvider", () => {
  it("renders with data-slot='sidebar-wrapper'", () => {
    const { container } = render(<SidebarProvider><div>child</div></SidebarProvider>)
    expect(container.querySelector("[data-slot='sidebar-wrapper']")).toBeInTheDocument()
  })

  it("renders children", () => {
    render(<SidebarProvider><span>provider child</span></SidebarProvider>)
    expect(screen.getByText("provider child")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<SidebarProvider className="wrapper-custom"><div /></SidebarProvider>)
    expect(container.querySelector("[data-slot='sidebar-wrapper']").className).toContain("wrapper-custom")
  })

  it("sets CSS variable for sidebar width", () => {
    const { container } = render(<SidebarProvider><div /></SidebarProvider>)
    const wrapper = container.querySelector("[data-slot='sidebar-wrapper']")
    expect(wrapper.style.getPropertyValue("--sidebar-width")).toBeTruthy()
  })
})

// ─── useSidebar hook ─────────────────────────────────────────────────────────

describe("useSidebar", () => {
  it("throws when used outside SidebarProvider", () => {
    const TestComponent = () => {
      useSidebar()
      return null
    }
    const spy = jest.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<TestComponent />)).toThrow("useSidebar must be used within a SidebarProvider.")
    spy.mockRestore()
  })

  it("returns context values when inside SidebarProvider", () => {
    let contextValue
    const TestComponent = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestComponent />)
    expect(contextValue).toHaveProperty("open")
    expect(contextValue).toHaveProperty("toggleSidebar")
    expect(contextValue).toHaveProperty("state")
    expect(contextValue).toHaveProperty("isMobile")
  })

  it("defaults to open=true (expanded)", () => {
    let contextValue
    const TestComponent = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestComponent />)
    expect(contextValue.open).toBe(true)
    expect(contextValue.state).toBe("expanded")
  })

  it("respects defaultOpen=false", () => {
    let contextValue
    const TestComponent = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestComponent />, { defaultOpen: false })
    expect(contextValue.open).toBe(false)
    expect(contextValue.state).toBe("collapsed")
  })
})

// ─── Sidebar ─────────────────────────────────────────────────────────────────

describe("Sidebar", () => {
  it("renders with data-slot='sidebar' (collapsible=none)", () => {
    const { container } = renderWithProvider(<Sidebar collapsible="none"><div>nav</div></Sidebar>)
    expect(container.querySelector("[data-slot='sidebar']")).toBeInTheDocument()
  })

  it("renders children when collapsible=none", () => {
    renderWithProvider(<Sidebar collapsible="none"><span>nav item</span></Sidebar>)
    expect(screen.getByText("nav item")).toBeInTheDocument()
  })

  it("renders desktop sidebar by default (non-mobile)", () => {
    const { container } = renderWithProvider(<Sidebar><span>desktop</span></Sidebar>)
    expect(container.querySelector("[data-slot='sidebar']")).toBeInTheDocument()
  })
})

// ─── SidebarTrigger ──────────────────────────────────────────────────────────

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
    let contextValue
    const TestConsumer = () => {
      contextValue = useSidebar()
      return <SidebarTrigger />
    }
    renderWithProvider(<TestConsumer />)
    expect(contextValue.open).toBe(true)
    fireEvent.click(screen.getByRole("button"))
    expect(contextValue.open).toBe(false)
  })

  it("calls custom onClick handler", () => {
    const handleClick = jest.fn()
    renderWithProvider(<SidebarTrigger onClick={handleClick} />)
    fireEvent.click(screen.getByRole("button"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

// ─── SidebarInset ────────────────────────────────────────────────────────────

describe("SidebarInset", () => {
  it("renders with data-slot='sidebar-inset'", () => {
    const { container } = renderWithProvider(<SidebarInset />)
    expect(container.querySelector("[data-slot='sidebar-inset']")).toBeInTheDocument()
  })

  it("renders as a main element", () => {
    renderWithProvider(<SidebarInset />)
    expect(screen.getByRole("main")).toBeInTheDocument()
  })

  it("renders children", () => {
    renderWithProvider(<SidebarInset><p>page content</p></SidebarInset>)
    expect(screen.getByText("page content")).toBeInTheDocument()
  })
})

// ─── SidebarHeader / SidebarFooter / SidebarContent ─────────────────────────

describe("SidebarHeader", () => {
  it("renders with data-slot='sidebar-header'", () => {
    const { container } = renderWithProvider(<SidebarHeader />)
    expect(container.querySelector("[data-slot='sidebar-header']")).toBeInTheDocument()
  })
})

describe("SidebarFooter", () => {
  it("renders with data-slot='sidebar-footer'", () => {
    const { container } = renderWithProvider(<SidebarFooter />)
    expect(container.querySelector("[data-slot='sidebar-footer']")).toBeInTheDocument()
  })
})

describe("SidebarContent", () => {
  it("renders with data-slot='sidebar-content'", () => {
    const { container } = renderWithProvider(<SidebarContent />)
    expect(container.querySelector("[data-slot='sidebar-content']")).toBeInTheDocument()
  })

  it("renders children", () => {
    renderWithProvider(<SidebarContent><span>content child</span></SidebarContent>)
    expect(screen.getByText("content child")).toBeInTheDocument()
  })
})

// ─── SidebarGroup / Label / Content ──────────────────────────────────────────

describe("SidebarGroup", () => {
  it("renders with data-slot='sidebar-group'", () => {
    const { container } = renderWithProvider(<SidebarGroup />)
    expect(container.querySelector("[data-slot='sidebar-group']")).toBeInTheDocument()
  })
})

describe("SidebarGroupLabel", () => {
  it("renders with data-slot='sidebar-group-label'", () => {
    const { container } = renderWithProvider(<SidebarGroupLabel>Navigation</SidebarGroupLabel>)
    expect(container.querySelector("[data-slot='sidebar-group-label']")).toBeInTheDocument()
  })

  it("renders label text", () => {
    renderWithProvider(<SidebarGroupLabel>Navigation</SidebarGroupLabel>)
    expect(screen.getByText("Navigation")).toBeInTheDocument()
  })

  it("renders as Slot.Root when asChild=true", () => {
    renderWithProvider(<SidebarGroupLabel asChild>Label</SidebarGroupLabel>)
    expect(screen.getByTestId("slot-root")).toBeInTheDocument()
  })
})

describe("SidebarGroupContent", () => {
  it("renders with data-slot='sidebar-group-content'", () => {
    const { container } = renderWithProvider(<SidebarGroupContent />)
    expect(container.querySelector("[data-slot='sidebar-group-content']")).toBeInTheDocument()
  })
})

// ─── SidebarMenu / MenuItem / MenuButton ─────────────────────────────────────

describe("SidebarMenu", () => {
  it("renders with data-slot='sidebar-menu' as a ul", () => {
    const { container } = renderWithProvider(<SidebarMenu />)
    expect(container.querySelector("ul[data-slot='sidebar-menu']")).toBeInTheDocument()
  })
})

describe("SidebarMenuItem", () => {
  it("renders with data-slot='sidebar-menu-item' as a li", () => {
    const { container } = renderWithProvider(<SidebarMenu><SidebarMenuItem /></SidebarMenu>)
    expect(container.querySelector("li[data-slot='sidebar-menu-item']")).toBeInTheDocument()
  })
})

describe("SidebarMenuButton", () => {
  it("renders with data-slot='sidebar-menu-button'", () => {
    const { container } = renderWithProvider(<SidebarMenu><SidebarMenuItem><SidebarMenuButton>Dashboard</SidebarMenuButton></SidebarMenuItem></SidebarMenu>)
    expect(container.querySelector("[data-slot='sidebar-menu-button']")).toBeInTheDocument()
  })

  it("renders children", () => {
    renderWithProvider(<SidebarMenu><SidebarMenuItem><SidebarMenuButton>Dashboard</SidebarMenuButton></SidebarMenuItem></SidebarMenu>)
    expect(screen.getByText("Dashboard")).toBeInTheDocument()
  })

  it("sets data-active when isActive=true", () => {
    const { container } = renderWithProvider(
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton isActive>Active</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    )
    expect(container.querySelector("[data-slot='sidebar-menu-button']")).toHaveAttribute("data-active", "true")
  })

  it("renders with tooltip when tooltip prop is a string", () => {
    renderWithProvider(
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Dashboard">DB</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    )
    expect(screen.getByTestId("tooltip-content")).toBeInTheDocument()
  })

  it("renders without tooltip when no tooltip prop", () => {
    renderWithProvider(
      <SidebarMenu><SidebarMenuItem><SidebarMenuButton>DB</SidebarMenuButton></SidebarMenuItem></SidebarMenu>
    )
    expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument()
  })
})

// ─── SidebarMenuBadge ────────────────────────────────────────────────────────

describe("SidebarMenuBadge", () => {
  it("renders with data-slot='sidebar-menu-badge'", () => {
    const { container } = renderWithProvider(<SidebarMenuBadge>5</SidebarMenuBadge>)
    expect(container.querySelector("[data-slot='sidebar-menu-badge']")).toBeInTheDocument()
  })

  it("renders badge content", () => {
    renderWithProvider(<SidebarMenuBadge>12</SidebarMenuBadge>)
    expect(screen.getByText("12")).toBeInTheDocument()
  })
})

// ─── SidebarMenuSkeleton ──────────────────────────────────────────────────────

describe("SidebarMenuSkeleton", () => {
  it("renders with data-slot='sidebar-menu-skeleton'", () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(container.querySelector("[data-slot='sidebar-menu-skeleton']")).toBeInTheDocument()
  })

  it("renders text skeleton by default", () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(container.querySelector("[data-sidebar='menu-skeleton-text']")).toBeInTheDocument()
  })

  it("renders icon skeleton when showIcon=true", () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton showIcon />)
    expect(container.querySelector("[data-sidebar='menu-skeleton-icon']")).toBeInTheDocument()
  })

  it("does not render icon skeleton by default", () => {
    const { container } = renderWithProvider(<SidebarMenuSkeleton />)
    expect(container.querySelector("[data-sidebar='menu-skeleton-icon']")).not.toBeInTheDocument()
  })
})

// ─── SidebarMenuSub ──────────────────────────────────────────────────────────

describe("SidebarMenuSub", () => {
  it("renders with data-slot='sidebar-menu-sub' as a ul", () => {
    const { container } = renderWithProvider(<SidebarMenuSub />)
    expect(container.querySelector("ul[data-slot='sidebar-menu-sub']")).toBeInTheDocument()
  })
})

describe("SidebarMenuSubItem", () => {
  it("renders with data-slot='sidebar-menu-sub-item' as a li", () => {
    const { container } = renderWithProvider(<SidebarMenuSub><SidebarMenuSubItem /></SidebarMenuSub>)
    expect(container.querySelector("li[data-slot='sidebar-menu-sub-item']")).toBeInTheDocument()
  })
})

describe("SidebarMenuSubButton", () => {
  it("renders with data-slot='sidebar-menu-sub-button'", () => {
    const { container } = renderWithProvider(<SidebarMenuSubButton>Sub item</SidebarMenuSubButton>)
    expect(container.querySelector("[data-slot='sidebar-menu-sub-button']")).toBeInTheDocument()
  })

  it("renders children", () => {
    renderWithProvider(<SidebarMenuSubButton>Sub item</SidebarMenuSubButton>)
    expect(screen.getByText("Sub item")).toBeInTheDocument()
  })

  it("sets data-active when isActive=true", () => {
    const { container } = renderWithProvider(<SidebarMenuSubButton isActive>Active sub</SidebarMenuSubButton>)
    expect(container.querySelector("[data-slot='sidebar-menu-sub-button']")).toHaveAttribute("data-active", "true")
  })
})

// ─── SidebarSeparator / SidebarInput ────────────────────────────────────────

describe("SidebarSeparator", () => {
  it("renders with data-slot='sidebar-separator'", () => {
    const { container } = renderWithProvider(<SidebarSeparator />)
    expect(container.querySelector("[data-slot='sidebar-separator']")).toBeInTheDocument()
  })
})

describe("SidebarInput", () => {
  it("renders with data-slot='sidebar-input'", () => {
    const { container } = renderWithProvider(<SidebarInput />)
    expect(container.querySelector("[data-slot='sidebar-input']")).toBeInTheDocument()
  })

  it("renders an input element", () => {
    renderWithProvider(<SidebarInput placeholder="Search..." />)
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
  })
})

// ─── Keyboard shortcut ───────────────────────────────────────────────────────

describe("Sidebar keyboard shortcut", () => {
  it("toggles sidebar on Ctrl+B", () => {
    let contextValue
    const TestConsumer = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestConsumer />)
    expect(contextValue.open).toBe(true)
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
    expect(contextValue.open).toBe(false)
  })

  it("toggles sidebar on Meta+B", () => {
    let contextValue
    const TestConsumer = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestConsumer />)
    fireEvent.keyDown(window, { key: "b", metaKey: true })
    expect(contextValue.open).toBe(false)
  })

  it("does not toggle on unrelated key", () => {
    let contextValue
    const TestConsumer = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestConsumer />)
    fireEvent.keyDown(window, { key: "k", ctrlKey: true })
    expect(contextValue.open).toBe(true)
  })
})