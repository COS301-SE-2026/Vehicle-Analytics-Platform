import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import VerifyEmail from './pages/auth/VerifyEmail'
import ViewerDashboard from './pages/dashboard/ViewerDashboard'
import ManagerDashboard from './pages/dashboard/ManagerDashboard'
import AdminDashboard from './pages/dashboard/AdminDashboard'
import LiveMap from './pages/map/LiveMap'

function ProtectedRoute({ children, allowedRoles }) {
  // TODO: re-enable when auth is merged
  return children
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
              <ProtectedRoute allowedRoles={['manager']}>
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
              <ProtectedRoute allowedRoles={['viewer', 'manager', 'admin']}>
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