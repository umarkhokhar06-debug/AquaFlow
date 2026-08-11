import React, { useState, useEffect, useCallback } from 'react'
import { financeAPI } from '../services/api'
import { FiDollarSign, FiTrendingUp, FiTrendingDown, FiPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi'

const emptyExpense = { category: '', amount: '', description: '', date: '' }

const Finance = () => {
  const [dashboard, setDashboard] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenseForm, setExpenseForm] = useState(emptyExpense)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [dashRes, expRes] = await Promise.all([
        financeAPI.getDashboard(),
        financeAPI.getExpenses({ limit: 20 })
      ])
      setDashboard(dashRes.data)
      setExpenses(expRes.data.expenses || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddExpense = async (e) => {
    e.preventDefault()
    setActionLoading(true)
    try {
      await financeAPI.addExpense({
        ...expenseForm,
        amount: Number(expenseForm.amount)
      })
      setShowExpenseModal(false)
      setExpenseForm(emptyExpense)
      fetchData()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add expense')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`Delete this ${expense.category} expense?`)) return
    try {
      await financeAPI.deleteExpense(expense._id)
      fetchData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense')
    }
  }

  const inputClass = 'mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { revenue, salaries, profitLoss } = dashboard || {}

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>}

      <div className="flex justify-end">
        <button onClick={fetchData} className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          <FiRefreshCw className="h-4 w-4 mr-2" /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <FiDollarSign className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Gross Revenue</dt>
              <dd className="text-xl font-medium text-gray-900">Rs {revenue?.grossRevenue?.toLocaleString() || 0}</dd>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <FiTrendingUp className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Salary Expense</dt>
              <dd className="text-xl font-medium text-gray-900">Rs {salaries?.totalSalaryExpense?.toLocaleString() || 0}</dd>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <FiTrendingDown className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Other Expenses</dt>
              <dd className="text-xl font-medium text-gray-900">Rs {profitLoss?.otherExpenses?.toLocaleString() || 0}</dd>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-5">
          <div className="flex items-center">
            <FiDollarSign className={`w-8 h-8 ${profitLoss?.profit >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Profit</dt>
              <dd className={`text-xl font-medium ${profitLoss?.profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>Rs {profitLoss?.profit?.toLocaleString() || 0}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Cash vs online */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method Breakdown</h3>
        <div className="flex items-center space-x-6 mb-4">
          <div>
            <span className="text-sm text-gray-500">Cash</span>
            <p className="text-lg font-medium text-gray-900">{revenue?.cashVsOnlineRatio?.cashPercent || 0}%</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Online/Card</span>
            <p className="text-lg font-medium text-gray-900">{revenue?.cashVsOnlineRatio?.onlinePercent || 0}%</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Orders in range</span>
            <p className="text-lg font-medium text-gray-900">{revenue?.ordersPlaced || 0}</p>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">% of Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(revenue?.revenueByPaymentMethod || []).map(r => (
              <tr key={r.paymentMethod}>
                <td className="px-4 py-2 text-sm capitalize">{r.paymentMethod}</td>
                <td className="px-4 py-2 text-sm">{r.orderCount}</td>
                <td className="px-4 py-2 text-sm">Rs {r.total.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm">{r.percentOfRevenue}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expenses */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
          <button onClick={() => setShowExpenseModal(true)} className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <FiPlus className="h-4 w-4 mr-2" /> Add Expense
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map(exp => (
              <tr key={exp._id}>
                <td className="px-6 py-3 text-sm text-gray-900">{exp.category}</td>
                <td className="px-6 py-3 text-sm text-gray-600">Rs {exp.amount.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{exp.description || '-'}</td>
                <td className="px-6 py-3 text-sm text-gray-500">{new Date(exp.date).toLocaleDateString()}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => handleDeleteExpense(exp)} className="text-red-600 hover:text-red-800">
                    <FiTrash2 className="inline h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No expenses recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showExpenseModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input type="text" required value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} className={inputClass} placeholder="e.g. fuel, maintenance, salaries" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input type="number" required value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input type="text" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" value={expenseForm.date} onChange={e => setExpenseForm(p => ({ ...p, date: e.target.value }))} className={inputClass} />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={actionLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? 'Saving...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Finance
