import { create } from 'zustand'

const useAuthStore = create((set) => ({
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
    const role = useAuthStore.getState().role
    if (role === 'admin') return '/dashboard/admin'
    if (role === 'manager') return '/dashboard/manager'
    return '/dashboard/viewer'
  }
}))

export default useAuthStore