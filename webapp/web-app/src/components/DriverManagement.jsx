import React, { useState, useEffect, useCallback } from 'react'
import { driverManagementAPI, orderManagementAPI } from '../services/api'
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
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiMapPin,
  FiList,
  FiPlay,
  FiStopCircle,
  FiArrowUp,
  FiArrowDown,
  FiTrash2
} from 'react-icons/fi'

const DriverManagement = () => {
  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const { socket, connected } = useSocket(token)
  
  const [drivers, setDrivers] = useState([])
  const [availableOrders, setAvailableOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    driverStatus: '',
    page: 1,
    limit: 10
  })
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [showDriverModal, setShowDriverModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showQueueModal, setShowQueueModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [queueOrder, setQueueOrder] = useState([])

  const statusOptions = [
    { value: 'free', label: 'Free', color: 'green' },
    { value: 'busy', label: 'Busy', color: 'blue' },
    { value: 'offline', label: 'Offline', color: 'red' }
  ]

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await driverManagementAPI.getDrivers(filters)
      setDrivers(response.data.drivers || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch drivers')
      console.error('Error fetching drivers:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await driverManagementAPI.getDriverStatistics()
      setStatistics(response.data.statistics)
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }, [])

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const response = await orderManagementAPI.getAllOrders({ status: 'confirmed' })
      setAvailableOrders(response.data.orders || [])
    } catch (err) {
      console.error('Error fetching available orders:', err)
    }
  }, [])

  useEffect(() => {
    fetchDrivers()
    fetchStatistics()
    fetchAvailableOrders()
  }, [fetchDrivers, fetchStatistics, fetchAvailableOrders])

  // Socket event listeners
  useEffect(() => {
    if (socket && connected && user?.userType === 'admin') {
      // Join admin room for driver updates
      socket.emit('join-admin-room')

      // Listen for driver status updates
      socket.on('driver-status-update', (data) => {
        console.log('Driver status updated:', data)
        setDrivers(prev => prev.map(driver => 
          driver.id === data.data.driverId 
            ? { 
                ...driver, 
                driverStatus: data.data.status,
                location: data.data.location,
                lastUpdated: data.data.timestamp
              }
            : driver
        ))
        // Refresh statistics
        fetchStatistics()
      })

      // Listen for driver queue updates
      socket.on('driver-queue-update', (data) => {
        console.log('Driver queue updated:', data)
        setDrivers(prev => prev.map(driver => 
          driver.id === data.data.driverId 
            ? { 
                ...driver, 
                orderQueue: data.data.queue,
                currentOrder: data.data.currentOrder
              }
            : driver
        ))
      })

      // Listen for driver location updates
      socket.on('driver-location-update', (data) => {
        console.log('Driver location updated:', data)
        setDrivers(prev => prev.map(driver => 
          driver.id === data.data.driverId 
            ? { 
                ...driver, 
                location: {
                  ...driver.location,
                  latitude: data.data.location.latitude,
                  longitude: data.data.location.longitude,
                  lastUpdated: data.data.timestamp
                }
              }
            : driver
        ))
      })

      return () => {
        socket.off('driver-status-update')
        socket.off('driver-queue-update')
        socket.off('driver-location-update')
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
    fetchDrivers()
  }

  const handleDriverAction = async (action, driverId, additionalData = {}) => {
    try {
      setActionLoading(true)
      let response

      switch (action) {
        case 'updateStatus':
          response = await driverManagementAPI.updateDriverStatus(driverId, newStatus)
          break
        case 'assignOrder':
          response = await driverManagementAPI.assignOrderToDriver(driverId, selectedOrderId)
          break
        case 'reorderQueue':
          response = await driverManagementAPI.reorderDriverQueue(driverId, queueOrder)
          break
        case 'removeFromQueue':
          response = await driverManagementAPI.removeOrderFromQueue(driverId, additionalData.orderId)
          break
        default:
          throw new Error('Invalid action')
      }

      if (response.data.success) {
        await fetchDrivers()
        await fetchStatistics()
        await fetchAvailableOrders()
        setShowDriverModal(false)
        setShowStatusModal(false)
        setShowAssignModal(false)
        setShowQueueModal(false)
        setSelectedDriver(null)
        setNewStatus('')
        setSelectedOrderId('')
        setQueueOrder([])
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} driver`)
      console.error(`Error ${action}ing driver:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  const openDriverModal = (driver) => {
    setSelectedDriver(driver)
    setShowDriverModal(true)
  }

  const openStatusModal = (driver) => {
    setSelectedDriver(driver)
    setNewStatus(driver.driverStatus)
    setShowStatusModal(true)
  }

  const openAssignModal = (driver) => {
    setSelectedDriver(driver)
    setShowAssignModal(true)
  }

  const openQueueModal = (driver) => {
    setSelectedDriver(driver)
    setQueueOrder(driver.orderQueue?.map(item => item.order?.id || item.order) || [])
    setShowQueueModal(true)
  }

  const getStatusBadge = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status) || { label: status, color: 'gray' }
    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
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
      case 'free':
        return <FiPlay className="w-4 h-4" />
      case 'busy':
        return <FiClock className="w-4 h-4" />
      case 'offline':
        return <FiStopCircle className="w-4 h-4" />
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
              <FiTruck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalDrivers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Free Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.freeDrivers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiClock className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Busy Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.busyDrivers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiStopCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Offline Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.offlineDrivers}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDriverModal = () => {
    if (!selectedDriver) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Driver Details</h3>
              <button
                onClick={() => setShowDriverModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Driver Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDriver.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDriver.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedDriver.driverStatus)}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedDriver.vehicleInfo?.vehicleType}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{selectedDriver.vehicleInfo?.vehicleNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Capacity</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedDriver.vehicleInfo?.capacity} orders</p>
                </div>
              </div>

              {/* Location and Queue Information */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Location</label>
                  {selectedDriver.location ? (
                    <div className="mt-1">
                      <p className="text-sm text-gray-900">
                        {selectedDriver.location.latitude.toFixed(6)}, {selectedDriver.location.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last updated: {formatDate(selectedDriver.location.lastUpdated)}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Location not available</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Queue Length</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedDriver.orderQueue?.length || 0} / {selectedDriver.maxQueueSize || 5}
                  </p>
                </div>
                
                {selectedDriver.currentOrder && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Order</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedDriver.currentOrder.orderNumber}
                      </p>
                      <p className="text-sm text-gray-600">
                        Customer: {selectedDriver.currentOrder.customer?.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Amount: {formatCurrency(selectedDriver.currentOrder.totalAmount)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Queue */}
            {selectedDriver.orderQueue && selectedDriver.orderQueue.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-medium text-gray-900 mb-3">Order Queue</h4>
                <div className="space-y-2">
                  {selectedDriver.orderQueue.map((queueItem, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {queueItem.order?.orderNumber || queueItem.order}
                        </p>
                        <p className="text-sm text-gray-600">
                          Priority: {queueItem.priority || index}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">
                          {formatDate(queueItem.assignedAt)}
                        </span>
                        <button
                          onClick={() => handleDriverAction('removeFromQueue', selectedDriver.id, { orderId: queueItem.order?.id || queueItem.order })}
                          className="text-red-400 hover:text-red-600"
                          title="Remove from queue"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowDriverModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDriverModal(false)
                  openStatusModal(selectedDriver)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Update Status
              </button>
              {selectedDriver.driverStatus === 'free' && (
                <button
                  onClick={() => {
                    setShowDriverModal(false)
                    openAssignModal(selectedDriver)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Assign Order
                </button>
              )}
              {selectedDriver.orderQueue && selectedDriver.orderQueue.length > 0 && (
                <button
                  onClick={() => {
                    setShowDriverModal(false)
                    openQueueModal(selectedDriver)
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700"
                >
                  Manage Queue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderStatusModal = () => {
    if (!selectedDriver) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Update Driver Status</h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Update status for driver <strong>{selectedDriver.name}</strong>
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
                onClick={() => handleDriverAction('updateStatus', selectedDriver.id)}
                disabled={actionLoading || newStatus === selectedDriver.driverStatus}
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
    if (!selectedDriver) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Order</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Assign order to driver <strong>{selectedDriver.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700">Select Order</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select an order</option>
                  {availableOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.orderNumber} - {order.customer?.name} - {formatCurrency(order.totalAmount)}
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
                onClick={() => handleDriverAction('assignOrder', selectedDriver.id)}
                disabled={actionLoading || !selectedOrderId}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Assign Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderQueueModal = () => {
    if (!selectedDriver) return null

    const moveUp = (index) => {
      if (index > 0) {
        const newQueue = [...queueOrder]
        const temp = newQueue[index]
        newQueue[index] = newQueue[index - 1]
        newQueue[index - 1] = temp
        setQueueOrder(newQueue)
      }
    }

    const moveDown = (index) => {
      if (index < queueOrder.length - 1) {
        const newQueue = [...queueOrder]
        const temp = newQueue[index]
        newQueue[index] = newQueue[index + 1]
        newQueue[index + 1] = temp
        setQueueOrder(newQueue)
      }
    }

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Manage Driver Queue</h3>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Reorder queue for driver <strong>{selectedDriver.name}</strong>
              </p>
              
              <div className="space-y-2">
                {queueOrder.map((orderId, index) => {
                  const order = selectedDriver.orderQueue?.find(item => 
                    (item.order?.id || item.order) === orderId
                  )?.order
                  
                  return (
                    <div key={orderId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {order?.orderNumber || orderId}
                          </p>
                          {order && (
                            <p className="text-sm text-gray-600">
                              {order.customer?.name} - {formatCurrency(order.totalAmount)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <FiArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === queueOrder.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        >
                          <FiArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowQueueModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDriverAction('reorderQueue', selectedDriver.id)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {actionLoading ? 'Reordering...' : 'Save Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && drivers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading drivers...</p>
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
                placeholder="Search drivers by name, email, or vehicle number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </form>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={filters.driverStatus}
              onChange={(e) => handleFilterChange('driverStatus', e.target.value)}
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
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="block w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            
            <button
              onClick={fetchDrivers}
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

      {/* Drivers Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Drivers ({drivers.length})
            </h3>
            <RealtimeIndicator connected={connected} />
          </div>
        </div>
        
        {drivers.length === 0 ? (
          <div className="text-center py-12">
            <FiTruck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No drivers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.driverStatus 
                ? 'Try adjusting your search or filter criteria.'
                : 'No drivers have been registered yet.'
              }
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {drivers.map((driver) => (
              <li key={driver.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiTruck className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{driver.name}</p>
                        <div className="ml-2 flex space-x-1">
                          {getStatusBadge(driver.driverStatus)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-sm text-gray-500">{driver.email}</p>
                        <p className="text-sm text-gray-500">{driver.vehicleInfo?.vehicleNumber}</p>
                        <p className="text-sm text-gray-500 capitalize">{driver.vehicleInfo?.vehicleType}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center text-sm text-gray-500">
                          <FiList className="w-4 h-4 mr-1" />
                          Queue: {driver.orderQueue?.length || 0}/{driver.maxQueueSize || 5}
                        </div>
                        {driver.location && (
                          <div className="flex items-center text-sm text-gray-500">
                            <FiMapPin className="w-4 h-4 mr-1" />
                            Location Available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openDriverModal(driver)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openStatusModal(driver)}
                      className="text-blue-400 hover:text-blue-600"
                      title="Update Status"
                    >
                      <FiEdit2 className="h-5 w-5" />
                    </button>
                    {driver.driverStatus === 'free' && (
                      <button
                        onClick={() => openAssignModal(driver)}
                        className="text-green-400 hover:text-green-600"
                        title="Assign Order"
                      >
                        <FiPackage className="h-5 w-5" />
                      </button>
                    )}
                    {driver.orderQueue && driver.orderQueue.length > 0 && (
                      <button
                        onClick={() => openQueueModal(driver)}
                        className="text-purple-400 hover:text-purple-600"
                        title="Manage Queue"
                      >
                        <FiList className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modals */}
      {showDriverModal && renderDriverModal()}
      {showStatusModal && renderStatusModal()}
      {showAssignModal && renderAssignModal()}
      {showQueueModal && renderQueueModal()}
    </div>
  )
}

export default DriverManagement
