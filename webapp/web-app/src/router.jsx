import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Only Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Public Route Component (redirect to appropriate dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) {
    return children;
  }
  // Redirect to appropriate dashboard based on user type
  return <Navigate to={isAdmin ? "/admin-dashboard" : "/dashboard"} replace />;
};

function AppRouter() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
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
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default AppRouter;
