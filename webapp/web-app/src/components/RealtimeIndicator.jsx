import React from 'react'
import { FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi'

const RealtimeIndicator = ({ connected, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-center text-gray-500">
        <FiRefreshCw className="w-4 h-4 mr-1 animate-spin" />
        <span className="text-sm">Connecting...</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center ${connected ? 'text-green-600' : 'text-red-600'}`}>
      {connected ? (
        <>
          <FiWifi className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Live Updates</span>
        </>
      ) : (
        <>
          <FiWifiOff className="w-4 h-4 mr-1" />
          <span className="text-sm font-medium">Offline</span>
        </>
      )}
    </div>
  )
}

export default RealtimeIndicator

