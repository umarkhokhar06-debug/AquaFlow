import React from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  FiBarChart2,
  FiUsers,
  FiPackage,
  FiTruck,
  FiCpu,
  FiTrendingUp,
  FiSettings,
  FiUser,
  FiHome,
  FiSliders,
  FiExternalLink,
  FiTag,
  FiDollarSign,
  FiMap,
  FiHeadphones
} from 'react-icons/fi'

const ADMIN_TABS = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'users', label: 'Users & Employees', icon: FiUsers },
  { id: 'orders', label: 'Orders', icon: FiPackage },
  { id: 'drivers', label: 'Drivers', icon: FiTruck },
  { id: 'fleet', label: 'Fleet & Trucks', icon: FiTruck },
  { id: 'dispatch', label: 'Dispatch', icon: FiMap },
  { id: 'devices', label: 'Devices', icon: FiCpu },
  { id: 'promo', label: 'Promo Codes', icon: FiTag },
  { id: 'finance', label: 'Finance', icon: FiDollarSign },
  { id: 'forecast', label: 'Forecast & Reports', icon: FiTrendingUp },
  { id: 'support', label: 'Support / Complaints', icon: FiHeadphones },
  { id: 'device-simulator', label: 'Device Simulator', icon: FiSliders, external: true },
  { id: 'settings', label: 'Settings', icon: FiSettings },
  { id: 'profile', label: 'Profile', icon: FiUser }
]

const DISPATCHER_TABS = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'orders', label: 'Orders', icon: FiPackage },
  { id: 'drivers', label: 'Drivers', icon: FiTruck },
  { id: 'dispatch', label: 'Dispatch', icon: FiMap },
  { id: 'forecast', label: 'Forecast & Reports', icon: FiTrendingUp },
  { id: 'profile', label: 'Profile', icon: FiUser }
]

const CALL_CENTER_TABS = [
  { id: 'support', label: 'Support / Complaints', icon: FiHeadphones },
  { id: 'profile', label: 'Profile', icon: FiUser }
]

const TECHNICIAN_TABS = [
  { id: 'support', label: 'My Tickets', icon: FiHeadphones },
  { id: 'profile', label: 'Profile', icon: FiUser }
]

const CUSTOMER_TABS = [
  { id: 'overview', label: 'Overview', icon: FiHome },
  { id: 'orders', label: 'My Orders', icon: FiPackage },
  { id: 'profile', label: 'Profile', icon: FiUser }
]

const TABS_BY_ROLE = {
  admin: ADMIN_TABS,
  super_admin: ADMIN_TABS,
  dispatcher: DISPATCHER_TABS,
  call_center_agent: CALL_CENTER_TABS,
  technician: TECHNICIAN_TABS
}

const Sidebar = ({ activeTab, setActiveTab }) => {
  const { user, isPortalUser } = useAuth()

  const tabs = TABS_BY_ROLE[user?.userType] || CUSTOMER_TABS

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold">Aqua Flow</h2>
        <p className="text-gray-400 text-sm mt-1 capitalize">
          {isPortalUser ? user?.userType?.replace(/_/g, ' ') + ' Portal' : 'Dashboard'}
        </p>
      </div>

      <nav className="mt-6">
        <div className="px-3 space-y-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon
            const openSimulator = () => {
              const backendUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:4000'
              window.open(`${backendUrl}/simulator/`, '_blank', 'noopener,noreferrer')
            }
            return (
              <button
                key={tab.id}
                onClick={tab.external ? openSimulator : () => setActiveTab(tab.id)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <IconComponent className="mr-3 h-5 w-5" />
                {tab.label}
                {tab.external && <FiExternalLink className="ml-auto h-3.5 w-3.5 opacity-60" />}
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
            <p className="text-xs text-gray-400 capitalize">{user?.userType?.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
