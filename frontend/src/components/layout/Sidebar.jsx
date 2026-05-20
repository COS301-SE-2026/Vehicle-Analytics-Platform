import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, Truck, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { useState } from 'react'
import PropTypes from 'prop-types'
import useAuthStore from '../../store/authStore'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/viewer' },
  { icon: Map, label: 'Live Map', path: '/map' },
]

export default function Sidebar({ role, collapsed, onToggle }) {
  const navigate = useNavigate()
  const { user, role: storeRole } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  
  const displayRole = storeRole ?? role
  const name = user?.name ?? 'User Name'
  
  // Safe extraction of initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)

    const token = useAuthStore.getState().token

    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
    } catch (err) {
      console.error('Logout failed:', err)
    } finally {
      useAuthStore.getState().logout()
      navigate('/login', { replace: true })
      setIsLoggingOut(false)
    }
  }

  return (
    <aside
      className={`${
        collapsed ? 'w-[64px]' : 'w-[220px]'
      } min-h-screen bg-fleet-green flex flex-col justify-between py-6 px-3 fixed left-0 top-0 transition-all duration-300 z-20`}
    >
      {/* Top Section */}
      <div>
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between mb-10 px-1">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-white" />
              <span className="text-white font-bold text-lg">FleetTracker</span>
            </div>
          )}
          {/* Toggle Button */}
          <button
            type="button"
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-white" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-white" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : ''}
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && (
                <span className="font-sans text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile Footer */}
      <div className={`flex flex-col gap-3 px-1 ${collapsed ? 'items-center' : ''}`}>
        <div className="flex items-center gap-3 w-full">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <p className="text-white text-xs font-medium truncate">{name}</p>
              <span className="text-white text-xs opacity-80 capitalize truncate">
                {displayRole}
              </span>
            </div>
          )}
        </div>

        {/* Cleaned up action block conditional placement */}
        {!collapsed ? (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-1 inline-flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white disabled:opacity-60 self-start px-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center rounded-md bg-white/10 p-1.5 text-white/80 hover:text-white hover:bg-white/20 disabled:opacity-60"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </aside>
  )
}

Sidebar.propTypes = {
  onToggle: PropTypes.func.isRequired,
  collapsed: PropTypes.bool.isRequired,
  role: PropTypes.string,
}

Sidebar.defaultProps = {
  role: 'user',
}