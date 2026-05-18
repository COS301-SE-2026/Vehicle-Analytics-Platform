import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Map, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import PropTypes from 'prop-types'

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard/viewer' },
    { icon: Map, label: 'Live Map', path: '/map' },
]

export default function Sidebar({ role, collapsed, onToggle }) {
    return (
        <aside className={`${collapsed ? 'w-[64px]' : 'w-[220px]'} min-h-screen bg-fleet-green flex flex-col justify-between py-6 px-3 fixed left-0 top-0 transition-all duration-300 z-20`}>
            {/* Top Section */}
            <div>
                {/* logo and toggle  */}
                <div className="flex items-center justify-between mb-10 px-1">
                    {!collapsed && (
                        <div className="flex items-center gap-3">
                            <Truck className="w-5 h-5 text-white" />
                            <span className="text-white font-bold text-lg">FleetTracker</span>
                        </div>
                    )}

                    {/* Toggle Button */}
                    <button
                        onClick={onToggle}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors ml-auto"
                    >
                        {collapsed
                            ? <ChevronRight className="w-4 h-4 text-white" />
                            : <ChevronLeft className="w-4 h-4 text-white" />
                        }
                    </button>
                </div>

                {/* NAV ITEMS */}
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

            {/* USER PROFILE */}
            <div className={`flex items-center gap-3 px-1 ${collapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">ZN</span>
                </div>
                {!collapsed && (
                    <div>
                        <p className="text-white text-xs font-medium">User Name</p>
                        <span className="text-white text-xs capitalize">{role}</span>
                    </div>
                )}
            </div>
        </aside>
    )
}

Sidebar.propTypes = {
  onToggle: PropTypes.func,
  role:      PropTypes.string,
  collapsed: PropTypes.bool,
  onToggle:  PropTypes.func,
}