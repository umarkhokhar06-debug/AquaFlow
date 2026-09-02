import React, { useState, useEffect, useCallback } from 'react'
import { systemConfigAPI } from '../services/api'
import { FiSave, FiSettings, FiDroplet, FiBell, FiTag, FiMapPin } from 'react-icons/fi'

const DEFAULT_PRICING = { large_tanker: 2500, small_tanker: 1800, water_bottles: 500 }

const SystemSettings = () => {
  const [expressFee, setExpressFee] = useState('300')
  const [pricing, setPricing] = useState(DEFAULT_PRICING)
  const [delayedThresholdMinutes, setDelayedThresholdMinutes] = useState('60')
  const [lowWaterThreshold, setLowWaterThreshold] = useState('20')
  const [serviceAreasText, setServiceAreasText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await systemConfigAPI.getAllConfig()
      const config = res.data.config || {}
      setExpressFee(String(config.expressFeeAmount ?? 300))
      setPricing({ ...DEFAULT_PRICING, ...(config.productPricing || {}) })
      setDelayedThresholdMinutes(String(config.delayedThresholdMinutes ?? 60))
      setLowWaterThreshold(String(config.lowWaterThresholdDefaultPercent ?? 20))
      setServiceAreasText((config.serviceAreas || []).join(', '))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load system settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSaveAll = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const serviceAreas = serviceAreasText.split(',').map(s => s.trim()).filter(Boolean)
      await Promise.all([
        systemConfigAPI.updateConfig('expressFeeAmount', Number(expressFee), 'Express delivery fee charged on top of the order total'),
        systemConfigAPI.updateConfig('productPricing', {
          large_tanker: Number(pricing.large_tanker),
          small_tanker: Number(pricing.small_tanker),
          water_bottles: Number(pricing.water_bottles)
        }, 'Per-unit price for each product type'),
        systemConfigAPI.updateConfig('delayedThresholdMinutes', Number(delayedThresholdMinutes), 'Minutes an order can be on the way before it is flagged as delayed'),
        systemConfigAPI.updateConfig('lowWaterThresholdDefaultPercent', Number(lowWaterThreshold), 'Default low-water alert threshold for newly installed devices'),
        systemConfigAPI.updateConfig('serviceAreas', serviceAreas, 'Delivery areas checked against the address text at checkout; empty means no restriction')
      ])
      setSaved(true)
      fetchConfig()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings')
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

  const inputClass = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 flex items-center"><FiSettings className="mr-2 text-gray-400" /> System Settings</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}

      <form onSubmit={handleSaveAll} className="space-y-6 max-w-2xl">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-1 flex items-center"><FiTag className="mr-2 text-gray-400" /> Pricing</h3>
          <p className="text-xs text-gray-500 mb-4">Changing these does not affect orders already placed.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Express Delivery Fee (PKR)</label>
              <input type="number" required min={0} value={expressFee} onChange={e => setExpressFee(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Large Tanker (PKR)</label>
              <input type="number" required min={0} value={pricing.large_tanker} onChange={e => setPricing(p => ({ ...p, large_tanker: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Small Tanker (PKR)</label>
              <input type="number" required min={0} value={pricing.small_tanker} onChange={e => setPricing(p => ({ ...p, small_tanker: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Water Bottles (PKR)</label>
              <input type="number" required min={0} value={pricing.water_bottles} onChange={e => setPricing(p => ({ ...p, water_bottles: e.target.value }))} className={inputClass} />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center"><FiBell className="mr-2 text-gray-400" /> Notification Thresholds</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delay Alert Threshold (minutes)</label>
            <p className="text-xs text-gray-500 mb-1">An order still "on the way" past this many minutes is flagged as delayed on the dispatch console.</p>
            <input type="number" required min={1} value={delayedThresholdMinutes} onChange={e => setDelayedThresholdMinutes(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center"><FiDroplet className="mr-2 text-gray-400" /> Devices</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Low-Water Threshold (%)</label>
            <p className="text-xs text-gray-500 mb-1">Applied to newly installed devices unless a different value is set for that device specifically.</p>
            <input type="number" required min={0} max={100} value={lowWaterThreshold} onChange={e => setLowWaterThreshold(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center"><FiMapPin className="mr-2 text-gray-400" /> Service Areas</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700">Delivery Areas</label>
            <p className="text-xs text-gray-500 mb-1">Comma-separated area names checked against the delivery address text. Leave empty to accept orders from anywhere.</p>
            <input type="text" placeholder="e.g. Gulshan, DHA, Clifton" value={serviceAreasText} onChange={e => setServiceAreasText(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
            <FiSave className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save All Settings'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved</span>}
        </div>
      </form>
    </div>
  )
}

export default SystemSettings
