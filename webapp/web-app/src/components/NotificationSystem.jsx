import React, { useState, useEffect } from 'react'
import { FiX, FiCheckCircle, FiAlertCircle, FiInfo, FiAlertTriangle } from 'react-icons/fi'

const NotificationSystem = ({ notifications, onRemoveNotification }) => {
  const [visibleNotifications, setVisibleNotifications] = useState([])

  useEffect(() => {
    setVisibleNotifications(notifications)
  }, [notifications])

  const removeNotification = (id) => {
    setVisibleNotifications(prev => prev.filter(notif => notif.id !== id))
    onRemoveNotification(id)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-green-400" />
      case 'error':
        return <FiAlertCircle className="w-5 h-5 text-red-400" />
      case 'warning':
        return <FiAlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'info':
      default:
        return <FiInfo className="w-5 h-5 text-blue-400" />
    }
  }

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  if (visibleNotifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleNotifications.map((notification) => (
        <div
          key={notification.id}
          className={`relative flex items-start p-4 rounded-lg border shadow-lg transition-all duration-300 ${getNotificationStyles(notification.type)}`}
        >
          <div className="flex-shrink-0">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
            {notification.timestamp && (
              <p className="text-xs opacity-75 mt-1">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default NotificationSystem

