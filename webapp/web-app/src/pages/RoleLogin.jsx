import React, { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { FiShield, FiUsers } from 'react-icons/fi'

// Drivers have no web login at all -- mobile app only. Super admin and
// admin share one login link (both land in the same portal, sidebar tabs
// are gated by role inside it); operational staff (dispatcher, call center
// agent, technician) use a separate link.
const PORTALS = {
  admin: {
    title: 'Admin',
    subtitle: 'Super Admin & Admin -- operations, fleet, finance & reports',
    allowedRoles: ['admin', 'super_admin'],
    redirectTo: '/admin-dashboard',
    icon: FiShield,
    accent: 'blue'
  },
  employee: {
    title: 'Employee',
    subtitle: 'Dispatcher, call center & technician access',
    allowedRoles: ['dispatcher', 'call_center_agent', 'technician'],
    redirectTo: '/admin-dashboard',
    icon: FiUsers,
    accent: 'purple'
  }
}

const ACCENT_CLASSES = {
  blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
  purple: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
}

const RoleLogin = () => {
  const { portal } = useParams()
  const config = PORTALS[portal] || PORTALS.admin
  const Icon = config.icon

  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.password) {
      setErrors({ general: 'Email and password are required' })
      return
    }
    setIsLoading(true)
    try {
      const result = await login(formData.email, formData.password, config.allowedRoles)
      if (result.success) {
        navigate(config.redirectTo)
      } else {
        setErrors({ general: result.error || 'Login failed' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center ${ACCENT_CLASSES[config.accent]}`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">{config.title} Login</h2>
        <p className="mt-2 text-sm text-gray-600">{config.subtitle}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.general}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
              <input
                id="email" name="email" type="email" autoComplete="email"
                value={formData.email} onChange={handleChange}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="you@aquaflowapp.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password" name="password" type="password" autoComplete="current-password"
                value={formData.password} onChange={handleChange}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-base text-white ${ACCENT_CLASSES[config.accent]}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : `Sign in as ${config.title}`}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-500 mb-2">Not the right portal?</p>
            <div className="flex justify-center flex-wrap gap-2">
              {Object.keys(PORTALS).filter(p => p !== portal).map(p => (
                <Link key={p} to={`/login/${p}`} className="text-blue-600 hover:text-blue-500 text-xs font-medium">
                  {PORTALS[p].title} login
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoleLogin
