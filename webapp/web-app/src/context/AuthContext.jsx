import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

export const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  const validateToken = useCallback(async () => {
    try {
      const response = await authAPI.getProfile()
      if (response.data.success) {
        setUser(response.data.user)
        localStorage.setItem('user', JSON.stringify(response.data.user))
      } else {
        // Token is invalid, clear auth data
        logout()
      }
    } catch (error) {
      console.error('Token validation failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Check if there's a stored token on app load
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
      // Validate token with server
      validateToken()
    } else {
      setLoading(false)
    }
  }, [validateToken])

  const register = async (userData) => {
    try {
      setLoading(true)
      const response = await authAPI.register(userData)
      
      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data
        setToken(newToken)
        setUser(newUser)
        localStorage.setItem('token', newToken)
        localStorage.setItem('user', JSON.stringify(newUser))
        return { success: true, user: newUser }
      } else {
        return { success: false, error: response.data.message || 'Registration failed' }
      }
    } catch (error) {
      console.error('Registration error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      setLoading(true)
      const response = await authAPI.login({ email, password })
      
      if (response.data.success) {
        const { token: newToken, user: newUser } = response.data
        if(newUser.userType === 'admin'){
            setToken(newToken)
            setUser(newUser)
            localStorage.setItem('token', newToken)
            localStorage.setItem('user', JSON.stringify(newUser))
            return { success: true, user: newUser }
        }
        else
        {
            return { success: false, error: 'Only Admin Can Login' }
        }
      } else {
        return { success: false, error: response.data.message || 'Login failed' }
      }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Login failed'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const updateProfile = async (userData) => {
    try {
      setLoading(true)
      const response = await authAPI.updateProfile(userData)
      
      if (response.data.success) {
        setUser(response.data.user)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        return { success: true, user: response.data.user }
      } else {
        return { success: false, error: response.data.message || 'Profile update failed' }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Profile update failed'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true)
      const response = await authAPI.changePassword({ currentPassword, newPassword })
      
      if (response.data.success) {
        return { success: true, message: response.data.message }
      } else {
        return { success: false, error: response.data.message || 'Password change failed' }
      }
    } catch (error) {
      console.error('Password change error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Password change failed'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const isAuthenticated = !!token && !!user
  const isAdmin = user?.userType === 'admin'
  const isDriver = user?.userType === 'driver'
  const isCustomer = user?.userType === 'customer'

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isDriver,
    isCustomer,
    loading,
    register,
    login,
    logout,
    updateProfile,
    changePassword
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
