import React, { useState, useEffect, useCallback } from 'react'
import { systemConfigAPI } from '../services/api'
import { FiSave, FiSettings } from 'react-icons/fi'

const SystemSettings = () => {
  const [expressFeeInput, setExpressFeeInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await systemConfigAPI.getAllConfig()
      setExpressFeeInput(String(res.data.config?.expressFeeAmount ?? 300))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSaveExpressFee = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await systemConfigAPI.updateConfig(
        'expressFeeAmount',
        Number(expressFeeInput),
        'Express delivery fee charged on top of the order total'
      )
      setSaved(true)
      fetchConfig()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save express fee')
    } finally {
      setSaving(false)
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

      <div className="bg-white p-6 rounded-lg shadow max-w-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <FiSettings className="mr-2 text-gray-400" /> System Settings
        </h3>
        <form onSubmit={handleSaveExpressFee} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Express Delivery Fee (PKR)</label>
            <p className="text-xs text-gray-500 mb-1">Added to the order total when a customer chooses express delivery. Changing this does not affect orders already placed.</p>
            <input
              type="number"
              required
              min={0}
              value={expressFeeInput}
              onChange={e => setExpressFeeInput(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
              <FiSave className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save'}
            </button>
            {saved && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </form>
      </div>
    </div>
  )
}

export default SystemSettings
