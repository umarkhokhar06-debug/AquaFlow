import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  FiBarChart2, 
  FiUsers, 
  FiPackage, 
  FiTruck, 
  FiTrendingUp, 
  FiFileText, 
  FiSettings, 
  FiUser,
  FiHome
} from 'react-icons/fi'

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin } = useAuth()

  const tabs = isAdmin ? [
    { id: 'overview', label: 'Overview', icon: FiBarChart2 },
    { id: 'users', label: 'Users', icon: FiUsers },
    { id: 'orders', label: 'Orders', icon: FiPackage },
    { id: 'drivers', label: 'Drivers', icon: FiTruck },
    { id: 'analytics', label: 'Analytics', icon: FiTrendingUp },
    { id: 'reports', label: 'Reports', icon: FiFileText },
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'profile', label: 'Profile', icon: FiUser }
  ] : [
    { id: 'overview', label: 'Overview', icon: FiHome },
    { id: 'orders', label: 'My Orders', icon: FiPackage },
    { id: 'profile', label: 'Profile', icon: FiUser }
  ]

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold">Tanker App</h2>
        <p className="text-gray-400 text-sm mt-1">
          {isAdmin ? 'Admin Dashboard' : 'User Dashboard'}
        </p>
      </div>
      
      <nav className="mt-6">
        <div className="px-3 space-y-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <IconComponent className="mr-3 h-5 w-5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      {/* User Info */}
      <div className="absolute bottom-0 w-64 p-4 bg-gray-800">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.userType}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
