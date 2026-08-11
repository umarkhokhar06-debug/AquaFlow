import React, { useState, useEffect, useCallback } from 'react'
import { forecastAPI, reportAPI } from '../services/api'
import { FiTrendingUp, FiTrendingDown, FiActivity, FiDownload, FiRefreshCw, FiPlay } from 'react-icons/fi'

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales / Orders' },
  { value: 'payment-methods', label: 'Payment Methods' },
  { value: 'driver-performance', label: 'Driver Performance' },
  { value: 'truck-utilization', label: 'Truck Utilization' },
  { value: 'device-status', label: 'Device Status' },
  { value: 'water-consumption', label: 'Water Consumption' },
  { value: 'customer-growth', label: 'Customer Growth' },
  { value: 'complaints', label: 'Complaints' }
]

const ForecastReports = () => {
  const [fleetForecast, setFleetForecast] = useState(null)
  const [trends, setTrends] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportType, setReportType] = useState('sales')
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [scanRunning, setScanRunning] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [forecastRes, trendsRes] = await Promise.all([
        forecastAPI.getFleetForecast(),
        forecastAPI.getConsumptionTrends()
      ])
      setFleetForecast(forecastRes.data.forecast)
      setTrends(trendsRes.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load forecast data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const fetchReport = useCallback(async () => {
    setReportLoading(true)
    try {
      const res = await reportAPI.getReport(reportType)
      setReport(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report')
    } finally {
      setReportLoading(false)
    }
  }, [reportType])

  useEffect(() => { fetchReport() }, [fetchReport])

  const downloadCsv = () => {
    if (!report) return
    const blob = new Blob([report.csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.type}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const runNightlyScan = async () => {
    setScanRunning(true)
    try {
      await forecastAPI.runNightlyScan()
      await fetchData()
      alert('Nightly IoT scan triggered successfully.')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to run nightly scan')
    } finally {
      setScanRunning(false)
    }
  }

  const columns = report?.rows?.[0] ? Object.keys(report.rows[0]) : []

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

      <div className="flex justify-end space-x-2">
        <button onClick={runNightlyScan} disabled={scanRunning} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
          <FiPlay className="h-4 w-4 mr-2" /> {scanRunning ? 'Running...' : 'Run Nightly Scan (test)'}
        </button>
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
        </button>
      </div>

      {/* Tomorrow's forecast */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Forecast for {fleetForecast?.forecastFor ? new Date(fleetForecast.forecastFor).toLocaleDateString() : 'tomorrow'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Expected Orders</p>
            <p className="text-2xl font-medium text-gray-900">{fleetForecast?.expectedOrders ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expected Volume</p>
            <p className="text-2xl font-medium text-gray-900">{fleetForecast?.expectedVolumeLiters?.toLocaleString() ?? '-'} L</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expected Revenue</p>
            <p className="text-2xl font-medium text-gray-900">Rs {fleetForecast?.expectedRevenue?.toLocaleString() ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Driver Capacity</p>
            <p className={`text-2xl font-medium ${fleetForecast?.driverShortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {fleetForecast?.availableDrivers ?? '-'} / {fleetForecast?.requiredDrivers ?? '-'} needed
            </p>
          </div>
        </div>
        {fleetForecast?.driverShortfall > 0 && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md text-sm">
            Short by {fleetForecast.driverShortfall} driver(s) for expected demand tomorrow.
          </div>
        )}
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">
            {fleetForecast?.devicesDueForReorder?.length || 0} customer(s) likely to run out and order in the next day
          </p>
          {fleetForecast?.devicesDueForReorder?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {fleetForecast.devicesDueForReorder.slice(0, 12).map(d => (
                <span key={d.deviceId} className="text-xs px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                  {d.houseLabel || d.name} ({d.daysRemaining}d left)
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Consumption trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center"><FiTrendingUp className="mr-2 text-red-500" />High Consumption ({trends?.highConsumption?.length || 0})</h4>
          {(trends?.highConsumption || []).slice(0, 6).map(d => (
            <div key={d.deviceId} className="text-sm text-gray-600 py-1 border-b last:border-0">{d.houseLabel || d.name}: {d.avgDailyConsumptionLiters}L/day</div>
          ))}
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center"><FiTrendingDown className="mr-2 text-blue-500" />Low Consumption ({trends?.lowConsumption?.length || 0})</h4>
          {(trends?.lowConsumption || []).slice(0, 6).map(d => (
            <div key={d.deviceId} className="text-sm text-gray-600 py-1 border-b last:border-0">{d.houseLabel || d.name}: {d.avgDailyConsumptionLiters}L/day</div>
          ))}
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center"><FiActivity className="mr-2 text-purple-500" />Rapidly Changing ({trends?.rapidlyChanging?.length || 0})</h4>
          {(trends?.rapidlyChanging || []).slice(0, 6).map(d => (
            <div key={d.deviceId} className="text-sm text-gray-600 py-1 border-b last:border-0">{d.houseLabel || d.name}</div>
          ))}
        </div>
      </div>

      {/* Reports */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <select value={reportType} onChange={e => setReportType(e.target.value)} className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
            {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={downloadCsv} disabled={!report} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
            <FiDownload className="h-4 w-4 mr-2" /> Export CSV
          </button>
        </div>
        {reportLoading ? (
          <div className="py-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map(col => <th key={col} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{col}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(report?.rows || []).slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    {columns.map(col => <td key={col} className="px-4 py-2 text-sm text-gray-600">{String(row[col] ?? '')}</td>)}
                  </tr>
                ))}
                {(!report?.rows || report.rows.length === 0) && (
                  <tr><td colSpan={columns.length || 1} className="px-4 py-8 text-center text-gray-500">No data for this report.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForecastReports
