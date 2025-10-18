import React, { useState, useEffect, useCallback } from 'react'
import { orderManagementAPI, userManagementAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../hooks/useAuth'
import RealtimeIndicator from './RealtimeIndicator'
import { 
  FiSearch, 
  FiEye, 
  FiEdit2, 
  FiTruck, 
  FiX, 
  FiRefreshCw,
  FiPackage,
  FiDollarSign,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiUser
} from 'react-icons/fi'

const OrderManagement = () => {
  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const { socket, connected } = useSocket(token)
  
  const [orders, setOrders] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    driver: '',
    page: 1,
    limit: 10
  })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')

  const statusOptions = [
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'confirmed', label: 'Confirmed', color: 'blue' },
    { value: 'preparing', label: 'Preparing', color: 'purple' },
    { value: 'out_for_delivery', label: 'Out for Delivery', color: 'orange' },
    { value: 'delivered', label: 'Delivered', color: 'green' },
    { value: 'cancelled', label: 'Cancelled', color: 'red' }
  ]

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await orderManagementAPI.getAllOrders(filters)
      setOrders(response.data.orders || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch orders')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await orderManagementAPI.getOrderStatistics()
      setStatistics(response.data.statistics)
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }, [])

  const fetchDrivers = useCallback(async () => {
    try {
      const response = await userManagementAPI.getUsers({ userType: 'driver', status: 'active' })
      setDrivers(response.data.users || [])
    } catch (err) {
      console.error('Error fetching drivers:', err)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
    fetchStatistics()
    fetchDrivers()
  }, [fetchOrders, fetchStatistics, fetchDrivers])

  // Socket event listeners
  useEffect(() => {
    if (socket && connected && (user?.userType === 'admin' || user?.userType === 'driver')) {
      // Join admin room for order updates
      socket.emit('join-admin-room')
      
      // Join driver room if user is driver
      if (user?.userType === 'driver') {
        socket.emit('join-driver-room')
      }

      // Listen for new orders (admin only)
      socket.on('new-order', (data) => {
        console.log('New order received:', data)
        setOrders(prev => [data.data, ...prev])
        // Refresh statistics
        fetchStatistics()
      })

      // Listen for order status updates
      socket.on('order-status-update', (data) => {
        console.log('Order status updated:', data)
        setOrders(prev => prev.map(order => 
          order.id === data.data.orderId 
            ? { ...order, status: data.data.status, updatedAt: data.data.timestamp }
            : order
        ))
        // Refresh statistics
        fetchStatistics()
      })

      // Listen for order assignments
      socket.on('order-assignment', (data) => {
        console.log('Order assigned to driver:', data)
        setOrders(prev => prev.map(order => 
          order.id === data.data.orderId 
            ? { 
                ...order, 
                driver: { 
                  id: data.data.driverId, 
                  name: data.data.driverName 
                },
                updatedAt: data.data.timestamp
              }
            : order
        ))
      })

      // Listen for system notifications
      socket.on('system-notification', (data) => {
        console.log('System notification:', data)
        // You can add a notification system here if needed
      })

      return () => {
        socket.off('new-order')
        socket.off('order-status-update')
        socket.off('order-assignment')
        socket.off('system-notification')
      }
    }
  }, [socket, connected, user?.userType, fetchStatistics])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchOrders()
  }

  const handleOrderAction = async (action, orderId, additionalData = {}) => {
    try {
      setActionLoading(true)
      let response

      switch (action) {
        case 'updateStatus':
          response = await orderManagementAPI.updateOrderStatus(orderId, newStatus)
          break
        case 'assignDriver':
            response = await orderManagementAPI.assignDriver(orderId, selectedDriverId)
            // Change status to confirmed when assigning driver
            await orderManagementAPI.updateOrderStatus(orderId, 'confirmed')
            break
        case 'cancel':
          response = await orderManagementAPI.cancelOrder(orderId)
          break
        default:
          throw new Error('Invalid action')
      }

      if (response.data.success) {
        await fetchOrders()
        await fetchStatistics()
        setShowOrderModal(false)
        setShowStatusModal(false)
        setShowAssignModal(false)
        setShowCancelModal(false)
        setSelectedOrder(null)
        setNewStatus('')
        setSelectedDriverId('')
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} order`)
      console.error(`Error ${action}ing order:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  const openOrderModal = (order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  const openStatusModal = (order) => {
    setSelectedOrder(order)
    setNewStatus(order.status)
    setShowStatusModal(true)
  }

  const openAssignModal = (order) => {
    setSelectedOrder(order)
    setSelectedDriverId(order.driver?.id || '')
    setShowAssignModal(true)
  }

  const openCancelModal = (order) => {
    setSelectedOrder(order)
    setShowCancelModal(true)
  }

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status) || { label: status, color: 'gray' }
    const colorClasses = {
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusConfig.color]}`}>
        {statusConfig.label}
      </span>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FiClock className="w-4 h-4" />
      case 'confirmed':
        return <FiCheckCircle className="w-4 h-4" />
      case 'preparing':
        return <FiPackage className="w-4 h-4" />
      case 'out_for_delivery':
        return <FiTruck className="w-4 h-4" />
      case 'delivered':
        return <FiCheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <FiX className="w-4 h-4" />
      default:
        return <FiAlertCircle className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderStatistics = () => {
    if (!statistics) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiPackage className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalOrders}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiDollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FiClock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.statusBreakdown?.find(s => s._id === 'pending')?.count || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Delivered Orders</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.statusBreakdown?.find(s => s._id === 'delivered')?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderOrderModal = () => {
    if (!selectedOrder) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Order Details</h3>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Order Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedOrder.orderNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{formatCurrency(selectedOrder.totalAmount)}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.orderDate)}</p>
                </div>
                
                {selectedOrder.deliveryDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivery Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.deliveryDate)}</p>
                  </div>
                )}
                
                {selectedOrder.deliveredAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Delivered At</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.deliveredAt)}</p>
                  </div>
                )}
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <div className="mt-1">
                    <p className="text-sm text-gray-900">{selectedOrder.customer?.name}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.customer?.email}</p>
                  </div>
                </div>
                
                {selectedOrder.driver && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Assigned Driver</label>
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">{selectedOrder.driver.name}</p>
                      <p className="text-sm text-gray-500">{selectedOrder.driver.email}</p>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedOrder.paymentMethod}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedOrder.paymentStatus}</p>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-3">Order Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedOrder.items?.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                          {item.type.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delivery Address */}
            {selectedOrder.deliveryAddress && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Delivery Address</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedOrder.deliveryAddress.fullName}</p>
                  <p className="text-sm text-gray-900">{selectedOrder.deliveryAddress.address}</p>
                  <p className="text-sm text-gray-500">
                    House #{selectedOrder.deliveryAddress.houseNumber} - {selectedOrder.deliveryAddress.portion}
                  </p>
                  {selectedOrder.deliveryAddress.phoneNumber && (
                    <p className="text-sm text-gray-500">{selectedOrder.deliveryAddress.phoneNumber}</p>
                  )}
                  {selectedOrder.deliveryAddress.specialInstructions && (
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>Instructions:</strong> {selectedOrder.deliveryAddress.specialInstructions}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Notes</h4>
                <p className="text-sm text-gray-900 bg-gray-50 p-4 rounded-lg">{selectedOrder.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
              {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                <>
                  <button
                    onClick={() => {
                      setShowOrderModal(false)
                      openStatusModal(selectedOrder)
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Update Status
                  </button>
                  {!selectedOrder.driver && (
                    <button
                      onClick={() => {
                        setShowOrderModal(false)
                        openAssignModal(selectedOrder)
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Assign Driver
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStatusModal = () => {
    if (!selectedOrder) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Update Order Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Update status for order <strong>{selectedOrder.orderNumber}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOrderAction('updateStatus', selectedOrder.id)}
                disabled={actionLoading || newStatus === selectedOrder.status}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderAssignModal = () => {
    if (!selectedOrder) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Driver</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Assign driver to order <strong>{selectedOrder.orderNumber}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a driver</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOrderAction('assignDriver', selectedOrder.id)}
                disabled={actionLoading || !selectedDriverId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Assign Driver'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCancelModal = () => {
    if (!selectedOrder) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cancel Order</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <FiX className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Cancel Order
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to cancel order <strong>{selectedOrder.orderNumber}</strong>? 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleOrderAction('cancel', selectedOrder.id)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {renderStatistics()}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-lg">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search orders by number, customer name, or email..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </form>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <select
              value={filters.driver}
              onChange={(e) => handleFilterChange('driver', e.target.value)}
              className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Drivers</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
            
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="block w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            
            <button
              onClick={fetchOrders}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiRefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Orders ({orders.length})
            </h3>
            <RealtimeIndicator connected={connected} />
          </div>
        </div>
        
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <FiPackage className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status || filters.driver 
                ? 'Try adjusting your search or filter criteria.'
                : 'No orders have been placed yet.'
              }
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiPackage className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 font-mono">{order.orderNumber}</p>
                        <div className="ml-2 flex space-x-1">
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">{order.customer?.name}</p>
                        <p className="text-sm text-gray-500">{order.customer?.email}</p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(order.totalAmount)}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">{formatDate(order.orderDate)}</p>
                        {order.driver && (
                          <div className="flex items-center text-sm text-gray-500">
                            <FiUser className="w-4 h-4 mr-1" />
                            {order.driver.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openOrderModal(order)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                    {order.status !== 'delivered' && order.status !== 'cancelled' && (
                      <>
                        <button
                          onClick={() => openStatusModal(order)}
                          className="text-blue-400 hover:text-blue-600"
                          title="Update Status"
                        >
                          <FiEdit2 className="h-5 w-5" />
                        </button>
                        {!order.driver && (
                          <button
                            onClick={() => openAssignModal(order)}
                            className="text-green-400 hover:text-green-600"
                            title="Assign Driver"
                          >
                            <FiTruck className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => openCancelModal(order)}
                          className="text-red-400 hover:text-red-600"
                          title="Cancel Order"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {showOrderModal && renderOrderModal()}
      {showStatusModal && renderStatusModal()}
      {showAssignModal && renderAssignModal()}
      {showCancelModal && renderCancelModal()}
    </div>
  )
}

export default OrderManagement
