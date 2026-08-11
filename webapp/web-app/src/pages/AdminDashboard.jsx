import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import Sidebar from '../components/Sidebar'
import Profile from '../components/Profile'
import UserManagement from '../components/UserManagement'
import OrderManagement from '../components/OrderManagement'
import DriverManagement from '../components/DriverManagement'
import DeviceManagement from '../components/DeviceManagement'
import FleetManagement from '../components/FleetManagement'
import DispatchConsole from '../components/DispatchConsole'
import PromoCodes from '../components/PromoCodes'
import Finance from '../components/Finance'
import ForecastReports from '../components/ForecastReports'
import SupportTickets from '../components/SupportTickets'
import NotificationSystem from '../components/NotificationSystem'
import { userManagementAPI, orderManagementAPI, dispatchAPI, forecastAPI, financeAPI } from '../services/api'
import { FiUsers, FiPackage, FiDollarSign, FiTruck, FiWifi, FiWifiOff, FiAlertTriangle, FiMapPin } from 'react-icons/fi'

const DEFAULT_TAB_BY_ROLE = {
  call_center_agent: 'support',
  technician: 'support'
}

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth()
  const token = localStorage.getItem('token')
  const { socket, connected } = useSocket(token)

  const [activeTab, setActiveTab] = useState(DEFAULT_TAB_BY_ROLE[user?.userType] || 'overview')
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState([])

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // userStats/orderStats/finance are admin-only server-side (403 for
      // dispatcher) -- fetched separately with allSettled so a dispatcher
      // viewing their (smaller) overview never has the whole page fail
      // just because one admin-only call was rejected.
      const [queueRes, mapRes, forecastRes] = await Promise.all([
        dispatchAPI.getQueue(),
        dispatchAPI.getLiveMap(),
        forecastAPI.getFleetForecast()
      ])

      let userStats = null
      let orderStats = null
      let finance = null
      if (isAdmin) {
        const [userStatsRes, orderStatsRes, financeRes] = await Promise.allSettled([
          userManagementAPI.getUserStatistics(),
          orderManagementAPI.getOrderStatistics(),
          financeAPI.getDashboard()
        ])
        if (userStatsRes.status === 'fulfilled') userStats = userStatsRes.value.data.statistics
        if (orderStatsRes.status === 'fulfilled') orderStats = orderStatsRes.value.data.statistics
        if (financeRes.status === 'fulfilled') finance = financeRes.value.data
      }

      const queue = queueRes.data.queue || {}
      const pendingOrders = [...(queue.new || []), ...(queue.exception || []), ...(queue.scheduled || []), ...(queue.delayed || [])]

      setOverview({
        userStats,
        orderStats,
        pendingOrders,
        drivers: mapRes.data.drivers || [],
        forecast: forecastRes.data.forecast,
        finance
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard overview')
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview()
  }, [activeTab, fetchOverview])

  // Socket event listeners for admin dashboard
  useEffect(() => {
    if (socket && connected && (user?.userType === 'admin' || user?.userType === 'super_admin')) {
      socket.emit('join-admin-room')

      socket.on('new-order', (data) => {
        addNotification({ id: Date.now(), message: `New order ${data.data.orderNumber} received from ${data.data.customer.name}`, type: 'info', timestamp: data.timestamp })
      })
      socket.on('order-status-update', (data) => {
        addNotification({ id: Date.now(), message: `Order status updated to ${data.data.status}`, type: 'info', timestamp: data.data.timestamp })
      })
      socket.on('order-assignment', (data) => {
        addNotification({ id: Date.now(), message: `Order assigned to driver ${data.data.driverName}`, type: 'success', timestamp: data.data.timestamp })
      })
      socket.on('user-update', (data) => {
        addNotification({ id: Date.now(), message: `User ${data.data.user.name} ${data.data.updateType}`, type: 'info', timestamp: data.timestamp })
      })
      socket.on('driver-status-update', (data) => {
        addNotification({ id: Date.now(), message: `Driver status updated to ${data.data.status}`, type: 'info', timestamp: data.data.timestamp })
      })
      socket.on('driver-queue-update', (data) => {
        addNotification({ id: Date.now(), message: `Driver queue updated`, type: 'info', timestamp: data.data.timestamp })
      })
      socket.on('driver-location-update', () => {})
      socket.on('system-notification', (data) => {
        addNotification({ id: Date.now(), message: data.data.message, type: data.data.notificationType, timestamp: data.data.timestamp })
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
    setNotifications(prev => [notification, ...prev.slice(0, 4)])
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }
    if (error) {
      return <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>
    }
    if (!overview) return null

    const { userStats, orderStats, pendingOrders, drivers, forecast, finance } = overview
    const trucksEnRoute = drivers.filter(d => d.driverStatus === 'busy')
    const statusCount = (status) => orderStats?.statusBreakdown?.find(s => s._id === status)?.count || 0

    return (
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {userStats && (
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center flex-shrink-0"><FiUsers className="w-5 h-5 text-white" /></div>
                <div className="ml-5"><dt className="text-sm font-medium text-gray-500">Total Users</dt><dd className="text-lg font-medium text-gray-900">{userStats.totalUsers?.toLocaleString() || 0}</dd></div>
              </div>
            </div>
          )}
          {orderStats && (
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center flex-shrink-0"><FiPackage className="w-5 h-5 text-white" /></div>
                <div className="ml-5"><dt className="text-sm font-medium text-gray-500">Total Orders</dt><dd className="text-lg font-medium text-gray-900">{orderStats.totalOrders?.toLocaleString() || 0}</dd></div>
              </div>
            </div>
          )}
          {finance && (
            <div className="bg-white overflow-hidden shadow rounded-lg p-5">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center flex-shrink-0"><FiDollarSign className="w-5 h-5 text-white" /></div>
                <div className="ml-5"><dt className="text-sm font-medium text-gray-500">Gross Revenue</dt><dd className="text-lg font-medium text-gray-900">Rs {finance.revenue?.grossRevenue?.toLocaleString() || 0}</dd></div>
              </div>
            </div>
          )}
          <div className="bg-white overflow-hidden shadow rounded-lg p-5">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center flex-shrink-0"><FiTruck className="w-5 h-5 text-white" /></div>
              <div className="ml-5"><dt className="text-sm font-medium text-gray-500">Trucks En Route</dt><dd className="text-lg font-medium text-gray-900">{trucksEnRoute.length}</dd></div>
            </div>
          </div>
        </div>

        {/* Tomorrow's forecast */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tomorrow's Forecast</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><p className="text-sm text-gray-500">Expected Orders</p><p className="text-xl font-medium text-gray-900">{forecast?.expectedOrders ?? '-'}</p></div>
            <div><p className="text-sm text-gray-500">Expected Revenue</p><p className="text-xl font-medium text-gray-900">Rs {forecast?.expectedRevenue?.toLocaleString() ?? '-'}</p></div>
            <div><p className="text-sm text-gray-500">Driver Capacity</p><p className={`text-xl font-medium ${forecast?.driverShortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>{forecast?.availableDrivers ?? '-'} / {forecast?.requiredDrivers ?? '-'}</p></div>
            <div><p className="text-sm text-gray-500">Likely to order tomorrow</p><p className="text-xl font-medium text-gray-900">{forecast?.devicesDueForReorder?.length ?? 0}</p></div>
          </div>
          {forecast?.driverShortfall > 0 && (
            <div className="mt-3 flex items-center text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
              <FiAlertTriangle className="mr-2 flex-shrink-0" /> Short by {forecast.driverShortfall} driver(s) for tomorrow's expected demand.
            </div>
          )}
        </div>

        {/* Pending order queue detail */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <h3 className="px-6 py-4 border-b text-lg font-medium text-gray-900">Pending Order Queue ({pendingOrders.length})</h3>
          {pendingOrders.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-500">Queue is empty.</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingOrders.slice(0, 10).map(o => (
                  <tr key={o._id}>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{o.orderNumber}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {o.customer?.fullName || o.customer?.name}
                      <div className="text-xs text-gray-400 flex items-center"><FiMapPin className="mr-1" />{o.deliveryAddress?.address}</div>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">Rs {o.totalAmount}</td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {o.paymentMethod} / {o.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Order status + user breakdown (admin only -- underlying stats are admin-only server-side) */}
        {(orderStats || userStats) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {orderStats && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Order Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-600">Delivered</span><span className="text-sm font-medium text-green-600">{statusCount('delivered')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-600">Pending</span><span className="text-sm font-medium text-yellow-600">{statusCount('pending')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-600">Cancelled</span><span className="text-sm font-medium text-red-600">{statusCount('cancelled')}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-600">Total</span><span className="text-sm font-medium text-gray-900">{orderStats?.totalOrders || 0}</span></div>
            </div>
          </div>
          )}
          {userStats && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">User Breakdown</h3>
            <div className="space-y-3">
              {(userStats?.userTypeBreakdown || []).map(u => (
                <div key={u._id} className="flex justify-between">
                  <span className="text-sm text-gray-600 capitalize">{u._id?.replace(/_/g, ' ')}</span>
                  <span className="text-sm font-medium text-gray-900">{u.count}</span>
                </div>
              ))}
            </div>
          </div>
          )}
        </div>
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'users': return <UserManagement />
      case 'orders': return <OrderManagement />
      case 'drivers': return <DriverManagement />
      case 'devices': return <DeviceManagement />
      case 'fleet': return <FleetManagement />
      case 'dispatch': return <DispatchConsole />
      case 'promo': return <PromoCodes />
      case 'finance': return <Finance />
      case 'forecast': return <ForecastReports />
      case 'support': return <SupportTickets />
      case 'profile': return <Profile />
      default:
        return (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Coming Soon</h3>
            <p className="text-gray-600">This section is under development.</p>
          </div>
        )
    }
  }

  const tabLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace(/-/g, ' ')

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 p-8">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{activeTab === 'overview' ? 'Dashboard' : tabLabel}</h1>
              <p className="mt-2 text-gray-600">
                {activeTab === 'overview' ? `Welcome back, ${user?.name}! Here's your system overview.` : `Manage ${tabLabel.toLowerCase()}.`}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {connected ? (
                <div className="flex items-center text-green-600"><FiWifi className="w-4 h-4 mr-1" /><span className="text-sm font-medium">Connected</span></div>
              ) : (
                <div className="flex items-center text-red-600"><FiWifiOff className="w-4 h-4 mr-1" /><span className="text-sm font-medium">Disconnected</span></div>
              )}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 capitalize">
                {user?.userType?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </div>
        {renderContent()}
      </div>

      <NotificationSystem notifications={notifications} onRemoveNotification={removeNotification} />
    </div>
  )
}

export default AdminDashboard
