import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useLocation } from 'react-router-dom'

const pageTitles = {
  '/dashboard/viewer': 'Dashboard',
  '/dashboard/manager': 'Dashboard',
  '/dashboard/admin': 'Admin Dashboard',
  '/map': 'Live Map',
  '/settings': 'Settings',
}

export default function AppShell({ role = 'viewer' }) {
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'FleetTracker'

  return (
    <div className="min-h-screen bg-fleet-bg">
      {/* Sidebar */}
      <Sidebar role={role} />

      {/* Main Content */}
      <div className="ml-[220px]">
        {/* Header */}
        <Header title={title} />

        {/* Page Content */}
        <main className="pt-[60px] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}