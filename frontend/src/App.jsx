import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import PropTypes from 'prop-types'
import Landing from './pages/landing/Landing'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import VerifyEmail from './pages/auth/VerifyEmail'
import ViewerDashboard from './pages/dashboard/ViewerDashboard'
import ManagerDashboard from './pages/dashboard/ManagerDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import LiveMap from './pages/map/LiveMap'
import Geofence from './pages/geofence/Geofence'
import useAuthStore from './store/authStore'
import BrandStyleGuide from './pages/styleguide/BrandStyleGuide'
import VehiclesList from './pages/vehicles/VehiclesList'
import VehicleProfile from './pages/vehicles/VehicleProfile'
import CustomAlerts from './pages/alerts/CustomAlerts'
import CustomAlertDetail from './pages/alerts/CustomAlertDetail';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role } = useAuthStore()

  if (!user) return <Navigate to="/login" replace />

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const redirect = useAuthStore.getState().getDashboardPath()
    return <Navigate to={redirect} replace />
  }

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
  const { role } = useAuthStore()
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes - no sidebar */}
        <Route path="/landing" element={<Landing />} />
        <Route path="/login"  element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify" element={<VerifyEmail />} />
        <Route path="/style-guide" element={<BrandStyleGuide />} />

        {/* All protected routes wrapped in AppShell */}
        <Route element={<AppShell role={role} />}>
          <Route
            path="/dashboard/manager"
            element={
              <ProtectedRoute allowedRoles={['manager', 'fleet_manager']}>
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
            path="/dashboard/viewer"
            element={
              <ProtectedRoute allowedRoles={['viewer']}>
                <ViewerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute allowedRoles={['viewer', 'manager', 'fleet_manager']}>
                <LiveMap />
              </ProtectedRoute>
            }
          />
          <Route
          path="/vehicles"
          element={
              <ProtectedRoute allowedRoles={['manager', 'fleet_manager', 'admin']}>
                <VehiclesList />
              </ProtectedRoute>
          }
          />

          <Route
          path="/vehicles/:id"
          element={
              <ProtectedRoute allowedRoles={['manager', 'fleet_manager', 'admin']}>
                <VehicleProfile />
              </ProtectedRoute>
          }
          />

           <Route
          path="/geofence"
          element={
              <ProtectedRoute allowedRoles={['manager', 'fleet_manager', 'admin']}>
                <Geofence />
              </ProtectedRoute>
          }
          />

          <Route
            path="/custom-alerts"
            element={
            <ProtectedRoute allowedRoles={['manager', 'fleet_manager']}>
              <CustomAlerts />
            </ProtectedRoute>
            }
          />

        <Route
          path="/custom-alerts/:id"
          element={
            <ProtectedRoute allowedRoles={['manager', 'fleet_manager']}>
              <CustomAlertDetail />
            </ProtectedRoute>
          }
        />

        </Route>

        {/* Default redirect - TEMP for testing */}
        <Route path="/landing" element={<Landing />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App