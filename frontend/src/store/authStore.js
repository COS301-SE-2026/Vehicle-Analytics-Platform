import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(persist((set, get) => ({
  user: null,
  role: null,
  token: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setToken: (token) => set({ token }),
  logout: () => set({ 
    user: null, 
    role: null, 
    token: null 
  }),
  // Helper to get redirect path based on role
  getDashboardPath: () => {
    const role = get().role
    if (role === 'admin') return '/dashboard/admin'
    if (role === 'manager' || role === 'fleet_manager') return '/dashboard/manager'
    return '/dashboard/viewer'
  }
}), {
  name: 'auth-store'
}))

export default useAuthStore