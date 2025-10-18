import React, { useState, useEffect, useCallback } from 'react'
import { userManagementAPI } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { useAuth } from '../hooks/useAuth'
import RealtimeIndicator from './RealtimeIndicator'
import { 
  FiSearch, 
  FiEdit2, 
  FiTrash2, 
  FiUserX, 
  FiUserCheck, 
  FiEye, 
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw
} from 'react-icons/fi'

const UserManagement = () => {
  const { user } = useAuth()
  const token = localStorage.getItem('token')
  const { socket, connected } = useSocket(token)
  
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [filters, setFilters] = useState({
    search: '',
    userType: '',
    status: '',
    page: 1,
    limit: 10
  })
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [statistics, setStatistics] = useState(null)

  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    fullName: '',
    houseNumber: '',
    portion: '',
    address: ''
  })
  const [blockReason, setBlockReason] = useState('')
  const [newUserType, setNewUserType] = useState('')

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await userManagementAPI.getUsers(filters)
      setUsers(response.data.users)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users')
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await userManagementAPI.getUserStatistics()
      setStatistics(response.data.statistics)
    } catch (err) {
      console.error('Error fetching statistics:', err)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchStatistics()
  }, [fetchUsers, fetchStatistics])

  // Socket event listeners
  useEffect(() => {
    if (socket && connected && user?.userType === 'admin') {
      // Join admin room for user updates
      socket.emit('join-admin-room')

      // Listen for user updates
      socket.on('user-update', (data) => {
        console.log('User update received:', data)
        
        switch (data.data.updateType) {
          case 'created':
            setUsers(prev => [data.data.user, ...prev])
            break
          case 'updated':
            setUsers(prev => prev.map(user => 
              user.id === data.data.user.id ? { ...user, ...data.data.user } : user
            ))
            break
          case 'blocked':
          case 'unblocked':
            setUsers(prev => prev.map(user => 
              user.id === data.data.user.id ? { ...user, status: data.data.user.status } : user
            ))
            break
          case 'deleted':
            setUsers(prev => prev.filter(user => user.id !== data.data.user.id))
            break
          default:
            break
        }
        
        // Refresh statistics after user updates
        fetchStatistics()
      })

      // Listen for system notifications
      socket.on('system-notification', (data) => {
        console.log('System notification:', data)
        // You can add a notification system here if needed
      })

      return () => {
        socket.off('user-update')
        socket.off('system-notification')
      }
    }
  }, [socket, connected, user?.userType, fetchStatistics])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1
    }))
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchUsers()
  }

  const handleUserAction = async (action, userId, additionalData = {}) => {
    try {
      setActionLoading(true)
      let response

      switch (action) {
        case 'block':
          response = await userManagementAPI.blockUser(userId, blockReason)
          break
        case 'unblock':
          response = await userManagementAPI.unblockUser(userId)
          break
        case 'delete':
          response = await userManagementAPI.deleteUser(userId)
          break
        case 'changeType':
          response = await userManagementAPI.changeUserType(userId, newUserType)
          break
        case 'update':
          response = await userManagementAPI.updateUser(userId, editForm)
          break
        default:
          throw new Error('Invalid action')
      }

      if (response.data.success) {
        await fetchUsers()
        await fetchStatistics()
        setShowUserModal(false)
        setShowEditModal(false)
        setShowBlockModal(false)
        setShowDeleteModal(false)
        setShowTypeModal(false)
        setSelectedUser(null)
        setBlockReason('')
        setNewUserType('')
        setEditForm({
          name: '',
          email: '',
          fullName: '',
          houseNumber: '',
          portion: '',
          address: ''
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} user`)
      console.error(`Error ${action}ing user:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  const openUserModal = (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      fullName: user.fullName || '',
      houseNumber: user.houseNumber || '',
      portion: user.portion || '',
      address: user.address || ''
    })
    setShowEditModal(true)
  }

  const openBlockModal = (user) => {
    setSelectedUser(user)
    setShowBlockModal(true)
  }

  const openDeleteModal = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const openTypeModal = (user) => {
    setSelectedUser(user)
    setNewUserType(user.userType)
    setShowTypeModal(true)
  }

  const getStatusBadge = (status) => {
    return status === 'active' 
      ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Blocked
        </span>
  }

  const getUserTypeBadge = (userType) => {
    const colors = {
      customer: 'bg-blue-100 text-blue-800',
      driver: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[userType] || 'bg-gray-100 text-gray-800'}`}>
        {userType?.charAt(0).toUpperCase() + userType?.slice(1)}
      </span>
    )
  }

  const renderStatistics = () => {
    if (!statistics) return null

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiUserCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiUserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <FiUserX className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Blocked Users</p>
              <p className="text-2xl font-bold text-gray-900">{statistics.blockedUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FiUserCheck className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {statistics.userTypeBreakdown?.find(u => u._id === 'admin')?.count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderUserModal = () => {
    if (!selectedUser) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">User Details</h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiUserX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedUser.fullName || 'N/A'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">User Type</label>
                <div className="mt-1">{getUserTypeBadge(selectedUser.userType)}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
              </div>
              
              {selectedUser.houseNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">House Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.houseNumber}</p>
                </div>
              )}
              
              {selectedUser.portion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Portion</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedUser.portion}</p>
                </div>
              )}
              
              {selectedUser.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.address}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
              
              {selectedUser.blockedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Blocked At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedUser.blockedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              
              {selectedUser.blockedReason && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Block Reason</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.blockedReason}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowUserModal(false)
                  openEditModal(selectedUser)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Edit User
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderEditModal = () => {
    if (!selectedUser) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiUserX className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault()
              handleUserAction('update', selectedUser.id)
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">House Number</label>
                  <input
                    type="text"
                    value={editForm.houseNumber}
                    onChange={(e) => setEditForm(prev => ({ ...prev, houseNumber: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Portion</label>
                  <select
                    value={editForm.portion}
                    onChange={(e) => setEditForm(prev => ({ ...prev, portion: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select portion</option>
                    <option value="upper">Upper</option>
                    <option value="lower">Lower</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Updating...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const renderBlockModal = () => {
    if (!selectedUser) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedUser.status === 'active' ? 'Block User' : 'Unblock User'}
              </h3>
              <button
                onClick={() => setShowBlockModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiUserX className="w-6 h-6" />
              </button>
            </div>
            
            {selectedUser.status === 'active' ? (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to block <strong>{selectedUser.name}</strong>?
                </p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reason for blocking</label>
                  <textarea
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter reason for blocking this user..."
                    required
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to unblock <strong>{selectedUser.name}</strong>?
              </p>
            )}
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUserAction(
                  selectedUser.status === 'active' ? 'block' : 'unblock',
                  selectedUser.id
                )}
                disabled={actionLoading || (selectedUser.status === 'active' && !blockReason.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                  selectedUser.status === 'active' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {actionLoading 
                  ? (selectedUser.status === 'active' ? 'Blocking...' : 'Unblocking...') 
                  : (selectedUser.status === 'active' ? 'Block User' : 'Unblock User')
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDeleteModal = () => {
    if (!selectedUser) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete User</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiUserX className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <FiTrash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Delete User
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to delete <strong>{selectedUser.name}</strong>? 
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUserAction('delete', selectedUser.id)}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderTypeModal = () => {
    if (!selectedUser) return null

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Change User Type</h3>
              <button
                onClick={() => setShowTypeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiUserX className="w-6 h-6" />
              </button>
            </div>
            
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Change user type for <strong>{selectedUser.name}</strong>
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700">New User Type</label>
                <select
                  value={newUserType}
                  onChange={(e) => setNewUserType(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowTypeModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUserAction('changeType', selectedUser.id)}
                disabled={actionLoading || newUserType === selectedUser.userType}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Changing...' : 'Change Type'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {renderStatistics()}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex-1 max-w-lg">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users by name, email, or full name..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </form>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <select
              value={filters.userType}
              onChange={(e) => handleFilterChange('userType', e.target.value)}
              className="block w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="customer">Customer</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
            
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="block w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
            
            <select
              value={filters.limit}
              onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
              className="block w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            
            <button
              onClick={fetchUsers}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FiRefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiUserX className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Users ({pagination.totalUsers})
            </h3>
            <RealtimeIndicator connected={connected} />
          </div>
        </div>
        
        {users.length === 0 ? (
          <div className="text-center py-12">
            <FiUserX className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.userType || filters.status 
                ? 'Try adjusting your search or filter criteria.'
                : 'No users have been created yet.'
              }
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <div className="ml-2 flex space-x-1">
                          {getUserTypeBadge(user.userType)}
                          {getStatusBadge(user.status)}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      {user.fullName && (
                        <p className="text-sm text-gray-500">{user.fullName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openUserModal(user)}
                      className="text-gray-400 hover:text-gray-600"
                      title="View Details"
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(user)}
                      className="text-blue-400 hover:text-blue-600"
                      title="Edit User"
                    >
                      <FiEdit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openTypeModal(user)}
                      className="text-purple-400 hover:text-purple-600"
                      title="Change Type"
                    >
                      <FiUserCheck className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openBlockModal(user)}
                      className={user.status === 'active' 
                        ? "text-red-400 hover:text-red-600" 
                        : "text-green-400 hover:text-green-600"
                      }
                      title={user.status === 'active' ? "Block User" : "Unblock User"}
                    >
                      {user.status === 'active' ? (
                        <FiUserX className="h-5 w-5" />
                      ) : (
                        <FiUserCheck className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => openDeleteModal(user)}
                      className="text-red-400 hover:text-red-600"
                      title="Delete User"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {((pagination.currentPage - 1) * filters.limit) + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.currentPage * filters.limit, pagination.totalUsers)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalUsers}</span>{' '}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => handleFilterChange('page', pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronLeft className="h-5 w-5" />
                </button>
                
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = i + 1
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handleFilterChange('page', pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === pagination.currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                
                <button
                  onClick={() => handleFilterChange('page', pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showUserModal && renderUserModal()}
      {showEditModal && renderEditModal()}
      {showBlockModal && renderBlockModal()}
      {showDeleteModal && renderDeleteModal()}
      {showTypeModal && renderTypeModal()}
    </div>
  )
}

export default UserManagement
