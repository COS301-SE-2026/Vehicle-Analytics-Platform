import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Map, Globe, ChevronLeft, ChevronRight, LogOut, Truck, BellRing, FileBarChart, UsersRound, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import PropTypes from 'prop-types'
import useAuthStore from '../../store/authStore'
import vaporlogo from "../../pages/landing/img/logo.png"

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000'

// Who sees each link. Keep in step with the allowedRoles on the routes in App.jsx,
// or users see links that just bounce them back to their start page.
const MANAGERS = ['manager', 'fleet_manager']
const STAFF = ['admin', ...MANAGERS]

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: null, roles: STAFF },   // path comes from the auth store
  { icon: Map, label: 'Live Map', path: '/map', roles: [...STAFF, 'viewer'] },
  { icon: Globe, label: 'Geofence', path: '/geofence', roles: STAFF },
  { icon: Truck, label: 'Vehicles', path: '/vehicles', roles: STAFF },
  { icon: ShieldAlert, label: 'Fleet Risk', path: '/risk', roles: STAFF },
  { icon: BellRing, label: 'Custom Alerts', path: '/custom-alerts', roles: MANAGERS },
  { icon: FileBarChart, label: 'Reports', path: '/reports', roles: STAFF },
  { icon: UsersRound, label: 'Fleet Groups', path: '/fleet-groups', roles: ['admin'] },
]

const ROLE_LABELS = {
  admin: 'Admin',
  fleet_manager: 'Fleet manager',
  manager: 'Fleet manager',
  viewer: 'Viewer',
}

export default function Sidebar({ role = 'user', collapsed, onToggle }) {
  const navigate = useNavigate()
  const { user, role: storeRole } = useAuthStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const displayRole = storeRole ?? role
  const dashboardPath = useAuthStore.getState().getDashboardPath()

  const navItems = NAV_ITEMS
    .filter((item) => item.roles.includes(displayRole))
    .map((item) => ({ ...item, path: item.path ?? dashboardPath }))

  const name = user?.name ?? 'User Name'

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
      } min-h-screen bg-fleet-surface flex flex-col justify-between py-6 px-3 fixed left-0 top-0 transition-all duration-300 z-20`}
    >
      {/* Top Section */}
      <div>
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between mb-10 px-1">
          {!collapsed && (
            <div className="flex items-center gap-3 w-full justify-center">
               <img src={vaporlogo} alt="V.A.P.O.R" className="w-full h-14" />
            </div>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-fleet-surface hover:bg-fleet-blue/20 transition-colors ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-fleet-blue" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-fleet-blue" />
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
                `flex items-center gap-3 px-2 py-2.5 rounded-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-fleet-blue text-white'
                    : 'text-fleet-blue hover:text-fleet-blue hover:bg-fleet-blue/10'
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
          <div className="w-8 h-8 rounded-full bg-fleet-blue flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>

          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <p className="text-fleet-blue text-xs font-medium truncate">{name}</p>
              <span className="text-fleet-blue text-xs opacity-80 truncate">
                {ROLE_LABELS[displayRole] ?? displayRole}
              </span>
            </div>
          )}
        </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center rounded-sm bg-fleet-blue p-1.5 text-white/80 hover:text-white hover:bg-fleet-blue/90 disabled:opacity-80"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
      </div>
    </aside>
  )
}

Sidebar.propTypes = {
  onToggle: PropTypes.func.isRequired,
  collapsed: PropTypes.bool.isRequired,
  role: PropTypes.string,
}