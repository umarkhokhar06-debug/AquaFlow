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

// Generic API calls
export const apiCall = {
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
}

export default api
