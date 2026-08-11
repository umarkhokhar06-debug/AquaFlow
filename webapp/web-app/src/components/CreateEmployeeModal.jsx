import React, { useState } from 'react'
import { employeeAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { FiX } from 'react-icons/fi'

const ROLE_OPTIONS = [
  { value: 'driver', label: 'Driver' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'call_center_agent', label: 'Call Center Agent' },
  { value: 'technician', label: 'Technician' },
  { value: 'admin', label: 'Admin' }
]

const emptyForm = {
  name: '', email: '', password: '', phoneNumber: '', userType: 'driver',
  cnic: '', licenseNumber: '', dateOfBirth: '',
  emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  vehicleType: 'truck', vehicleNumber: '', licensePlate: ''
}

const CreateEmployeeModal = ({ onClose, onCreated }) => {
  const { user } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isSuperAdmin = user?.userType === 'super_admin'
  const roleOptions = isSuperAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter(r => r.value !== 'admin')

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        phoneNumber: form.phoneNumber,
        userType: form.userType
      }
      if (form.userType === 'driver') {
        payload.cnic = form.cnic
        payload.licenseNumber = form.licenseNumber
        payload.dateOfBirth = form.dateOfBirth || undefined
        payload.emergencyContact = {
          name: form.emergencyContactName,
          phone: form.emergencyContactPhone,
          relation: form.emergencyContactRelation
        }
        payload.vehicleInfo = {
          vehicleType: form.vehicleType,
          vehicleNumber: form.vehicleNumber,
          licensePlate: form.licensePlate
        }
      }
      const res = await employeeAPI.createEmployee(payload)
      if (res.data.success) {
        onCreated(res.data.user)
        onClose()
      } else {
        setError(res.data.message || 'Failed to create employee')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create employee')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Create User</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={form.userType} onChange={update('userType')} className={inputClass}>
              {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input type="text" value={form.name} onChange={update('name')} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone</label>
              <input type="text" value={form.phoneNumber} onChange={update('phoneNumber')} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (login)</label>
              <input type="email" value={form.email} onChange={update('email')} className={inputClass} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input type="text" value={form.password} onChange={update('password')} className={inputClass} required minLength={6} />
            </div>
          </div>

          {form.userType === 'driver' && (
            <>
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Driver Onboarding Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">CNIC</label>
                    <input type="text" value={form.cnic} onChange={update('cnic')} className={inputClass} placeholder="XXXXX-XXXXXXX-X" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <input type="text" value={form.licenseNumber} onChange={update('licenseNumber')} className={inputClass} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} className={inputClass} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" value={form.emergencyContactName} onChange={update('emergencyContactName')} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="text" value={form.emergencyContactPhone} onChange={update('emergencyContactPhone')} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Relation</label>
                    <input type="text" value={form.emergencyContactRelation} onChange={update('emergencyContactRelation')} className={inputClass} placeholder="e.g. Spouse" />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Vehicle (optional -- can also assign a truck later under Fleet)</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <select value={form.vehicleType} onChange={update('vehicleType')} className={inputClass}>
                      <option value="truck">Truck</option>
                      <option value="van">Van</option>
                      <option value="motorcycle">Motorcycle</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle #</label>
                    <input type="text" value={form.vehicleNumber} onChange={update('vehicleNumber')} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plate</label>
                    <input type="text" value={form.licensePlate} onChange={update('licensePlate')} className={inputClass} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateEmployeeModal
