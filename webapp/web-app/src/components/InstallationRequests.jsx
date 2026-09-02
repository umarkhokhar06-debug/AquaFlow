import React, { useState, useEffect, useCallback } from 'react'
import { installationAPI, userManagementAPI } from '../services/api'
import { FiRefreshCw, FiHome, FiUser, FiPhone, FiMapPin } from 'react-icons/fi'

const STATUS_STYLES = {
  requested: 'bg-blue-50 text-blue-700 border-blue-200',
  assigned: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200'
}

const InstallationRequests = () => {
  const [installations, setInstallations] = useState([])
  const [installers, setInstallers] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [assigningRequest, setAssigningRequest] = useState(null)
  const [selectedInstaller, setSelectedInstaller] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [installationsRes, installersRes] = await Promise.all([
        installationAPI.getAll(statusFilter),
        userManagementAPI.getUsers({ userType: 'installer', status: 'active' })
      ])
      setInstallations(installationsRes.data.installations || [])
      setInstallers(installersRes.data.users || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load installation requests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const openAssign = (installation) => {
    setAssigningRequest(installation)
    setSelectedInstaller(installation.assignedInstaller?._id || '')
  }

  const handleAssign = async () => {
    if (!assigningRequest || !selectedInstaller) return
    setActionLoading(true)
    try {
      await installationAPI.assignInstaller(assigningRequest._id, selectedInstaller)
      setAssigningRequest(null)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign installer')
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

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-lg font-medium text-gray-900">{installations.length} installation request(s)</h3>
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="assigned">Assigned</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={fetchData} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested by</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Installer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {installations.map(req => (
              <tr key={req._id}>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center font-medium"><FiUser className="mr-2 text-gray-400" />{req.requestedBy?.fullName || req.requestedBy?.name}</div>
                  {req.contactPhone && <div className="text-xs text-gray-400 flex items-center mt-1"><FiPhone className="mr-1" />{req.contactPhone}</div>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <div className="flex items-center"><FiMapPin className="mr-1 text-gray-400" />{req.address || req.requestedBy?.address || '-'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full border ${STATUS_STYLES[req.status]}`}>{req.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{req.assignedInstaller?.name || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  {(req.status === 'requested' || req.status === 'assigned') && (
                    <button onClick={() => openAssign(req)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      {req.status === 'assigned' ? 'Reassign' : 'Assign'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {installations.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 flex flex-col items-center">
                <FiHome className="h-6 w-6 mb-2 text-gray-300" /> No installation requests.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {assigningRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Installer</h3>
            <p className="text-sm text-gray-500 mb-4">{assigningRequest.requestedBy?.fullName || assigningRequest.requestedBy?.name} &mdash; {assigningRequest.address || 'No address provided'}</p>
            <select
              value={selectedInstaller}
              onChange={(e) => setSelectedInstaller(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 mb-4"
            >
              <option value="">Select an installer...</option>
              {installers.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.name} ({inst.email})</option>
              ))}
            </select>
            {installers.length === 0 && (
              <p className="text-sm text-amber-600 mb-4">No active installer accounts yet. Create one under Users &amp; Employees.</p>
            )}
            <div className="flex justify-end space-x-2">
              <button onClick={() => setAssigningRequest(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button
                onClick={handleAssign}
                disabled={actionLoading || !selectedInstaller}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstallationRequests
