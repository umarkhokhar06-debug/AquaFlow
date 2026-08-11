import React, { useState, useEffect, useCallback } from 'react'
import { truckAPI, driverManagementAPI } from '../services/api'
import { FiPlus, FiTruck, FiTrash2, FiRefreshCw, FiUserCheck, FiUserX, FiTool } from 'react-icons/fi'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  idle: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  on_break: 'bg-yellow-100 text-yellow-800',
  maintenance: 'bg-red-100 text-red-800'
}

const FleetManagement = () => {
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [assigningTruck, setAssigningTruck] = useState(null)
  const [maintenanceTruck, setMaintenanceTruck] = useState(null)
  const [form, setForm] = useState({ plateNumber: '', capacity: '', registrationNumber: '', registrationExpiry: '', insurancePolicyNumber: '', insuranceExpiry: '' })
  const [maintenanceForm, setMaintenanceForm] = useState({ description: '', cost: '' })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [trucksRes, driversRes] = await Promise.all([
        truckAPI.getTrucks({ limit: 100 }),
        driverManagementAPI.getDrivers({ limit: 200 })
      ])
      setTrucks(trucksRes.data.trucks || [])
      setDrivers(driversRes.data.drivers || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load fleet data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await truckAPI.createTruck({
        ...form,
        capacity: form.capacity ? Number(form.capacity) : undefined
      })
      setShowCreateModal(false)
      setForm({ plateNumber: '', capacity: '', registrationNumber: '', registrationExpiry: '', insurancePolicyNumber: '', insuranceExpiry: '' })
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create truck')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (truck) => {
    if (!window.confirm(`Delete truck ${truck.plateNumber}?`)) return
    try {
      await truckAPI.deleteTruck(truck._id)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete truck')
    }
  }

  const handleAssign = async (driverId) => {
    if (!assigningTruck) return
    setActionLoading(true)
    try {
      await truckAPI.assignDriver(assigningTruck._id, driverId)
      setAssigningTruck(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign driver')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnassign = async (truck) => {
    try {
      await truckAPI.unassignDriver(truck._id)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unassign driver')
    }
  }

  const handleAddMaintenance = async (e) => {
    e.preventDefault()
    if (!maintenanceTruck) return
    setActionLoading(true)
    try {
      await truckAPI.addMaintenanceRecord(maintenanceTruck._id, {
        description: maintenanceForm.description,
        cost: maintenanceForm.cost ? Number(maintenanceForm.cost) : undefined
      })
      setMaintenanceTruck(null)
      setMaintenanceForm({ description: '', cost: '' })
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add maintenance record')
    } finally {
      setActionLoading(false)
    }
  }

  const inputClass = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">{trucks.length} truck(s) in fleet</h3>
        <div className="flex space-x-2">
          <button onClick={fetchData} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <FiPlus className="h-4 w-4 mr-2" /> Add Truck
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Insurance Expiry</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {trucks.map(truck => (
              <tr key={truck._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center"><FiTruck className="mr-2 text-gray-400" />{truck.plateNumber}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[truck.status] || 'bg-gray-100 text-gray-800'}`}>
                    {truck.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{truck.capacity || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {truck.assignedDriver?.name || <span className="text-gray-400">Unassigned</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {truck.insuranceExpiry ? new Date(truck.insuranceExpiry).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                  {truck.assignedDriver ? (
                    <button onClick={() => handleUnassign(truck)} className="text-yellow-600 hover:text-yellow-800" title="Unassign driver">
                      <FiUserX className="inline h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => setAssigningTruck(truck)} className="text-blue-600 hover:text-blue-800" title="Assign driver">
                      <FiUserCheck className="inline h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => setMaintenanceTruck(truck)} className="text-purple-600 hover:text-purple-800" title="Add maintenance record">
                    <FiTool className="inline h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(truck)} className="text-red-600 hover:text-red-800" title="Delete truck">
                    <FiTrash2 className="inline h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {trucks.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No trucks yet. Add one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Truck</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Plate Number</label>
                <input type="text" required value={form.plateNumber} onChange={e => setForm(p => ({ ...p, plateNumber: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity (liters)</label>
                <input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registration #</label>
                  <input type="text" value={form.registrationNumber} onChange={e => setForm(p => ({ ...p, registrationNumber: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reg. Expiry</label>
                  <input type="date" value={form.registrationExpiry} onChange={e => setForm(p => ({ ...p, registrationExpiry: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Insurance Policy #</label>
                  <input type="text" value={form.insurancePolicyNumber} onChange={e => setForm(p => ({ ...p, insurancePolicyNumber: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Insurance Expiry</label>
                  <input type="date" value={form.insuranceExpiry} onChange={e => setForm(p => ({ ...p, insuranceExpiry: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? 'Adding...' : 'Add Truck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningTruck && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Driver to {assigningTruck.plateNumber}</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {drivers.length === 0 && <p className="text-sm text-gray-500">No drivers found. Create one under Users first.</p>}
              {drivers.map(d => (
                <button
                  key={d._id}
                  disabled={actionLoading}
                  onClick={() => handleAssign(d._id)}
                  className="w-full text-left px-4 py-2 border border-gray-200 rounded-md hover:bg-blue-50 flex justify-between items-center"
                >
                  <span>{d.name} <span className="text-gray-400 text-xs">({d.email})</span></span>
                  <span className="text-xs text-gray-500 capitalize">{d.driverStatus}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={() => setAssigningTruck(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {maintenanceTruck && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Maintenance Record: {maintenanceTruck.plateNumber}</h3>
            <form onSubmit={handleAddMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea required rows={3} value={maintenanceForm.description} onChange={e => setMaintenanceForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost</label>
                <input type="number" value={maintenanceForm.cost} onChange={e => setMaintenanceForm(p => ({ ...p, cost: e.target.value }))} className={inputClass} />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setMaintenanceTruck(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default FleetManagement
