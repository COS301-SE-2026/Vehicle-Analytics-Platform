jest.mock('../components/ui/sidebar', () => ({
  SidebarProvider: ({ children }) => <div data-testid="sidebar-provider">{children}</div>,
  Sidebar: ({ children }) => <div data-testid="sidebar">{children}</div>,
  SidebarHeader: ({ children }) => <div data-testid="sidebar-header">{children}</div>,
  SidebarContent: ({ children }) => <div data-testid="sidebar-content">{children}</div>,
  SidebarFooter: ({ children }) => <div data-testid="sidebar-footer">{children}</div>,
  SidebarMenu: ({ children }) => <ul>{children}</ul>,
  SidebarMenuItem: ({ children }) => <li>{children}</li>,
  SidebarMenuButton: ({ children }) => <button>{children}</button>,
  SidebarGroup: ({ children }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }) => <div>{children}</div>,
  SidebarTrigger: () => <button>Toggle</button>,
  SidebarInset: ({ children }) => <main>{children}</main>,
}))

import { render, screen } from '@testing-library/react'
import {
  SidebarProvider, Sidebar, SidebarHeader,
  SidebarContent, SidebarFooter, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton
} from '../components/ui/sidebar'

describe('Sidebar', () => {
  test('renders sidebar structure', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Logo</SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Dashboard</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>Footer</SidebarFooter>
        </Sidebar>
      </SidebarProvider>
    )
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByText('Logo')).toBeInTheDocument()
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })
})