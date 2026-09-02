import { renderHook, act, waitFor } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

describe('useIsMobile', () => {
  let mediaQueryListeners = []
  
  beforeEach(() => {
    mediaQueryListeners = []
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 1024 })

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn((_, cb) => mediaQueryListeners.push(cb)),
      removeEventListener: jest.fn((_, cb) => {
        mediaQueryListeners = mediaQueryListeners.filter((l) => l !== cb)
      }),
    }))

  })
  
  test('returns true when window width is < 768', async () => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 375 })
    const { result } = renderHook(() => useIsMobile())

    await waitFor(() => {
      expect(result.current).toBe(true)
    })

  })

  test('returns false when window width is >= 768', async () => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 1024 })

    const { result } = renderHook(() => useIsMobile())

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
    
  })

  test('updates when resize event fires', async () => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())

    await waitFor(() => {
      expect(result.current).toBe(false)
    })

    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 375 })

    act(() => {
      mediaQueryListeners.forEach((listener) => listener())
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })
})