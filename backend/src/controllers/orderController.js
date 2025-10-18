const orderService = require('../services/orderService');

const orderController = {
  // Create new order
  createOrder: async (req, res) => {
    try {
      const result = await orderService.createOrder(req.user.id, req.body);
      res.status(201).json(result);

    } catch (error) {
      console.error('Create order error:', error);
      
      if (error.message) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error creating order'
      });
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await orderService.getOrderById(orderId, req.user.id, req.user.userType);
      res.status(200).json(result);

    } catch (error) {
      console.error('Get order error:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Access denied. You can only view your own orders') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error retrieving order'
      });
    }
  },

  // Get customer orders
  getCustomerOrders: async (req, res) => {
    try {
      const result = await orderService.getOrdersByCustomer(req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Get customer orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving orders'
      });
    }
  },

  // Get all orders (for drivers and admins)
  getAllOrders: async (req, res) => {
    try {
      const filters = {
        status: req.query.status,
        driver: req.query.driver
      };

      const result = await orderService.getAllOrders(filters);
      res.status(200).json(result);

    } catch (error) {
      console.error('Get all orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving orders'
      });
    }
  },

  // Update order status
  updateOrderStatus: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Status is required'
        });
      }

      const result = await orderService.updateOrderStatus(orderId, status, req.user.id, req.user.userType);
      res.status(200).json(result);

    } catch (error) {
      console.error('Update order status error:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Access denied. You can only update your own orders') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot change status')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error updating order status'
      });
    }
  },

  // Assign driver to order
  assignDriver: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { driverId } = req.body;

      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Driver ID is required'
        });
      }

      const result = await orderService.assignDriver(orderId, driverId, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Assign driver error:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid driver') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error assigning driver'
      });
    }
  },

  // Get available products
  getAvailableProducts: async (req, res) => {
    try {
      const result = await orderService.getAvailableProducts();
      res.status(200).json(result);

    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving products'
      });
    }
  },

  // Cancel order
  cancelOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await orderService.cancelOrder(orderId, req.user.id, req.user.userType);
      res.status(200).json(result);

    } catch (error) {
      console.error('Cancel order error:', error);
      
      if (error.message === 'Order not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Access denied. You can only cancel your own orders') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Order cannot be cancelled') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error cancelling order'
      });
    }
  },

  // Get order statistics (for admins)
  getOrderStatistics: async (req, res) => {
    try {
      const Order = require('../models/Order');
      
      const stats = await Order.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        }
      ]);

      const totalOrders = await Order.countDocuments();
      const totalRevenue = await Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);

      res.status(200).json({
        success: true,
        statistics: {
          totalOrders,
          totalRevenue: totalRevenue[0]?.total || 0,
          statusBreakdown: stats
        }
      });

    } catch (error) {
      console.error('Get order statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving statistics'
      });
    }
  }
};

module.exports = orderController;
