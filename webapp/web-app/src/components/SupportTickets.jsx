import React, { useState, useEffect, useCallback } from 'react'
import { supportAPI } from '../services/api'
import { useAuth } from '../hooks/useAuth'
import { FiSearch, FiRefreshCw, FiMessageSquare, FiCheckCircle, FiTool, FiCpu, FiX } from 'react-icons/fi'

const STATUS_COLORS = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800'
}

const SupportTickets = () => {
  const { user } = useAuth()
  const canManage = ['admin', 'super_admin', 'call_center_agent'].includes(user?.userType)

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [newMessage, setNewMessage] = useState('')
  const [resolution, setResolution] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const [aiContext, setAiContext] = useState('')
  const [aiGuidance, setAiGuidance] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [showAiPanel, setShowAiPanel] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await supportAPI.getTickets({ status: statusFilter || undefined, limit: 50 })
      setTickets(res.data.tickets || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const openTicket = async (ticket) => {
    try {
      const res = await supportAPI.getTicket(ticket._id)
      setSelectedTicket(res.data.ticket)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load ticket')
    }
  }

  const handleAddMessage = async (e) => {
    e.preventDefault()
    if (!selectedTicket || !newMessage.trim()) return
    setActionLoading(true)
    try {
      const res = await supportAPI.addMessage(selectedTicket._id, newMessage)
      setSelectedTicket(res.data.ticket)
      setNewMessage('')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResolve = async (e) => {
    e.preventDefault()
    if (!selectedTicket) return
    setActionLoading(true)
    try {
      const res = await supportAPI.resolveTicket(selectedTicket._id, resolution)
      setSelectedTicket(res.data.ticket)
      setResolution('')
      fetchTickets()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve ticket')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssignTechnician = async () => {
    if (!selectedTicket) return
    setActionLoading(true)
    try {
      const res = await supportAPI.assignTechnician(selectedTicket._id)
      setSelectedTicket(res.data.ticket)
      fetchTickets()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign technician')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAssignToMe = async () => {
    if (!selectedTicket) return
    setActionLoading(true)
    try {
      const res = await supportAPI.assignTicket(selectedTicket._id, user.id)
      setSelectedTicket(res.data.ticket)
      fetchTickets()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign ticket')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await supportAPI.search(searchQuery)
      setSearchResults(res.data.results)
    } catch (err) {
      alert(err.response?.data?.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleTroubleshoot = async (e) => {
    e.preventDefault()
    if (!aiContext.trim()) return
    setAiLoading(true)
    setAiGuidance(null)
    try {
      const res = await supportAPI.troubleshoot(aiContext)
      setAiGuidance(res.data.guidance)
    } catch (err) {
      setAiGuidance({ error: err.response?.data?.message || 'AI troubleshooting failed' })
    } finally {
      setAiLoading(false)
    }
  }

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

      {/* Global search (staff only) */}
      {canManage && (
        <div className="bg-white p-4 rounded-lg shadow">
          <form onSubmit={handleSearch} className="flex space-x-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customers, devices, orders, complaints..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <button type="submit" disabled={searching} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {searching ? 'Searching...' : 'Search'}
            </button>
            <button type="button" onClick={() => setShowAiPanel(true)} className="inline-flex items-center px-4 py-2 border border-purple-300 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-50">
              <FiCpu className="mr-2" /> AI Troubleshoot
            </button>
          </form>

          {searchResults && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-gray-700 mb-1">Customers ({searchResults.customers.length})</h5>
                {searchResults.customers.map(c => <div key={c._id} className="text-gray-600 py-0.5">{c.name} - {c.email}</div>)}
              </div>
              <div>
                <h5 className="font-medium text-gray-700 mb-1">Devices ({searchResults.devices.length})</h5>
                {searchResults.devices.map(d => <div key={d._id} className="text-gray-600 py-0.5">{d.deviceId} ({d.status})</div>)}
              </div>
              <div>
                <h5 className="font-medium text-gray-700 mb-1">Orders ({searchResults.orders.length})</h5>
                {searchResults.orders.map(o => <div key={o._id} className="text-gray-600 py-0.5">{o.orderNumber} - {o.status}</div>)}
              </div>
              <div>
                <h5 className="font-medium text-gray-700 mb-1">Complaints ({searchResults.complaints.length})</h5>
                {searchResults.complaints.map(t => (
                  <button key={t._id} onClick={() => openTicket(t)} className="block text-blue-600 hover:underline py-0.5 text-left">
                    {t.ticketNumber}: {t.subject}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ticket list */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {user?.userType === 'technician' ? 'My Assigned Tickets' : 'Complaints & Support Tickets'} ({tickets.length})
          </h3>
          <div className="flex space-x-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border-gray-300 rounded-md text-sm">
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <button onClick={fetchTickets} className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <FiRefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticket</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tickets.map(t => (
              <tr key={t._id} onClick={() => openTicket(t)} className="cursor-pointer hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{t.ticketNumber}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{t.subject}</td>
                <td className="px-6 py-3 text-sm text-gray-500 capitalize">{t.category}</td>
                <td className="px-6 py-3 text-sm text-gray-500 capitalize">{t.priority}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-500">{t.assignedTo?.name || '-'}</td>
              </tr>
            ))}
            {tickets.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No tickets found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket detail modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{selectedTicket.ticketNumber}: {selectedTicket.subject}</h3>
                <p className="text-sm text-gray-500">{selectedTicket.user?.name} &middot; {selectedTicket.category} &middot; {selectedTicket.priority} priority</p>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
            </div>

            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md mb-4">{selectedTicket.description}</p>

            <div className="mb-4">
              <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[selectedTicket.status]}`}>{selectedTicket.status}</span>
              {selectedTicket.assignedTo && <span className="ml-2 text-xs text-gray-500">Assigned to {selectedTicket.assignedTo.name}</span>}
            </div>

            <div className="max-h-48 overflow-y-auto border rounded-md p-3 mb-4 space-y-2">
              {(selectedTicket.messages || []).map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-gray-700">{m.sender?.name || 'User'}:</span>{' '}
                  <span className="text-gray-600">{m.message}</span>
                </div>
              ))}
              {(!selectedTicket.messages || selectedTicket.messages.length === 0) && (
                <p className="text-sm text-gray-400">No messages yet.</p>
              )}
            </div>

            <form onSubmit={handleAddMessage} className="flex space-x-2 mb-4">
              <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Add a message..." className="flex-1 border-gray-300 rounded-md text-sm" />
              <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-gray-100 rounded-md text-sm font-medium hover:bg-gray-200">
                <FiMessageSquare className="inline h-4 w-4" />
              </button>
            </form>

            {canManage && selectedTicket.status !== 'resolved' && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex space-x-2">
                  {!selectedTicket.assignedTo && (
                    <button onClick={handleAssignToMe} disabled={actionLoading} className="px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100">
                      Assign to me
                    </button>
                  )}
                  <button onClick={handleAssignTechnician} disabled={actionLoading} className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100">
                    <FiTool className="mr-1 h-4 w-4" /> Assign Technician
                  </button>
                </div>
                <form onSubmit={handleResolve} className="flex space-x-2">
                  <input type="text" required value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution notes..." className="flex-1 border-gray-300 rounded-md text-sm" />
                  <button type="submit" disabled={actionLoading} className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                    <FiCheckCircle className="mr-1 h-4 w-4" /> Resolve
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI troubleshoot panel */}
      {showAiPanel && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center"><FiCpu className="mr-2 text-purple-600" />AI Troubleshooting Assistant</h3>
              <button onClick={() => { setShowAiPanel(false); setAiGuidance(null); setAiContext('') }} className="text-gray-400 hover:text-gray-600"><FiX className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleTroubleshoot} className="space-y-3">
              <textarea
                rows={4}
                value={aiContext}
                onChange={e => setAiContext(e.target.value)}
                placeholder="Describe the customer's issue, e.g. 'Customer says tank sensor has shown 80% for 3 days straight'"
                className="w-full border-gray-300 rounded-md text-sm"
              />
              <button type="submit" disabled={aiLoading} className="w-full px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                {aiLoading ? 'Thinking...' : 'Get Guidance'}
              </button>
            </form>
            {aiGuidance && (
              <div className="mt-4 border-t pt-4">
                {aiGuidance.error ? (
                  <p className="text-sm text-red-600">{aiGuidance.error}</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p><strong>Summary:</strong> {aiGuidance.summary}</p>
                    <div>
                      <strong>Steps:</strong>
                      <ol className="list-decimal list-inside text-gray-600 mt-1">
                        {aiGuidance.suggestedSteps?.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                    </div>
                    <p><strong>Suggested action:</strong> <span className="capitalize">{aiGuidance.suggestedAction?.replace(/_/g, ' ')}</span></p>
                    <p className="text-gray-500 text-xs">{aiGuidance.reasoning}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportTickets
