const driverService = require('../services/driverService');

const driverController = {
  // Get all drivers
  getAllDrivers: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        driverStatus,
        search
      } = req.query;

      const filters = {};
      if (driverStatus) filters.driverStatus = driverStatus;
      if (search) filters.search = search;

      const result = await driverService.getAllDrivers(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('Get all drivers error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving drivers'
      });
    }
  },

  // Get driver by ID
  getDriverById: async (req, res) => {
    try {
      const { driverId } = req.params;
      const result = await driverService.getDriverById(driverId);
      res.status(200).json(result);

    } catch (error) {
      console.error('Get driver by ID error:', error);
      
      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error retrieving driver'
      });
    }
  },

  // Update driver status
  updateDriverStatus: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { status, location } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const result = await driverService.updateDriverStatus(driverId, status, location);
      res.status(200).json(result);

    } catch (error) {
      console.error('Update driver status error:', error);
      
      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid driver status') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error updating driver status'
      });
    }
  },

  // Assign order to driver
  assignOrderToDriver: async (req, res) => {
    try {
      const { orderId, driverId } = req.params;
      const result = await driverService.assignOrderToDriver(orderId, driverId, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Assign order to driver error:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Driver is offline and cannot be assigned orders') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Driver queue is full') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Order is already assigned to this driver') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error assigning order to driver'
      });
    }
  },

  // Complete current order
  completeCurrentOrder: async (req, res) => {
    try {
      const { driverId } = req.params;
      const result = await driverService.completeCurrentOrder(driverId);
      res.status(200).json(result);

    } catch (error) {
      console.error('Complete current order error:', error);
      
      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'No current order to complete') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error completing order'
      });
    }
  },

  // Reorder driver queue
  reorderDriverQueue: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { queueOrder } = req.body;

      if (!queueOrder || !Array.isArray(queueOrder)) {
        return res.status(400).json({
          success: false,
          message: 'Queue order array is required'
        });
      }

      const result = await driverService.reorderDriverQueue(driverId, queueOrder, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Reorder driver queue error:', error);
      
      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid queue order') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('not found in driver queue')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error reordering driver queue'
      });
    }
  },

  // Remove order from driver queue
  removeOrderFromQueue: async (req, res) => {
    try {
      const { driverId, orderId } = req.params;
      const result = await driverService.removeOrderFromQueue(orderId, driverId, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Remove order from queue error:', error);
      
      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Order not found in driver queue') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error removing order from queue'
      });
    }
  },

  // Update driver location
  updateDriverLocation: async (req, res) => {
    try {
      const { driverId } = req.params;
      const { latitude, longitude } = req.body;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const location = { latitude, longitude };
      const result = await driverService.updateDriverLocation(driverId, location);
      res.status(200).json(result);

    } catch (error) {
      console.error('Update driver location error:', error);
      
      if (error.message === 'Driver not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error updating driver location'
      });
    }
  },

  // Get driver statistics
  getDriverStatistics: async (req, res) => {
    try {
      const result = await driverService.getDriverStatistics();
      res.status(200).json(result);

    } catch (error) {
      console.error('Get driver statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving driver statistics'
      });
    }
  },

  // Search drivers
  searchDrivers: async (req, res) => {
    try {
      const { q: searchTerm, driverStatus } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const filters = {};
      if (driverStatus) filters.driverStatus = driverStatus;

      const result = await driverService.searchDrivers(searchTerm, filters);
      res.status(200).json(result);

    } catch (error) {
      console.error('Search drivers error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error searching drivers'
      });
    }
  }
};

module.exports = driverController;
