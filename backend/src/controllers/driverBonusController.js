const driverBonusService = require('../services/driverBonusService');

function currentPeriod(query) {
  const now = new Date();
  return {
    year: Number(query.year) || now.getFullYear(),
    month: Number(query.month) || now.getMonth() + 1
  };
}

class DriverBonusController {
  async preview(req, res) {
    try {
      const { year, month } = currentPeriod(req.query);
      const summary = await driverBonusService.computeMonthlySummary(req.params.driverId, year, month);
      res.status(200).json({ success: true, summary });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to compute bonus summary' });
    }
  }

  async award(req, res) {
    try {
      const { driverId, year, month } = req.body;
      if (!driverId) {
        return res.status(400).json({ success: false, message: 'driverId is required' });
      }
      const period = currentPeriod({ year, month });
      const result = await driverBonusService.awardMonthlyBonuses(driverId, period.year, period.month, req.user);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to award bonuses' });
    }
  }

  async getMine(req, res) {
    try {
      const bonuses = await driverBonusService.getMine(req.user.id);
      res.status(200).json({ success: true, bonuses });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch your bonuses' });
    }
  }

  async getAll(req, res) {
    try {
      const bonuses = await driverBonusService.getAll(req.query);
      res.status(200).json({ success: true, bonuses });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch bonuses' });
    }
  }
}

module.exports = new DriverBonusController();
