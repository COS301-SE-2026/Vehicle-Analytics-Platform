import React from "react"
import { render } from "@testing-library/react"
import { Toaster } from "../components/ui/sonner"

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(() => ({ theme: "light" })),
}))

// Mock sonner
jest.mock("sonner", () => ({
  Toaster: jest.fn(({ theme, className, icons, style, toastOptions, ...props }) => (
    <div
      data-testid="sonner-toaster"
      data-theme={theme}
      className={className}
      {...props}
    />
  )),
}))

// Mock lucide-react icons
jest.mock("lucide-react", () => ({
  CircleCheckIcon: ({ className }) => <svg data-testid="icon-success" className={className} />,
  InfoIcon: ({ className }) => <svg data-testid="icon-info" className={className} />,
  TriangleAlertIcon: ({ className }) => <svg data-testid="icon-warning" className={className} />,
  OctagonXIcon: ({ className }) => <svg data-testid="icon-error" className={className} />,
  Loader2Icon: ({ className }) => <svg data-testid="icon-loading" className={className} />,
}))

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

describe("Toaster", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useTheme.mockReturnValue({ theme: "light" })
  })

  it("renders without crashing", () => {
    const { getByTestId } = render(<Toaster />)
    expect(getByTestId("sonner-toaster")).toBeInTheDocument()
  })

  it("passes theme from useTheme to Sonner", () => {
    useTheme.mockReturnValue({ theme: "dark" })
    const { getByTestId } = render(<Toaster />)
    expect(getByTestId("sonner-toaster")).toHaveAttribute("data-theme", "dark")
  })

  it("defaults to 'system' theme when useTheme returns undefined", () => {
    useTheme.mockReturnValue({ theme: undefined })
    render(<Toaster />)
    expect(Sonner).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "system" }),
      expect.anything()
    )
  })

  it("applies 'toaster group' className", () => {
    render(<Toaster />)
    expect(Sonner).toHaveBeenCalledWith(
      expect.objectContaining({ className: "toaster group" }),
      expect.anything()
    )
  })

  it("passes custom CSS variables in style prop", () => {
    render(<Toaster />)
    expect(Sonner).toHaveBeenCalledWith(
      expect.objectContaining({
        style: expect.objectContaining({
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        }),
      }),
      expect.anything()
    )
  })

  it("passes toastOptions with cn-toast class", () => {
    render(<Toaster />)
    expect(Sonner).toHaveBeenCalledWith(
      expect.objectContaining({
        toastOptions: expect.objectContaining({
          classNames: expect.objectContaining({ toast: "cn-toast" }),
        }),
      }),
      expect.anything()
    )
  })

  it("passes custom icons object with all five icon types", () => {
    render(<Toaster />)
    const call = Sonner.mock.calls[0][0]
    expect(call.icons).toHaveProperty("success")
    expect(call.icons).toHaveProperty("info")
    expect(call.icons).toHaveProperty("warning")
    expect(call.icons).toHaveProperty("error")
    expect(call.icons).toHaveProperty("loading")
  })

  it("forwards additional props to Sonner", () => {
    render(<Toaster position="top-right" richColors />)
    expect(Sonner).toHaveBeenCalledWith(
      expect.objectContaining({ position: "top-right", richColors: true }),
      expect.anything()
    )
  })

  it("uses 'light' theme by default", () => {
    useTheme.mockReturnValue({ theme: "light" })
    render(<Toaster />)
    expect(Sonner).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "light" }),
      expect.anything()
    )
  })
})