import React, { useState, useEffect, useCallback } from 'react'
import { dispatchAPI } from '../services/api'
import { FiRefreshCw, FiAlertTriangle, FiClock, FiTruck, FiMapPin, FiUser } from 'react-icons/fi'

const SECTIONS = [
  { key: 'exception', label: 'Exception', color: 'text-red-700 bg-red-50 border-red-200', icon: FiAlertTriangle },
  { key: 'new', label: 'New / Unassigned', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: FiClock },
  { key: 'delayed', label: 'Delayed', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: FiClock },
  { key: 'scheduled', label: 'Scheduled', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: FiClock },
  { key: 'active', label: 'Active / In Progress', color: 'text-green-700 bg-green-50 border-green-200', icon: FiTruck }
]

const DispatchConsole = () => {
  const [queue, setQueue] = useState({ exception: [], new: [], scheduled: [], delayed: [], active: [] })
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigningOrder, setAssigningOrder] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [recLoading, setRecLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [queueRes, mapRes] = await Promise.all([
        dispatchAPI.getQueue(),
        dispatchAPI.getLiveMap()
      ])
      setQueue(queueRes.data.queue || {})
      setDrivers(mapRes.data.drivers || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dispatch data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 20000)
    return () => clearInterval(interval)
  }, [fetchData])

  const openAssign = async (order) => {
    setAssigningOrder(order)
    setRecommendations([])
    setRecLoading(true)
    try {
      const res = await dispatchAPI.recommendDrivers(order._id)
      setRecommendations(res.data.recommendations || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to get recommendations')
    } finally {
      setRecLoading(false)
    }
  }

  const handleAssign = async (driverId) => {
    if (!assigningOrder) return
    setActionLoading(true)
    try {
      await dispatchAPI.assignOrder(assigningOrder._id, driverId)
      setAssigningOrder(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign order')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const busyDrivers = drivers.filter(d => d.driverStatus === 'busy')

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
        <div className="flex space-x-6 text-sm text-gray-600">
          <span><strong className="text-gray-900">{drivers.length}</strong> drivers total</span>
          <span className="text-green-700"><strong>{drivers.filter(d => d.driverStatus === 'free').length}</strong> free</span>
          <span className="text-blue-700"><strong>{busyDrivers.length}</strong> out delivering</span>
          <span className="text-gray-500"><strong>{drivers.filter(d => d.driverStatus === 'offline').length}</strong> offline</span>
        </div>
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
        </button>
      </div>

      {/* Live drivers out delivering */}
      {busyDrivers.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Trucks currently out for delivery</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {busyDrivers.map(d => (
              <div key={d.driverId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 flex items-center"><FiUser className="mr-1" />{d.name}</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">{d.truck?.plateNumber || 'no truck'}</span>
                </div>
                {d.currentOrder && (
                  <p className="text-sm text-gray-600">Order: {d.currentOrder.orderNumber} ({d.currentOrder.status})</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Queue: {d.queueLength} more</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order queue sections */}
      {SECTIONS.map(section => {
        const orders = queue[section.key] || []
        const Icon = section.icon
        return (
          <div key={section.key} className="bg-white shadow rounded-lg overflow-hidden">
            <div className={`px-6 py-3 border-b flex items-center ${section.color}`}>
              <Icon className="mr-2" />
              <h3 className="font-medium">{section.label} ({orders.length})</h3>
            </div>
            {orders.length === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-400">Nothing here</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                    <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map(order => (
                    <tr key={order._id}>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {order.customer?.fullName || order.customer?.name}
                        <div className="text-xs text-gray-400 flex items-center"><FiMapPin className="mr-1" />{order.deliveryAddress?.address}</div>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">Rs {order.totalAmount}</td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {order.paymentMethod} / {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{order.driver?.name || '-'}</td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => openAssign(order)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          {order.driver ? 'Reassign' : 'Assign'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      {assigningOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-1">Assign Order {assigningOrder.orderNumber}</h3>
            <p className="text-sm text-gray-500 mb-4">Ranked by distance + current workload</p>
            {recLoading ? (
              <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {recommendations.length === 0 && <p className="text-sm text-gray-500">No available drivers found.</p>}
                {recommendations.map(r => (
                  <button
                    key={r.driverId}
                    disabled={actionLoading}
                    onClick={() => handleAssign(r.driverId)}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-md hover:bg-blue-50 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">Queue: {r.queueLength} &middot; {r.distanceKm !== null ? `${r.distanceKm} km away` : 'location unknown'}</p>
                    </div>
                    <span className="text-xs text-gray-400">score {Math.round(r.score)}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end pt-4">
              <button onClick={() => setAssigningOrder(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DispatchConsole
