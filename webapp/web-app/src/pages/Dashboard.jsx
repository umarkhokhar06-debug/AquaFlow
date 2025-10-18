import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar'
import Profile from '../components/Profile'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { FiFileText, FiCheckCircle, FiClock, FiDollarSign } from 'react-icons/fi'

const Dashboard = () => {
  const { user, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  // Sample data for charts
  const orderData = [
    { name: 'Jan', orders: 45, revenue: 2400 },
    { name: 'Feb', orders: 52, revenue: 3200 },
    { name: 'Mar', orders: 38, revenue: 2800 },
    { name: 'Apr', orders: 67, revenue: 4100 },
    { name: 'May', orders: 73, revenue: 4800 },
    { name: 'Jun', orders: 89, revenue: 5600 }
  ]

  const userTypeData = [
    { name: 'Customers', value: 1100, color: '#3B82F6' },
    { name: 'Drivers', value: 120, color: '#10B981' },
    { name: 'Admins', value: 27, color: '#F59E0B' }
  ]

  const driverPerformanceData = [
    { name: 'Driver A', deliveries: 45, rating: 4.8 },
    { name: 'Driver B', deliveries: 38, rating: 4.6 },
    { name: 'Driver C', deliveries: 52, rating: 4.9 },
    { name: 'Driver D', deliveries: 41, rating: 4.7 },
    { name: 'Driver E', deliveries: 36, rating: 4.5 }
  ]

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setStats({
          totalOrders: 3456,
          completedOrders: 3200,
          pendingOrders: 89,
          totalRevenue: 125678
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <FiFileText className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Orders</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalOrders.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <FiCheckCircle className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.completedOrders.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <FiClock className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.pendingOrders}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <FiDollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">${stats.totalRevenue.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Orders & Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={2} />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={driverPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="deliveries" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'profile':
        return <Profile />
      default:
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon
            </h3>
            <p className="text-gray-600">This section is under development.</p>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {activeTab === 'overview' ? 'Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h1>
          <p className="mt-2 text-gray-600">
            {activeTab === 'overview' 
              ? `Welcome back, ${user?.name}! Here's your overview.`
              : `Manage your ${activeTab} settings and information.`
            }
          </p>
        </div>
        {renderContent()}
      </div>
    </div>
  )
}

export default Dashboard
