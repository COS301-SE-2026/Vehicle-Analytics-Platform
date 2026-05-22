import { act } from 'react'
import useAuthStore from '../store/authStore'

beforeEach(() => {
  act(() => {
    useAuthStore.setState({ user: null, role: null, token: null })
  })
})

describe('authStore', () => {
  test('initial state has null user, role, and token', () => {
    const { user, role, token } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(role).toBeNull()
    expect(token).toBeNull()
  })

  test('setUser updates the user', () => {
    act(() => useAuthStore.getState().setUser({ id: 1, name: 'Zipho' }))
    expect(useAuthStore.getState().user).toEqual({ id: 1, name: 'Zipho' })
  })

  test('setRole updates the role', () => {
    act(() => useAuthStore.getState().setRole('admin'))
    expect(useAuthStore.getState().role).toBe('admin')
  })

  test('setToken updates the token', () => {
    act(() => useAuthStore.getState().setToken('abc123'))
    expect(useAuthStore.getState().token).toBe('abc123')
  })

  test('logout clears user, role and token', () => {
    act(() => {
      useAuthStore.getState().setUser({ id: 1 })
      useAuthStore.getState().setRole('admin')
      useAuthStore.getState().setToken('abc123')
      useAuthStore.getState().logout()
    })
    const { user, role, token } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(role).toBeNull()
    expect(token).toBeNull()
  })

  test('getDashboardPath returns /dashboard/admin for admin', () => {
    act(() => useAuthStore.getState().setRole('admin'))
    expect(useAuthStore.getState().getDashboardPath()).toBe('/dashboard/admin')
  })

  test('getDashboardPath returns /dashboard/manager for manager', () => {
    act(() => useAuthStore.getState().setRole('manager'))
    expect(useAuthStore.getState().getDashboardPath()).toBe('/dashboard/manager')
  })

  test('getDashboardPath returns /dashboard/viewer for viewer', () => {
    act(() => useAuthStore.getState().setRole('viewer'))
    expect(useAuthStore.getState().getDashboardPath()).toBe('/dashboard/viewer')
  })

  test('getDashboardPath returns /dashboard/viewer when role is null', () => {
    expect(useAuthStore.getState().getDashboardPath()).toBe('/dashboard/viewer')
  })
})
