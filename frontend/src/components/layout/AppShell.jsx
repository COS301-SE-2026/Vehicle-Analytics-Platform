import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import PropTypes from 'prop-types'
import Sidebar from './Sidebar'
import Header from './Header'

const pageTitles = {
  '/dashboard/viewer':  'Dashboard',
  '/dashboard/manager': 'Dashboard',
  '/dashboard/admin':   'Admin Dashboard',
  '/map':               'Live Map',
}

const noHeader = new Set(['/login', '/register'])

export default function AppShell({ role = 'viewer' }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'FleetTracker'
  const hideHeader = noHeader.has(location.pathname)

  return (
    <div className="min-h-screen bg-fleet-bg">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed(prev => !prev)}
      />

      <div className={`${collapsed ? 'ml-[64px]' : 'ml-[220px]'} transition-all duration-300`}>
        {!hideHeader && <Header title={title} collapsed={collapsed} />}
        <main className={`${hideHeader ? 'pt-0 p-0' : 'pt-[60px] p-6'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

AppShell.propTypes = {
  role: PropTypes.string,
}