import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import Button from './Button'

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    fullName: user?.fullName || '',
    houseNumber: user?.houseNumber || '',
    portion: user?.portion || 'upper',
    address: user?.address || ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleSaveProfile = async () => {
    try {
      setLoading(true)
      const result = await updateProfile(formData)
      if (result.success) {
        setIsEditing(false)
        setErrors({})
      } else {
        setErrors({ general: result.error })
      }
    } catch (error) {
      setErrors({ general: 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' })
      return
    }

    try {
      setLoading(true)
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword)
      if (result.success) {
        setIsChangingPassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setErrors({})
      } else {
        setErrors({ password: result.error })
      }
    } catch (error) {
      setErrors({ password: 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Information</h3>
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>

          {errors.general && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`mt-1 block w-full px-3 py-2 border ${
                  isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm sm:text-sm text-gray-500"
              />
            </div>

            {user?.userType === 'customer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">House Number</label>
                  <input
                    type="text"
                    name="houseNumber"
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Portion</label>
                  <select
                    name="portion"
                    value={formData.portion}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  >
                    <option value="upper">Upper</option>
                    <option value="lower">Lower</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    name="address"
                    rows={3}
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'
                    } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">User Type</label>
              <input
                type="text"
                value={user?.userType?.charAt(0).toUpperCase() + user?.userType?.slice(1) || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm sm:text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Member Since</label>
              <input
                type="text"
                value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md shadow-sm sm:text-sm text-gray-500"
              />
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                loading={loading}
                disabled={loading}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Change Password</h3>
            <Button
              variant="outline"
              size="small"
              onClick={() => setIsChangingPassword(!isChangingPassword)}
            >
              {isChangingPassword ? 'Cancel' : 'Change Password'}
            </Button>
          </div>

          {isChangingPassword && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {errors.password && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                  {errors.password}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsChangingPassword(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  loading={loading}
                  disabled={loading}
                >
                  Change Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Profile
