import React, { useState, useEffect, useCallback } from 'react'
import { dailyClosingAPI } from '../services/api'
import { FiRefreshCw, FiDollarSign, FiCheckCircle, FiExternalLink } from 'react-icons/fi'

const DailyClosings = () => {
  const [closings, setClosings] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const fetchClosings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await dailyClosingAPI.getAll(statusFilter)
      setClosings(res.data.closings || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load daily closings')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchClosings() }, [fetchClosings])

  const handleReconcile = async (id) => {
    setActionLoading(id)
    try {
      await dailyClosingAPI.reconcile(id)
      fetchClosings()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reconcile')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const totalCash = closings.reduce((sum, c) => sum + c.cashCollected, 0)
  const totalOnline = closings.reduce((sum, c) => sum + c.onlineCollected, 0)

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Cash (shown)</p>
          <p className="text-2xl font-semibold text-gray-900">Rs {totalCash.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Online (shown)</p>
          <p className="text-2xl font-semibold text-gray-900">Rs {totalOnline.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Pending Reconciliation</p>
          <p className="text-2xl font-semibold text-amber-600">{closings.filter(c => c.status === 'submitted').length}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center"><FiDollarSign className="mr-2" />{closings.length} closing(s)</h3>
        <div className="flex items-center space-x-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm">
            <option value="">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="reconciled">Reconciled</option>
          </select>
          <button onClick={fetchClosings} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cash</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Online</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proof</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {closings.map(c => (
              <tr key={c._id}>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.driver?.name}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{new Date(c.date).toLocaleDateString()}</td>
                <td className="px-6 py-3 text-sm text-gray-600">Rs {c.cashCollected.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-gray-600">Rs {c.onlineCollected.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm">
                  {c.paymentProofUrl ? (
                    <a href={c.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 inline-flex items-center">
                      <FiExternalLink className="mr-1" /> View
                    </a>
                  ) : '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${c.status === 'reconciled' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{c.status}</span>
                </td>
                <td className="px-6 py-3 text-right">
                  {c.status === 'submitted' && (
                    <button
                      onClick={() => handleReconcile(c._id)}
                      disabled={actionLoading === c._id}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center disabled:opacity-50"
                    >
                      <FiCheckCircle className="mr-1" /> {actionLoading === c._id ? 'Reconciling...' : 'Reconcile'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {closings.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No daily closings submitted yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DailyClosings
