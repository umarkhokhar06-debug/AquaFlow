import React, { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import Sidebar from '../components/Sidebar'
import Profile from '../components/Profile'
import UserManagement from '../components/UserManagement'
import OrderManagement from '../components/OrderManagement'
import DriverManagement from '../components/DriverManagement'
import NotificationSystem from '../components/NotificationSystem'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FiUsers, FiPackage, FiDollarSign, FiTruck, FiWifi, FiWifiOff } from 'react-icons/fi'

const AdminDashboard = () => {
  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const { socket, connected } = useSocket(token)
  
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalDrivers: 0,
    totalAdmins: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeDrivers: 0
  })
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState([])

  // Sample data for charts
  const revenueData = [
    { name: 'Jan', revenue: 12000, orders: 45 },
    { name: 'Feb', revenue: 15000, orders: 52 },
    { name: 'Mar', revenue: 18000, orders: 38 },
    { name: 'Apr', revenue: 22000, orders: 67 },
    { name: 'May', revenue: 25000, orders: 73 },
    { name: 'Jun', revenue: 28000, orders: 89 }
  ]

  const userTypeData = [
    { name: 'Customers', value: 1100, color: '#3B82F6' },
    { name: 'Drivers', value: 120, color: '#10B981' },
    { name: 'Admins', value: 27, color: '#F59E0B' }
  ]

  const driverPerformanceData = [
    { name: 'Driver A', deliveries: 45, rating: 4.8, earnings: 2400 },
    { name: 'Driver B', deliveries: 38, rating: 4.6, earnings: 2100 },
    { name: 'Driver C', deliveries: 52, rating: 4.9, earnings: 2800 },
    { name: 'Driver D', deliveries: 41, rating: 4.7, earnings: 2300 },
    { name: 'Driver E', deliveries: 36, rating: 4.5, earnings: 1900 }
  ]

  const orderStatusData = [
    { name: 'Completed', value: 3200, color: '#10B981' },
    { name: 'Pending', value: 89, color: '#F59E0B' },
    { name: 'Cancelled', value: 12, color: '#EF4444' }
  ]

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setStats({
          totalUsers: 1247,
          totalCustomers: 1100,
          totalDrivers: 120,
          totalAdmins: 27,
          totalOrders: 3456,
          pendingOrders: 89,
          completedOrders: 3200,
          totalRevenue: 125678,
          monthlyRevenue: 15678,
          activeDrivers: 95
        })
      } catch (error) {
        console.error('Error fetching admin data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [])

  // Socket event listeners for admin dashboard
  useEffect(() => {
    if (socket && connected && user?.userType === 'admin') {
      // Join admin room
      socket.emit('join-admin-room')

      // Listen for new orders
      socket.on('new-order', (data) => {
        console.log('New order received:', data)
        addNotification({
          id: Date.now(),
          message: `New order ${data.data.orderNumber} received from ${data.data.customer.name}`,
          type: 'info',
          timestamp: data.timestamp
        })
      })

      // Listen for order status updates
      socket.on('order-status-update', (data) => {
        console.log('Order status updated:', data)
        addNotification({
          id: Date.now(),
          message: `Order status updated to ${data.data.status}`,
          type: 'info',
          timestamp: data.data.timestamp
        })
      })

      // Listen for order assignments
      socket.on('order-assignment', (data) => {
        console.log('Order assigned to driver:', data)
        addNotification({
          id: Date.now(),
          message: `Order assigned to driver ${data.data.driverName}`,
          type: 'success',
          timestamp: data.data.timestamp
        })
      })

      // Listen for user updates
      socket.on('user-update', (data) => {
        console.log('User update received:', data)
        addNotification({
          id: Date.now(),
          message: `User ${data.data.user.name} ${data.data.updateType}`,
          type: 'info',
          timestamp: data.timestamp
        })
      })

      // Listen for driver status updates
      socket.on('driver-status-update', (data) => {
        console.log('Driver status updated:', data)
        addNotification({
          id: Date.now(),
          message: `Driver status updated to ${data.data.status}`,
          type: 'info',
          timestamp: data.data.timestamp
        })
      })

      // Listen for driver queue updates
      socket.on('driver-queue-update', (data) => {
        console.log('Driver queue updated:', data)
        addNotification({
          id: Date.now(),
          message: `Driver queue updated`,
          type: 'info',
          timestamp: data.data.timestamp
        })
      })

      // Listen for driver location updates
      socket.on('driver-location-update', (data) => {
        console.log('Driver location updated:', data)
        // Location updates are frequent, so we don't show notifications for them
      })

      // Listen for system notifications
      socket.on('system-notification', (data) => {
        console.log('System notification:', data)
        addNotification({
          id: Date.now(),
          message: data.data.message,
          type: data.data.notificationType,
          timestamp: data.data.timestamp
        })
      })

      return () => {
        socket.off('new-order')
        socket.off('order-status-update')
        socket.off('order-assignment')
        socket.off('user-update')
        socket.off('driver-status-update')
        socket.off('driver-queue-update')
        socket.off('driver-location-update')
        socket.off('system-notification')
      }
    }
  }, [socket, connected, user?.userType])

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 4)]) // Keep only last 5 notifications
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <FiUsers className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalUsers.toLocaleString()}</dd>
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
                  <FiPackage className="w-5 h-5 text-white" />
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
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <FiDollarSign className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                  <dd className="text-lg font-medium text-gray-900">${stats.totalRevenue.toLocaleString()}</dd>
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
                  <FiTruck className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Drivers</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeDrivers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue & Orders Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="orders" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
            </AreaChart>
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

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={orderStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {orderStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">User Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customers</span>
              <span className="text-sm font-medium text-gray-900">{stats.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Drivers</span>
              <span className="text-sm font-medium text-gray-900">{stats.totalDrivers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Admins</span>
              <span className="text-sm font-medium text-gray-900">{stats.totalAdmins}</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Order Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-medium text-green-600">{stats.completedOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-sm font-medium text-yellow-600">{stats.pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-sm font-medium text-gray-900">{stats.totalOrders}</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Revenue</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="text-sm font-medium text-green-600">${stats.monthlyRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total</span>
              <span className="text-sm font-medium text-gray-900">${stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg per Order</span>
              <span className="text-sm font-medium text-blue-600">${Math.round(stats.totalRevenue / stats.totalOrders)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'users':
        return <UserManagement />
      case 'orders':
        return <OrderManagement />
      case 'drivers':
        return <DriverManagement />
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
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {activeTab === 'overview' ? 'Admin Dashboard' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h1>
              <p className="mt-2 text-gray-600">
                {activeTab === 'overview' 
                  ? `Welcome back, ${user?.name}! Here's your system overview.`
                  : `Manage your ${activeTab} settings and information.`
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                {connected ? (
                  <div className="flex items-center text-green-600">
                    <FiWifi className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <FiWifiOff className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Disconnected</span>
                  </div>
                )}
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                Admin Access
              </span>
            </div>
          </div>
        </div>
        {renderContent()}
      </div>
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemoveNotification={removeNotification} 
      />
    </div>
  )
}

export default AdminDashboard