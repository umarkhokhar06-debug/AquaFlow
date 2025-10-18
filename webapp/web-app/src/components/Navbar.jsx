import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from './Button'

const Navbar = () => {
  const { isAuthenticated, user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Tanker Web App
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                to="/"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Home
              </Link>
              {isAuthenticated && (
                <>
                  {isAdmin ? (
                    <Link
                      to="/admin-dashboard"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Admin Dashboard
                    </Link>
                  ) : (
                    <Link
                      to="/dashboard"
                      className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Dashboard
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Welcome, {user?.name || user?.email}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    isAdmin 
                      ? 'bg-red-100 text-red-800' 
                      : user?.userType === 'driver'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user?.userType?.charAt(0).toUpperCase() + user?.userType?.slice(1)}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/register">
                  <Button variant="outline" size="small">
                    Register
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="primary" size="small">
                    Login
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
