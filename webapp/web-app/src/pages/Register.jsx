import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/Button'

const Register = () => {
  const [formData, setFormData] = useState({
    userType: 'customer',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Customer specific fields
    fullName: '',
    houseNumber: '',
    portion: 'upper',
    address: ''
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    // Common validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }
    
    // Customer specific validation
    if (formData.userType === 'customer') {
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required'
      }
      if (!formData.houseNumber.trim()) {
        newErrors.houseNumber = 'House number is required'
      }
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // Prepare data based on user type
      const userData = {
        userType: formData.userType,
        name: formData.name,
        email: formData.email,
        password: formData.password
      }
      
      // Add customer specific fields
      if (formData.userType === 'customer') {
        userData.fullName = formData.fullName
        userData.houseNumber = formData.houseNumber
        userData.portion = formData.portion
        userData.address = formData.address
      }
      
      const result = await register(userData)
      
      if (result.success) {
        // Redirect based on user type
        if (result.user.userType === 'admin') {
          navigate('/admin-dashboard')
        } else {
          navigate('/dashboard')
        }
      } else {
        setErrors({ general: result.error || 'Registration failed' })
      }
    } catch (error) {
      setErrors({ general: 'An unexpected error occurred' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {errors.general}
              </div>
            )}
            
            {/* User Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <div className="space-y-2">
                {[
                  { value: 'customer', label: 'Customer', description: 'Order water deliveries' },
                  { value: 'driver', label: 'Driver', description: 'Deliver water orders' },
                  { value: 'admin', label: 'Admin', description: 'Manage the system' }
                ].map((type) => (
                  <label key={type.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="userType"
                      value={type.value}
                      checked={formData.userType === type.value}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter your name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Enter your password"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Customer Specific Fields */}
            {formData.userType === 'customer' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.fullName ? 'border-red-300' : 'border-gray-300'
                      } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Enter your full name"
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="houseNumber" className="block text-sm font-medium text-gray-700">
                      House Number
                    </label>
                    <div className="mt-1">
                      <input
                        id="houseNumber"
                        name="houseNumber"
                        type="text"
                        value={formData.houseNumber}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          errors.houseNumber ? 'border-red-300' : 'border-gray-300'
                        } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                        placeholder="123"
                      />
                      {errors.houseNumber && (
                        <p className="mt-1 text-sm text-red-600">{errors.houseNumber}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="portion" className="block text-sm font-medium text-gray-700">
                      Portion
                    </label>
                    <div className="mt-1">
                      <select
                        id="portion"
                        name="portion"
                        value={formData.portion}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      >
                        <option value="upper">Upper</option>
                        <option value="lower">Lower</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleChange}
                      className={`appearance-none block w-full px-3 py-2 border ${
                        errors.address ? 'border-red-300' : 'border-gray-300'
                      } rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      placeholder="Enter your full address"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center"
                loading={isLoading}
                disabled={isLoading}
              >
                Create Account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register
