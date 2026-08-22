import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FiShield, FiUsers, FiDroplet } from 'react-icons/fi'

const PORTALS = [
  { key: 'admin', title: 'Admin', desc: 'Super Admin & Admin -- operations, fleet, finance & reports', icon: FiShield, color: 'bg-blue-600 hover:bg-blue-700' },
  { key: 'employee', title: 'Employee', desc: 'Dispatcher, call center & technician', icon: FiUsers, color: 'bg-purple-600 hover:bg-purple-700' }
]

const Home = () => {
  const { isAuthenticated, isPortalUser } = useAuth()

  const dashboardPath = isPortalUser ? '/admin-dashboard' : '/dashboard'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <FiDroplet className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">AabRahat</h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg">
            Water tanker delivery, dispatch & operations platform
          </p>
        </div>

        {isAuthenticated ? (
          <div className="mt-10 text-center">
            <Link to={dashboardPath} className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-12">
            <h2 className="text-center text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">Sign in as</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {PORTALS.map(p => {
                const Icon = p.icon
                return (
                  <Link
                    key={p.key}
                    to={`/login/${p.key}`}
                    className="bg-white rounded-lg shadow p-6 text-center hover:shadow-md transition-shadow"
                  >
                    <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-white mb-3 ${p.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-medium text-gray-900">{p.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </Link>
                )
              })}
            </div>
            <p className="mt-8 text-center text-sm text-gray-500">
              Drivers: use the AabRahat mobile app to log in.<br />
              New customer? <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium">Register here</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home
