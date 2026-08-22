import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import RoleLogin from './pages/RoleLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

// Any authenticated user
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Admin + super_admin + operational staff (dispatcher/call_center_agent/technician)
// share the same sidebar dashboard shell, gated per-tab inside it. Drivers
// have no web portal at all -- mobile app only.
const PortalRoute = ({ children }) => {
  const { isAuthenticated, isPortalUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isPortalUser) return <Navigate to="/" replace />;
  return children;
};

// Redirect an already-logged-in user away from login/register to wherever
// their role actually lands.
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isPortalUser } = useAuth();
  if (!isAuthenticated) return children;
  if (isPortalUser) return <Navigate to="/admin-dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

function AppRouter() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/login/:portal"
          element={
            <PublicRoute>
              <RoleLogin />
            </PublicRoute>
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <PortalRoute>
              <AdminDashboard />
            </PortalRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default AppRouter;
