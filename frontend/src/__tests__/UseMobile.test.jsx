import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../hooks/use-mobile'

const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()

beforeEach(() => {
  Object.defineProperty(globalThis, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    })),
  })
})

afterEach(() => {
  jest.clearAllMocks()
})

describe('useIsMobile', () => {
  test('returns false when window width is >= 768', () => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  test('returns true when window width is < 768', () => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 375 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  test('adds event listener on mount', () => {
    renderHook(() => useIsMobile())
    expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  test('removes event listener on unmount', () => {
    const { unmount } = renderHook(() => useIsMobile())
    unmount()
    expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })

  test('updates when resize event fires', () => {
    Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 1024 })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(globalThis, 'innerWidth', { writable: true, value: 375 })
      const changeHandler = mockAddEventListener.mock.calls[0][1]
      changeHandler()
    })

    expect(result.current).toBe(true)
  })
})
