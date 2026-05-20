import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import PropTypes from 'prop-types'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import VerifyEmail from './pages/auth/VerifyEmail'
import ViewerDashboard from './pages/dashboard/ViewerDashboard'
import ManagerDashboard from './pages/dashboard/ManagerDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import LiveMap from './pages/map/LiveMap'
import useAuthStore from './store/authStore'



// function ProtectedRoute({ children, allowedRoles }) {
//   // Enforce simple auth + role-based access using the local auth store.
//   const { user, role } = useAuthStore()

//   // Not authenticated -> send to login
//   if (!user) return <Navigate to="/login" replace />

//   // If allowedRoles provided, verify role membership
//   if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
//     // Redirect user to their appropriate dashboard
//     const redirect = useAuthStore.getState().getDashboardPath()
//     return <Navigate to={redirect} replace />
//   }

//   return children
// }

function ProtectedRoute({ children }) {
  // TEMPORARY: bypass auth for frontend dashboard development
  return children
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
  allowedRoles: PropTypes.arrayOf(PropTypes.string)
}

ProtectedRoute.defaultProps = {
  allowedRoles: []
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes - no sidebar */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyEmail />} />

        {/* All protected routes wrapped in AppShell */}
        <Route element={<AppShell role="viewer" />}>
          <Route
            path="/dashboard/viewer"
            element={
              <ProtectedRoute allowedRoles={['viewer']}>
                <ViewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/manager"
            element={
              <ProtectedRoute allowedRoles={['fleet_manager']}>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute allowedRoles={['viewer', 'fleet_manager', 'admin']}>
                <LiveMap />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Default redirect - TEMP for testing */}
        <Route path="/" element={<Navigate to="/dashboard/viewer" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
