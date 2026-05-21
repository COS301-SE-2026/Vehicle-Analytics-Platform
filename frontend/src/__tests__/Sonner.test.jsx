jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({ theme: 'light' })),
}))

jest.mock('sonner', () => ({
  Toaster: jest.fn(({ theme, className, style, toastOptions, icons, ...props }) => (
    <div
      data-testid="sonner-toaster"
      data-theme={theme}
      className={className}
      {...props}
    />
  )),
}))

jest.mock('lucide-react', () => ({
  CircleCheckIcon: ({ className }) => <svg data-testid="icon-success" className={className} />,
  InfoIcon: ({ className }) => <svg data-testid="icon-info" className={className} />,
  TriangleAlertIcon: ({ className }) => <svg data-testid="icon-warning" className={className} />,
  OctagonXIcon: ({ className }) => <svg data-testid="icon-error" className={className} />,
  Loader2Icon: ({ className }) => <svg data-testid="icon-loading" className={className} />,
}))

import { render } from '@testing-library/react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner } from 'sonner'
import { Toaster } from '../components/ui/sonner'

beforeEach(() => {
  jest.clearAllMocks()
  useTheme.mockReturnValue({ theme: 'light' })
})

describe('Toaster', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<Toaster />)
    expect(getByTestId('sonner-toaster')).toBeInTheDocument()
  })

  test('passes theme from useTheme to Sonner', () => {
    useTheme.mockReturnValue({ theme: 'dark' })
    const { getByTestId } = render(<Toaster />)
    expect(getByTestId('sonner-toaster')).toHaveAttribute('data-theme', 'dark')
  })

  test("defaults to 'system' theme when useTheme returns undefined", () => {
    useTheme.mockReturnValue({ theme: undefined })
    render(<Toaster />)
    const props = Sonner.mock.calls[0][0]
    expect(props.theme).toBe('system')
  })

  test("applies 'toaster group' className", () => {
    render(<Toaster />)
    const props = Sonner.mock.calls[0][0]
    expect(props.className).toBe('toaster group')
  })

  test('passes custom CSS variables in style prop', () => {
    render(<Toaster />)
    const props = Sonner.mock.calls[0][0]
    expect(props.style).toMatchObject({
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    })
  })

  test('passes toastOptions with classNames', () => {
    render(<Toaster />)
    const props = Sonner.mock.calls[0][0]
    expect(props.toastOptions).toBeDefined()
    expect(props.toastOptions.classNames).toBeDefined()
  })

  test('passes custom icons object with all five icon types', () => {
    render(<Toaster />)
    const props = Sonner.mock.calls[0][0]
    expect(props.icons).toHaveProperty('success')
    expect(props.icons).toHaveProperty('info')
    expect(props.icons).toHaveProperty('warning')
    expect(props.icons).toHaveProperty('error')
    expect(props.icons).toHaveProperty('loading')
  })

  test('forwards additional props to Sonner', () => {
    render(<Toaster position="top-right" richColors />)
    const props = Sonner.mock.calls[0][0]
    expect(props.position).toBe('top-right')
    expect(props.richColors).toBe(true)
  })

  test("uses 'light' theme when useTheme returns light", () => {
    useTheme.mockReturnValue({ theme: 'light' })
    render(<Toaster />)
    const props = Sonner.mock.calls[0][0]
    expect(props.theme).toBe('light')
  })
})