const truckService = require('../services/truckService');

class TruckController {
  async createTruck(req, res) {
    try {
      const truck = await truckService.createTruck(req.body, req.user.id);
      res.status(201).json({ success: true, truck });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to create truck'
      });
    }
  }

  async getAllTrucks(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const result = await truckService.getAllTrucks({ page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch trucks'
      });
    }
  }

  async getTruckById(req, res) {
    try {
      const truck = await truckService.getTruckById(req.params.id);
      res.status(200).json({ success: true, truck });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch truck'
      });
    }
  }

  async updateTruck(req, res) {
    try {
      const truck = await truckService.updateTruck(req.params.id, req.body);
      res.status(200).json({ success: true, truck });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to update truck'
      });
    }
  }

  async deleteTruck(req, res) {
    try {
      await truckService.deleteTruck(req.params.id);
      res.status(200).json({ success: true, message: 'Truck deleted' });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to delete truck'
      });
    }
  }

  async assignDriver(req, res) {
    try {
      const { driverId } = req.body;
      if (!driverId) {
        return res.status(400).json({ success: false, message: 'driverId is required' });
      }
      const truck = await truckService.assignDriver(req.params.id, driverId);
      res.status(200).json({ success: true, truck });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to assign driver'
      });
    }
  }

  async unassignDriver(req, res) {
    try {
      const truck = await truckService.unassignDriver(req.params.id);
      res.status(200).json({ success: true, truck });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to unassign driver'
      });
    }
  }
}

module.exports = new TruckController();
