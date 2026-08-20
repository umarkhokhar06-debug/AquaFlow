import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  timeout: 30000, // Increased to 30 seconds to handle Vercel cold starts
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== '/auth/login'
    ) {
      // Token expired or invalid, clear auth data
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    // For login errors, just reject and let UI handle
    return Promise.reject(error)
  }
)

// Auth API calls
export const authAPI = {
  // Register user with different user types
  register: (userData) => api.post('/auth/register', userData),
  
  // Login user
  login: (credentials) => api.post('/auth/login', credentials),
  
  // Get user profile
  getProfile: () => api.get('/auth/profile'),
  
  // Update user profile
  updateProfile: (userData) => api.put('/auth/profile', userData),
  
  // Change password
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),
  
  // Logout (client-side only, server doesn't need to be called)
  logout: () => Promise.resolve({ success: true })
}

// Admin User Management API calls
export const userManagementAPI = {
  // Get all users with pagination and filters
  getUsers: (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key])
      }
    })
    return api.get(`/admin/users?${queryParams.toString()}`)
  },

  // Get user by ID
  getUser: (userId) => api.get(`/admin/users/${userId}`),

  // Update user
  updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),

  // Block user
  blockUser: (userId, reason) => api.put(`/admin/users/${userId}/block`, { reason }),

  // Unblock user
  unblockUser: (userId) => api.put(`/admin/users/${userId}/unblock`),

  // Change user type
  changeUserType: (userId, userType) => api.put(`/admin/users/${userId}/change-type`, { userType }),

  // Delete user
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

  // Get user statistics
  getUserStatistics: () => api.get('/admin/users/statistics'),

  // Search users
  searchUsers: (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key])
      }
    })
    return api.get(`/admin/users/search?${queryParams.toString()}`)
  }
}

// Order Management API calls
export const orderManagementAPI = {
  // Get available products
  getProducts: () => api.get('/orders/products'),

  // Create new order (Customer only)
  createOrder: (orderData) => api.post('/orders', orderData),

  // Get order by ID
  getOrder: (orderId) => api.get(`/orders/${orderId}`),

  // Get customer orders
  getMyOrders: () => api.get('/orders/my-orders'),

  // Get all orders (Driver and Admin only)
  getAllOrders: (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key])
      }
    })
    return api.get(`/orders?${queryParams.toString()}`)
  },

  // Update order status (Driver and Admin only)
  updateOrderStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),

  // Assign driver to order (Admin only)
  assignDriver: (orderId, driverId) => api.put(`/orders/${orderId}/assign-driver`, { driverId }),

  // Cancel order
  cancelOrder: (orderId) => api.put(`/orders/${orderId}/cancel`),

  // Get order statistics (Admin only)
  getOrderStatistics: () => api.get('/orders/admin/statistics')
}

// Driver Management API calls
export const driverManagementAPI = {
  // Get all drivers with pagination and filters (Admin only)
  getDrivers: (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key])
      }
    })
    return api.get(`/drivers?${queryParams.toString()}`)
  },

  // Get driver by ID (Admin only)
  getDriver: (driverId) => api.get(`/drivers/${driverId}`),

  // Update driver status (Admin only)
  updateDriverStatus: (driverId, status, location) => api.put(`/drivers/${driverId}/status`, { status, location }),

  // Assign order to driver (Admin only)
  assignOrderToDriver: (driverId, orderId) => api.put(`/drivers/${driverId}/assign/${orderId}`),

  // Complete current order (Driver only)
  completeOrder: (driverId) => api.put(`/drivers/${driverId}/complete-order`),

  // Reorder driver queue (Admin only)
  reorderDriverQueue: (driverId, queueOrder) => api.put(`/drivers/${driverId}/queue/reorder`, { queueOrder }),

  // Remove order from driver queue (Admin only)
  removeOrderFromQueue: (driverId, orderId) => api.delete(`/drivers/${driverId}/queue/${orderId}`),

  // Update driver location (Admin and Driver)
  updateDriverLocation: (driverId, latitude, longitude) => api.put(`/drivers/${driverId}/location`, { latitude, longitude }),

  // Get driver statistics (Admin only)
  getDriverStatistics: () => api.get('/drivers/statistics'),

  // Search drivers (Admin only)
  searchDrivers: (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key])
      }
    })
    return api.get(`/drivers/search?${queryParams.toString()}`)
  }
}

// Device Management API calls
export const deviceManagementAPI = {
  // Get all devices across all houses (Admin only)
  getDevices: (params = {}) => {
    const queryParams = new URLSearchParams()
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        queryParams.append(key, params[key])
      }
    })
    return api.get(`/devices?${queryParams.toString()}`)
  },

  // Register a new device and assign it to a house/owner (Admin only)
  createDevice: (deviceData) => api.post('/devices', deviceData),

  // Update device details / reassign owner / recalibrate (Admin only)
  updateDevice: (deviceMongoId, updates) => api.put(`/devices/${deviceMongoId}`, updates),

  // Remove a device (Admin only)
  deleteDevice: (deviceMongoId) => api.delete(`/devices/${deviceMongoId}`),

  // Grant a tenant read access to a device (Owner or Admin)
  addTenant: (deviceMongoId, email) => api.post(`/devices/${deviceMongoId}/tenants`, { email }),

  // Revoke a tenant's access (Owner or Admin)
  removeTenant: (deviceMongoId, userId) => api.delete(`/devices/${deviceMongoId}/tenants/${userId}`),

  // Latest reading for a device
  getLatestReading: (deviceId) => api.get(`/iot/${deviceId}/latest`)
}

// Employee/driver creation (Admin only) -- separate from userManagementAPI
// since it's a create-only concern with its own onboarding fields.
export const employeeAPI = {
  createEmployee: (data) => api.post('/admin/users', data)
}

// Fleet & Truck Management (Admin only)
export const truckAPI = {
  getTrucks: (params = {}) => {
    const q = new URLSearchParams()
    Object.keys(params).forEach(k => params[k] !== undefined && params[k] !== '' && q.append(k, params[k]))
    return api.get(`/admin/trucks?${q.toString()}`)
  },
  getTruck: (id) => api.get(`/admin/trucks/${id}`),
  createTruck: (data) => api.post('/admin/trucks', data),
  updateTruck: (id, data) => api.put(`/admin/trucks/${id}`, data),
  deleteTruck: (id) => api.delete(`/admin/trucks/${id}`),
  assignDriver: (id, driverId) => api.put(`/admin/trucks/${id}/assign-driver`, { driverId }),
  unassignDriver: (id) => api.put(`/admin/trucks/${id}/unassign-driver`),
  addMaintenanceRecord: (id, data) => api.post(`/admin/trucks/${id}/maintenance`, data),
  getUtilization: (id, params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/trucks/${id}/utilization?${q.toString()}`)
  },
  getUtilizationReport: () => api.get('/admin/trucks/utilization-report')
}

// Dispatch console (Admin/Dispatcher)
export const dispatchAPI = {
  getQueue: () => api.get('/dispatch/queue'),
  getLiveMap: () => api.get('/dispatch/map'),
  getMetrics: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/dispatch/metrics?${q.toString()}`)
  },
  recommendDrivers: (orderId) => api.get(`/dispatch/orders/${orderId}/recommend`),
  assignOrder: (orderId, driverId) => api.put(`/dispatch/orders/${orderId}/assign`, { driverId })
}

// Forecast & consumption trends (Admin/Dispatcher)
export const forecastAPI = {
  getDeviceForecast: (deviceId) => api.get(`/forecast/devices/${deviceId}`),
  getConsumptionTrends: () => api.get('/forecast/trends'),
  getFleetForecast: () => api.get('/forecast/fleet'),
  runNightlyScan: () => api.post('/forecast/run-nightly-scan')
}

// Finance & Revenue (Admin only)
export const financeAPI = {
  getDashboard: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/finance/dashboard?${q.toString()}`)
  },
  getRevenue: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/finance/revenue?${q.toString()}`)
  },
  getSalaries: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/finance/salaries?${q.toString()}`)
  },
  getProfitLoss: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/finance/profit-loss?${q.toString()}`)
  },
  addExpense: (data) => api.post('/admin/finance/expenses', data),
  getExpenses: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/finance/expenses?${q.toString()}`)
  },
  deleteExpense: (id) => api.delete(`/admin/finance/expenses/${id}`)
}

// Promo Codes (Admin only)
export const promoAPI = {
  getPromoCodes: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/promo-codes?${q.toString()}`)
  },
  getPromoCode: (id) => api.get(`/promo-codes/${id}`),
  createPromoCode: (data) => api.post('/promo-codes', data),
  updatePromoCode: (id, data) => api.put(`/promo-codes/${id}`, data),
  deletePromoCode: (id) => api.delete(`/promo-codes/${id}`),
  getUsageReport: (id) => api.get(`/promo-codes/${id}/usage`)
}

// Support / Complaints & AI (Admin, super_admin, call_center_agent, technician)
export const supportAPI = {
  getTickets: (params = {}) => {
    const q = new URLSearchParams()
    Object.keys(params).forEach(k => params[k] !== undefined && params[k] !== '' && q.append(k, params[k]))
    return api.get(`/support/tickets?${q.toString()}`)
  },
  getMyTickets: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/support/tickets/my?${q.toString()}`)
  },
  getTicket: (id) => api.get(`/support/tickets/${id}`),
  createTicket: (data) => api.post('/support/tickets', data),
  addMessage: (id, message, isInternal = false) => api.post(`/support/tickets/${id}/messages`, { message, isInternal }),
  updateStatus: (id, status) => api.put(`/support/tickets/${id}/status`, { status }),
  resolveTicket: (id, resolution) => api.put(`/support/tickets/${id}/resolve`, { resolution }),
  assignTicket: (id, assignedTo) => api.put(`/support/tickets/${id}/assign`, { assignedTo }),
  assignTechnician: (id) => api.put(`/support/tickets/${id}/assign-technician`),
  getStats: () => api.get('/support/stats'),
  getFAQs: () => api.get('/support/faqs'),
  search: (q) => api.get(`/support/search?q=${encodeURIComponent(q)}`),
  troubleshoot: (context) => api.post('/support/ai/troubleshoot', { context }),
  parseOrderIntent: (description) => api.post('/support/ai/order-intent', { description }),
  placeOrderForCustomer: (data) => api.post('/support/ai/place-order', data)
}

// Payments (Admin only -- transaction ledger view)
export const paymentAPI = {
  getTransactions: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/payments/transactions?${q.toString()}`)
  },
  getPaymentStatus: (orderId) => api.get(`/payments/${orderId}`)
}

// Reports (Admin/Dispatcher -- payment-methods & driver-performance are
// admin-only server-side, SRS §17)
export const reportAPI = {
  getDashboard: (params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/reports/dashboard?${q.toString()}`)
  },
  getDeviceCapacityInsights: () => api.get('/admin/reports/device-capacity'),
  getReport: (type, params = {}) => {
    const q = new URLSearchParams(params)
    return api.get(`/admin/reports/${type}?${q.toString()}`)
  },
  downloadReport: (type, format, params = {}) => {
    const q = new URLSearchParams({ ...params, format })
    return api.get(`/admin/reports/${type}?${q.toString()}`, { responseType: 'blob' })
  }
}

// Generic API calls
export const apiCall = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
}

export default api
