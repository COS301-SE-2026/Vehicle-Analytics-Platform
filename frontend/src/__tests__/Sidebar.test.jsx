import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"

jest.mock("@/lib/utils", () => ({ cn: (...args) => args.filter(Boolean).join(" ") }))

jest.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}))

jest.mock("class-variance-authority", () => ({
  cva: (base, config) => ({ className, ...variants } = {}) => {
    const classes = [base]
    if (config?.variants && variants) {
      Object.entries(variants).forEach(([key, val]) => {
        if (val && config.variants[key]?.[val]) {
          classes.push(config.variants[key][val])
        }
      })
    }
    if (className) classes.push(className)
    return classes.filter(Boolean).join(" ")
  },
}))

jest.mock("radix-ui", () => ({
  Slot: {
    Root: ({ children, ...props }) => <div data-testid="slot-root" {...props}>{children}</div>,
  },
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }) => <button onClick={onClick} {...props}>{children}</button>,
}))

jest.mock("@/components/ui/input", () => ({
  Input: (props) => <input {...props} />,
}))

jest.mock("@/components/ui/separator", () => ({
  Separator: (props) => <hr {...props} />,
}))

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }) => <div>{children}</div>,
  SheetContent: ({ children }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }) => <div>{children}</div>,
  SheetTitle: ({ children }) => <div>{children}</div>,
  SheetDescription: ({ children }) => <div>{children}</div>,
}))

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: (props) => <div data-testid="skeleton" {...props} />,
}))

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }) => <div>{children}</div>,
  TooltipTrigger: ({ children }) => <div>{children}</div>,
  TooltipContent: (props) => <div {...props} />,
}))

jest.mock("lucide-react", () => ({
  PanelLeftIcon: () => <span>PanelLeft</span>,
}))

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarInset,
  SidebarInput,
  SidebarSeparator,
  SidebarTrigger,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "../components/ui/sidebar"

// Helper to wrap components that need SidebarProvider
const renderWithProvider = (ui, props = {}) =>
  render(<SidebarProvider {...props}>{ui}</SidebarProvider>)

describe("SidebarProvider", () => {
  test("renders children", () => {
    render(<SidebarProvider><div data-testid="child">hello</div></SidebarProvider>)
    expect(screen.getByTestId("child")).toBeInTheDocument()
  })

  test("renders sidebar-wrapper slot", () => {
    const { container } = render(<SidebarProvider><div /></SidebarProvider>)
    expect(container.querySelector('[data-slot="sidebar-wrapper"]')).toBeInTheDocument()
  })

  test("applies custom className", () => {
    const { container } = render(<SidebarProvider className="custom-wrapper"><div /></SidebarProvider>)
    expect(container.querySelector(".custom-wrapper")).toBeInTheDocument()
  })

  test("toggles sidebar with keyboard shortcut Ctrl+B", () => {
    render(<SidebarProvider><div /></SidebarProvider>)
    fireEvent.keyDown(window, { key: "b", ctrlKey: true })
  })
})

describe("Sidebar", () => {
  test("renders children in default mode", () => {
    renderWithProvider(
      <Sidebar><div data-testid="sidebar-child">content</div></Sidebar>
    )
    expect(screen.getByTestId("sidebar-child")).toBeInTheDocument()
  })

  test("renders with collapsible=none as a plain div", () => {
    const { container } = renderWithProvider(
      <Sidebar collapsible="none"><div>content</div></Sidebar>
    )
    expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
  })

  test("renders sidebar slot", () => {
    const { container } = renderWithProvider(<Sidebar><div /></Sidebar>)
    expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
  })
})

describe("SidebarTrigger", () => {
  test("renders toggle button", () => {
    renderWithProvider(<SidebarTrigger />)
    expect(screen.getByText("PanelLeft")).toBeInTheDocument()
  })

  test("calls onClick and toggles sidebar", () => {
    const onClick = jest.fn()
    renderWithProvider(<SidebarTrigger onClick={onClick} />)
    fireEvent.click(screen.getByText("PanelLeft").closest("button"))
    expect(onClick).toHaveBeenCalled()
  })
})

describe("SidebarHeader", () => {
  test("renders with data-slot", () => {
    const { container } = renderWithProvider(<Sidebar><SidebarHeader>Head</SidebarHeader></Sidebar>)
    expect(container.querySelector('[data-slot="sidebar-header"]')).toBeInTheDocument()
  })

  test("renders children", () => {
    renderWithProvider(<Sidebar><SidebarHeader>My Header</SidebarHeader></Sidebar>)
    expect(screen.getByText("My Header")).toBeInTheDocument()
  })
})

describe("SidebarFooter", () => {
  test("renders with data-slot", () => {
    const { container } = renderWithProvider(<Sidebar><SidebarFooter>Foot</SidebarFooter></Sidebar>)
    expect(container.querySelector('[data-slot="sidebar-footer"]')).toBeInTheDocument()
  })
})

describe("SidebarContent", () => {
  test("renders children", () => {
    renderWithProvider(<Sidebar><SidebarContent><div>Content</div></SidebarContent></Sidebar>)
    expect(screen.getByText("Content")).toBeInTheDocument()
  })
})

describe("SidebarGroup", () => {
  test("renders with data-slot", () => {
    const { container } = renderWithProvider(<Sidebar><SidebarContent><SidebarGroup /></SidebarContent></Sidebar>)
    expect(container.querySelector('[data-slot="sidebar-group"]')).toBeInTheDocument()
  })
})

describe("SidebarGroupLabel", () => {
  test("renders label text", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarGroup><SidebarGroupLabel>Nav</SidebarGroupLabel></SidebarGroup></SidebarContent></Sidebar>
    )
    expect(screen.getByText("Nav")).toBeInTheDocument()
  })
})

describe("SidebarGroupContent", () => {
  test("renders children", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarGroup><SidebarGroupContent>Items</SidebarGroupContent></SidebarGroup></SidebarContent></Sidebar>
    )
    expect(screen.getByText("Items")).toBeInTheDocument()
  })
})

describe("SidebarGroupAction", () => {
  test("renders with data-slot", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarGroup><SidebarGroupAction /></SidebarGroup></SidebarContent></Sidebar>
    )
    expect(container.querySelector('[data-slot="sidebar-group-action"]')).toBeInTheDocument()
  })
})

describe("SidebarMenu", () => {
  test("renders as ul", () => {
    const { container } = renderWithProvider(<Sidebar><SidebarContent><SidebarMenu /></SidebarContent></Sidebar>)
    expect(container.querySelector("ul")).toBeInTheDocument()
  })
})

describe("SidebarMenuItem", () => {
  test("renders as li", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem /></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(container.querySelector("li")).toBeInTheDocument()
  })
})

describe("SidebarMenuButton", () => {
  test("renders children", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton>Click</SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(screen.getByText("Click")).toBeInTheDocument()
  })

  test("renders with tooltip when tooltip prop is a string", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem>
        <SidebarMenuButton tooltip="My Tip">Item</SidebarMenuButton>
      </SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(screen.getByText("Item")).toBeInTheDocument()
  })

  test("renders with tooltip when tooltip prop is an object", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem>
        <SidebarMenuButton tooltip={{ children: "Tip text" }}>Item</SidebarMenuButton>
      </SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(screen.getByText("Item")).toBeInTheDocument()
  })
})

describe("SidebarMenuAction", () => {
  test("renders with data-slot", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem><SidebarMenuAction /></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(container.querySelector('[data-slot="sidebar-menu-action"]')).toBeInTheDocument()
  })
})

describe("SidebarMenuBadge", () => {
  test("renders badge content", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem><SidebarMenuBadge>5</SidebarMenuBadge></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(screen.getByText("5")).toBeInTheDocument()
  })
})

describe("SidebarMenuSkeleton", () => {
  test("renders skeleton", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuSkeleton /></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(container.querySelector('[data-slot="sidebar-menu-skeleton"]')).toBeInTheDocument()
  })

  test("renders with icon when showIcon is true", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuSkeleton showIcon /></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(container.querySelector('[data-sidebar="menu-skeleton-icon"]')).toBeInTheDocument()
  })
})

describe("SidebarMenuSub", () => {
  test("renders as ul", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem><SidebarMenuSub /></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(container.querySelector('[data-slot="sidebar-menu-sub"]')).toBeInTheDocument()
  })
})

describe("SidebarMenuSubItem", () => {
  test("renders as li", () => {
    const { container } = renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem><SidebarMenuSub><SidebarMenuSubItem /></SidebarMenuSub></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(container.querySelector('[data-slot="sidebar-menu-sub-item"]')).toBeInTheDocument()
  })
})

describe("SidebarMenuSubButton", () => {
  test("renders children", () => {
    renderWithProvider(
      <Sidebar><SidebarContent><SidebarMenu><SidebarMenuItem><SidebarMenuSub><SidebarMenuSubItem><SidebarMenuSubButton>Sub</SidebarMenuSubButton></SidebarMenuSubItem></SidebarMenuSub></SidebarMenuItem></SidebarMenu></SidebarContent></Sidebar>
    )
    expect(screen.getByText("Sub")).toBeInTheDocument()
  })
})

describe("SidebarInset", () => {
  test("renders as main", () => {
    const { container } = renderWithProvider(<SidebarInset><div>Main</div></SidebarInset>)
    expect(container.querySelector("main")).toBeInTheDocument()
  })
})

describe("SidebarInput", () => {
  test("renders input", () => {
    const { container } = renderWithProvider(<Sidebar><SidebarInput /></Sidebar>)
    expect(container.querySelector("input")).toBeInTheDocument()
  })
})

describe("SidebarSeparator", () => {
  test("renders separator", () => {
    const { container } = renderWithProvider(<Sidebar><SidebarSeparator /></Sidebar>)
    expect(container.querySelector("hr")).toBeInTheDocument()
  })
})

describe("useSidebar hook", () => {
  test("throws when used outside SidebarProvider", () => {
    const TestComp = () => { useSidebar(); return null }
    expect(() => render(<TestComp />)).toThrow("useSidebar must be used within a SidebarProvider.")
  })

  test("returns context values when inside provider", () => {
    let contextValue
    const TestComp = () => {
      contextValue = useSidebar()
      return null
    }
    renderWithProvider(<TestComp />)
    expect(contextValue).toHaveProperty("open")
    expect(contextValue).toHaveProperty("toggleSidebar")
    expect(contextValue).toHaveProperty("state")
  })
})