import React, { useState, useEffect, useCallback } from 'react'
import { promoAPI } from '../services/api'
import { FiPlus, FiTag, FiTrash2, FiRefreshCw, FiToggleLeft, FiToggleRight, FiBarChart2 } from 'react-icons/fi'

const emptyForm = {
  code: '', discountPercent: '', validFrom: '', validUntil: '',
  usageLimit: '', perCustomerLimit: 1, minOrderAmount: 0
}

const PromoCodes = () => {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [actionLoading, setActionLoading] = useState(false)
  const [usageReport, setUsageReport] = useState(null)

  const fetchCodes = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await promoAPI.getPromoCodes({ limit: 100 })
      setCodes(res.data.codes || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load promo codes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCodes() }, [fetchCodes])

  const handleCreate = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await promoAPI.createPromoCode({
        code: form.code,
        discountPercent: Number(form.discountPercent),
        validFrom: form.validFrom || undefined,
        validUntil: form.validUntil || undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        perCustomerLimit: Number(form.perCustomerLimit),
        minOrderAmount: Number(form.minOrderAmount)
      })
      setShowCreateModal(false)
      setForm(emptyForm)
      fetchCodes()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create promo code')
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleActive = async (promo) => {
    try {
      await promoAPI.updatePromoCode(promo._id, { isActive: !promo.isActive })
      fetchCodes()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update promo code')
    }
  }

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete promo code ${promo.code}?`)) return
    try {
      await promoAPI.deletePromoCode(promo._id)
      fetchCodes()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete promo code')
    }
  }

  const openUsage = async (promo) => {
    try {
      const res = await promoAPI.getUsageReport(promo._id)
      setUsageReport(res.data.report)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load usage report')
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
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">{codes.length} promo code(s)</h3>
        <div className="flex space-x-2">
          <button onClick={fetchCodes} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <FiPlus className="h-4 w-4 mr-2" /> Create Promo Code
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {codes.map(promo => (
              <tr key={promo._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center"><FiTag className="mr-2 text-gray-400" />{promo.code}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{promo.discountPercent}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {promo.validFrom ? new Date(promo.validFrom).toLocaleDateString() : 'now'} &rarr; {promo.validUntil ? new Date(promo.validUntil).toLocaleDateString() : 'no end'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {promo.redemptions?.length || 0}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button onClick={() => handleToggleActive(promo)} className="flex items-center text-sm">
                    {promo.isActive ? <FiToggleRight className="text-green-600 h-5 w-5 mr-1" /> : <FiToggleLeft className="text-gray-400 h-5 w-5 mr-1" />}
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-3">
                  <button onClick={() => openUsage(promo)} className="text-blue-600 hover:text-blue-800" title="Usage report">
                    <FiBarChart2 className="inline h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(promo)} className="text-red-600 hover:text-red-800" title="Delete">
                    <FiTrash2 className="inline h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No promo codes yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Promo Code</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Code</label>
                  <input type="text" required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount %</label>
                  <input type="number" required min={1} max={100} value={form.discountPercent} onChange={e => setForm(p => ({ ...p, discountPercent: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid From</label>
                  <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usage Limit</label>
                  <input type="number" value={form.usageLimit} onChange={e => setForm(p => ({ ...p, usageLimit: e.target.value }))} className={inputClass} placeholder="Unlimited" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Per Customer</label>
                  <input type="number" value={form.perCustomerLimit} onChange={e => setForm(p => ({ ...p, perCustomerLimit: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Order</label>
                  <input type="number" value={form.minOrderAmount} onChange={e => setForm(p => ({ ...p, minOrderAmount: e.target.value }))} className={inputClass} />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {usageReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Report: {usageReport.code}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Times used</span><span className="font-medium">{usageReport.timesUsed}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Total discount given</span><span className="font-medium">Rs {usageReport.totalDiscountGiven}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Usage limit</span><span className="font-medium">{usageReport.usageLimit || 'Unlimited'}</span></div>
            </div>
            <div className="flex justify-end pt-4">
              <button onClick={() => setUsageReport(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PromoCodes
