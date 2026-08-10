const financeService = require('../services/financeService');

class FinanceController {
  async getDashboard(req, res) {
    try {
      const { from, to } = req.query;
      const dashboard = await financeService.getFinanceDashboard({ from, to });
      res.status(200).json({ success: true, ...dashboard });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to build finance dashboard' });
    }
  }

  async getRevenue(req, res) {
    try {
      const { from, to } = req.query;
      const revenue = await financeService.getRevenueSummary({ from, to });
      res.status(200).json({ success: true, revenue });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to build revenue summary' });
    }
  }

  async getSalaries(req, res) {
    try {
      const { from, to } = req.query;
      const salaries = await financeService.getSalaryExpenses({ from, to });
      res.status(200).json({ success: true, salaries });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to build salary summary' });
    }
  }

  async getProfitLoss(req, res) {
    try {
      const { from, to } = req.query;
      const profitLoss = await financeService.getProfitLoss({ from, to });
      res.status(200).json({ success: true, profitLoss });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to build profit/loss statement' });
    }
  }

  async addExpense(req, res) {
    try {
      const expense = await financeService.addExpense(req.body, req.user);
      res.status(201).json({ success: true, expense });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to add expense' });
    }
  }

  async getExpenses(req, res) {
    try {
      const { from, to, category, page, limit } = req.query;
      const result = await financeService.getAllExpenses({
        from, to, category, page: parseInt(page) || 1, limit: parseInt(limit) || 50
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch expenses' });
    }
  }

  async deleteExpense(req, res) {
    try {
      await financeService.deleteExpense(req.params.id, req.user);
      res.status(200).json({ success: true, message: 'Expense deleted' });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to delete expense' });
    }
  }
}

module.exports = new FinanceController();
