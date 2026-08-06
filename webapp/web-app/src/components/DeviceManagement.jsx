import React, { useState, useEffect, useCallback } from 'react'
import { deviceManagementAPI, userManagementAPI } from '../services/api'
import {
  FiPlus,
  FiX,
  FiUsers,
  FiTrash2,
  FiWifi,
  FiWifiOff,
  FiUserPlus,
  FiUserMinus,
  FiCpu
} from 'react-icons/fi'

const emptyForm = {
  deviceId: '',
  name: '',
  houseLabel: '',
  ownerId: '',
  tank_depth: '',
  tank_full_distance: '',
  tankCapacityLiters: 1000,
  lowWaterThreshold: 20,
  isSimulated: true
}

const DeviceManagement = () => {
  const [devices, setDevices] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [tenantDevice, setTenantDevice] = useState(null)
  const [tenantEmail, setTenantEmail] = useState('')
  const [tenantSubmitting, setTenantSubmitting] = useState(false)

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await deviceManagementAPI.getDevices()
      setDevices(response.data.devices || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch devices')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await userManagementAPI.getUsers({ userType: 'customer', limit: 200 })
      setCustomers(response.data.users || [])
    } catch (err) {
      console.error('Error fetching customers:', err)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
    fetchCustomers()
  }, [fetchDevices, fetchCustomers])

  const openCreateModal = () => {
    setForm(emptyForm)
    setFormError(null)
    setShowCreateModal(true)
  }

  const handleCreateDevice = async (e) => {
    e.preventDefault()
    setFormError(null)

    if (!form.deviceId || !form.name || !form.houseLabel || !form.ownerId || form.tank_depth === '' || form.tank_full_distance === '') {
      setFormError('Please fill in all required fields')
      return
    }

    try {
      setSubmitting(true)
      await deviceManagementAPI.createDevice({
        deviceId: form.deviceId.trim(),
        name: form.name.trim(),
        houseLabel: form.houseLabel.trim(),
        ownerId: form.ownerId,
        tank_depth: parseFloat(form.tank_depth),
        tank_full_distance: parseFloat(form.tank_full_distance),
        tankCapacityLiters: parseFloat(form.tankCapacityLiters) || 1000,
        lowWaterThreshold: parseFloat(form.lowWaterThreshold) || 20,
        isSimulated: form.isSimulated
      })
      setShowCreateModal(false)
      fetchDevices()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create device')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDevice = async (device) => {
    if (!window.confirm(`Remove device "${device.name}" (${device.deviceId})? This cannot be undone.`)) return
    try {
      await deviceManagementAPI.deleteDevice(device._id)
      fetchDevices()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete device')
    }
  }

  const openTenantModal = (device) => {
    setTenantDevice(device)
    setTenantEmail('')
  }

  const handleAddTenant = async (e) => {
    e.preventDefault()
    if (!tenantEmail.trim()) return
    try {
      setTenantSubmitting(true)
      const response = await deviceManagementAPI.addTenant(tenantDevice._id, tenantEmail.trim().toLowerCase())
      setTenantDevice(response.data.device)
      setTenantEmail('')
      fetchDevices()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add tenant')
    } finally {
      setTenantSubmitting(false)
    }
  }

  const handleRemoveTenant = async (userId) => {
    try {
      const response = await deviceManagementAPI.removeTenant(tenantDevice._id, userId)
      setTenantDevice(response.data.device)
      fetchDevices()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove tenant')
    }
  }

  const renderCreateModal = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Register Device</h3>
          <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleCreateDevice} className="space-y-4">
          {formError && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-md">{formError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Device ID</label>
              <input
                type="text"
                value={form.deviceId}
                onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                placeholder="SIM-004"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Must match the ID flashed onto the device / simulator config</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Device Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rooftop Tank"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">House / Property Label</label>
            <input
              type="text"
              value={form.houseLabel}
              onChange={(e) => setForm({ ...form, houseLabel: e.target.value })}
              placeholder="House J5-10 (Ground Floor)"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">How you'll identify this installation — shown wherever the device appears in the admin UI</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Owner (Customer)</label>
            <select
              value={form.ownerId}
              onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select owner...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.houseNumber || c.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tank Depth (cm)</label>
              <input
                type="number"
                value={form.tank_depth}
                onChange={(e) => setForm({ ...form, tank_depth: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Distance (cm)</label>
              <input
                type="number"
                value={form.tank_full_distance}
                onChange={(e) => setForm({ ...form, tank_full_distance: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Capacity (liters)</label>
              <input
                type="number"
                value={form.tankCapacityLiters}
                onChange={(e) => setForm({ ...form, tankCapacityLiters: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Alert Below (%)</label>
              <input
                type="number"
                value={form.lowWaterThreshold}
                onChange={(e) => setForm({ ...form, lowWaterThreshold: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={form.isSimulated}
              onChange={(e) => setForm({ ...form, isSimulated: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Simulated device (no real hardware yet)</span>
          </label>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Device'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  const renderTenantModal = () => {
    if (!tenantDevice) return null
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-medium text-gray-900">Manage Access</h3>
            <button onClick={() => setTenantDevice(null)} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-6 h-6" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">{tenantDevice.name} — {tenantDevice.houseLabel}</p>

          <div className="border rounded-md divide-y mb-4">
            <div className="flex items-center justify-between px-3 py-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{tenantDevice.owner?.name}</p>
                <p className="text-xs text-gray-500">{tenantDevice.owner?.email}</p>
              </div>
              <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Owner</span>
            </div>
            {tenantDevice.tenants?.length === 0 && (
              <p className="text-sm text-gray-400 px-3 py-3">No tenants added yet.</p>
            )}
            {tenantDevice.tenants?.map((t) => (
              <div key={t.user._id} className="flex items-center justify-between px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{t.user.name}</p>
                  <p className="text-xs text-gray-500">{t.user.email}</p>
                </div>
                <button
                  onClick={() => handleRemoveTenant(t.user._id)}
                  className="text-red-500 hover:text-red-700"
                  title="Remove access"
                >
                  <FiUserMinus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddTenant} className="flex space-x-2">
            <input
              type="email"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
              placeholder="tenant@example.com"
              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              type="submit"
              disabled={tenantSubmitting}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              <FiUserPlus className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (loading && devices.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Devices</h2>
          <p className="text-sm text-gray-500">Every tank sensor, which house it belongs to, and who can see it.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <FiPlus className="mr-2 w-4 h-4" /> Register Device
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md mb-4">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Device</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">House</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenants</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {devices.map((device) => (
              <tr key={device._id}>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <FiCpu className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-500">{device.deviceId}{device.isSimulated && ' · simulated'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{device.houseLabel}</td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900">{device.owner?.name}</p>
                  <p className="text-xs text-gray-500">{device.owner?.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{device.tenants?.length || 0}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {device.status === 'active' ? <FiWifi className="w-3 h-3 mr-1" /> : <FiWifiOff className="w-3 h-3 mr-1" />}
                    {device.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
                </td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button
                    onClick={() => openTenantModal(device)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Manage access"
                  >
                    <FiUsers className="w-4 h-4 inline" />
                  </button>
                  <button
                    onClick={() => handleDeleteDevice(device)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete device"
                  >
                    <FiTrash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {devices.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500 text-sm">
            No devices registered yet. Click "Register Device" to add one, or run the simulator script — it registers devices automatically.
          </div>
        )}
      </div>

      {showCreateModal && renderCreateModal()}
      {tenantDevice && renderTenantModal()}
    </div>
  )
}

export default DeviceManagement
