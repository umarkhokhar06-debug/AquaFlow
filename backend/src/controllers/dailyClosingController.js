const dailyClosingService = require('../services/dailyClosingService');

class DailyClosingController {
  async submit(req, res) {
    try {
      const closing = await dailyClosingService.submit(req.user.id, req.body);
      res.status(201).json({ success: true, closing });
    } catch (error) {
      console.error('Submit daily closing error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to submit daily closing' });
    }
  }

  async getMine(req, res) {
    try {
      const closings = await dailyClosingService.getMine(req.user.id);
      res.status(200).json({ success: true, closings });
    } catch (error) {
      console.error('Get my daily closings error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch your daily closings' });
    }
  }

  async getAll(req, res) {
    try {
      const closings = await dailyClosingService.getAll({ status: req.query.status, driverId: req.query.driverId });
      res.status(200).json({ success: true, closings });
    } catch (error) {
      console.error('Get daily closings error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch daily closings' });
    }
  }

  async reconcile(req, res) {
    try {
      const closing = await dailyClosingService.reconcile(req.params.id, req.user);
      res.status(200).json({ success: true, closing });
    } catch (error) {
      console.error('Reconcile daily closing error:', error);
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to reconcile daily closing' });
    }
  }
}

module.exports = new DailyClosingController();
