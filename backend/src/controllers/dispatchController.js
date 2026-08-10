const dispatchService = require('../services/dispatchService');

class DispatchController {
  async getQueue(req, res) {
    try {
      const queue = await dispatchService.getQueue();
      res.status(200).json({ success: true, queue });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch dispatch queue'
      });
    }
  }

  async recommendDrivers(req, res) {
    try {
      const result = await dispatchService.recommendDriversForOrder(req.params.orderId);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to compute driver recommendations'
      });
    }
  }

  async assignOrder(req, res) {
    try {
      const { driverId, recommendedDriverId, reason } = req.body;
      if (!driverId) {
        return res.status(400).json({ success: false, message: 'driverId is required' });
      }
      const result = await dispatchService.assignOrder(req.params.orderId, driverId, req.user, {
        recommendedDriverId,
        reason
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to assign order'
      });
    }
  }

  async getLiveMap(req, res) {
    try {
      const drivers = await dispatchService.getLiveMap();
      res.status(200).json({ success: true, drivers });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch live map data'
      });
    }
  }

  async getMetrics(req, res) {
    try {
      const { from, to } = req.query;
      const metrics = await dispatchService.getMetrics({ from, to });
      res.status(200).json({ success: true, metrics });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to compute dispatch metrics'
      });
    }
  }
}

module.exports = new DispatchController();
