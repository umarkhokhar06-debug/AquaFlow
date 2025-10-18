const User = require('../models/User');
const Order = require('../models/Order');
const socketService = require('./socketService');

const driverService = {
  // Get all drivers with status and queue information
  getAllDrivers: async (filters = {}, page = 1, limit = 10) => {
    try {
      const query = { userType: 'driver' };
      
      // Apply filters
      if (filters.driverStatus) {
        query.driverStatus = filters.driverStatus;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { 'vehicleInfo.vehicleNumber': { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      
      const drivers = await User.find(query)
        .populate('currentOrder', 'orderNumber status totalAmount customer')
        .populate('orderQueue.order', 'orderNumber status totalAmount customer')
        .select('-password')
        .sort({ driverStatus: 1, 'orderQueue.length': -1 })
        .skip(skip)
        .limit(limit);

      const totalDrivers = await User.countDocuments(query);
      const totalPages = Math.ceil(totalDrivers / limit);

      return {
        success: true,
        drivers: drivers.map(driver => ({
          id: driver._id,
          name: driver.name,
          email: driver.email,
          driverStatus: driver.driverStatus,
          currentOrder: driver.currentOrder,
          orderQueue: driver.orderQueue,
          maxQueueSize: driver.maxQueueSize,
          location: driver.location,
          vehicleInfo: driver.vehicleInfo,
          status: driver.status,
          createdAt: driver.createdAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalDrivers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      console.error('Get all drivers error:', error);
      throw error;
    }
  },

  // Get driver by ID with full details
  getDriverById: async (driverId) => {
    try {
      const driver = await User.findById(driverId)
        .populate('currentOrder')
        .populate('orderQueue.order')
        .select('-password');

      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      return {
        success: true,
        driver: {
          id: driver._id,
          name: driver.name,
          email: driver.email,
          driverStatus: driver.driverStatus,
          currentOrder: driver.currentOrder,
          orderQueue: driver.orderQueue,
          maxQueueSize: driver.maxQueueSize,
          location: driver.location,
          vehicleInfo: driver.vehicleInfo,
          status: driver.status,
          createdAt: driver.createdAt
        }
      };

    } catch (error) {
      console.error('Get driver by ID error:', error);
      throw error;
    }
  },

  // Update driver status
  updateDriverStatus: async (driverId, status, location = null) => {
    try {
      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      const validStatuses = ['free', 'busy', 'offline'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid driver status');
      }

      // Update status
      driver.driverStatus = status;

      // Update location if provided
      if (location) {
        driver.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          lastUpdated: new Date()
        };
      }

      // If setting to offline, clear current order and queue
      if (status === 'offline') {
        driver.currentOrder = null;
        driver.orderQueue = [];
      }

      await driver.save();

      // Emit real-time event
      socketService.emitDriverStatusUpdate(driverId, status, location);

      return {
        success: true,
        message: 'Driver status updated successfully',
        driver: {
          id: driver._id,
          name: driver.name,
          driverStatus: driver.driverStatus,
          location: driver.location
        }
      };

    } catch (error) {
      console.error('Update driver status error:', error);
      throw error;
    }
  },

  // Assign order to driver
  assignOrderToDriver: async (orderId, driverId, adminId) => {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      // Check if driver is available
      if (driver.driverStatus === 'offline') {
        throw new Error('Driver is offline and cannot be assigned orders');
      }

      // Check if driver's queue is full
      if (driver.orderQueue.length >= driver.maxQueueSize) {
        throw new Error('Driver queue is full');
      }

      // Check if order is already assigned
      if (order.driver && order.driver.toString() === driverId) {
        throw new Error('Order is already assigned to this driver');
      }

      // Assign order to driver
      order.driver = driverId;
      await order.save();

      // Add to driver's queue
      driver.orderQueue.push({
        order: orderId,
        assignedAt: new Date(),
        priority: 0
      });

      // If driver is free, set as current order
      if (driver.driverStatus === 'free') {
        driver.currentOrder = orderId;
        driver.driverStatus = 'busy';
      }

      await driver.save();

      // Emit real-time events
      socketService.emitOrderAssignment(orderId, driverId, driver.name);
      socketService.emitDriverQueueUpdate(driverId, driver.orderQueue);

      return {
        success: true,
        message: 'Order assigned to driver successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          driver: {
            id: driver._id,
            name: driver.name,
            email: driver.email
          }
        },
        driver: {
          id: driver._id,
          name: driver.name,
          driverStatus: driver.driverStatus,
          queueLength: driver.orderQueue.length
        }
      };

    } catch (error) {
      console.error('Assign order to driver error:', error);
      throw error;
    }
  },

  // Complete current order and move to next in queue
  completeCurrentOrder: async (driverId) => {
    try {
      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      if (!driver.currentOrder) {
        throw new Error('No current order to complete');
      }

      // Update order status to delivered
      const order = await Order.findById(driver.currentOrder);
      if (order) {
        order.status = 'delivered';
        order.deliveredAt = new Date();
        await order.save();

        // Emit order completion event
        socketService.emitOrderStatusUpdate(order._id, 'delivered', driverId);
      }

      // Remove current order
      driver.currentOrder = null;

      // Move to next order in queue
      if (driver.orderQueue.length > 0) {
        const nextOrder = driver.orderQueue.shift();
        driver.currentOrder = nextOrder.order;
        driver.driverStatus = 'busy';
      } else {
        driver.driverStatus = 'free';
      }

      await driver.save();

      // Emit real-time events
      socketService.emitDriverStatusUpdate(driverId, driver.driverStatus);
      socketService.emitDriverQueueUpdate(driverId, driver.orderQueue);

      return {
        success: true,
        message: 'Order completed successfully',
        driver: {
          id: driver._id,
          name: driver.name,
          driverStatus: driver.driverStatus,
          currentOrder: driver.currentOrder,
          queueLength: driver.orderQueue.length
        }
      };

    } catch (error) {
      console.error('Complete current order error:', error);
      throw error;
    }
  },

  // Reorder driver's queue
  reorderDriverQueue: async (driverId, queueOrder, adminId) => {
    try {
      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      // Validate queue order
      if (queueOrder.length !== driver.orderQueue.length) {
        throw new Error('Invalid queue order');
      }

      // Reorder the queue
      const reorderedQueue = queueOrder.map((orderId, index) => {
        const existingItem = driver.orderQueue.find(item => 
          item.order.toString() === orderId
        );
        if (!existingItem) {
          throw new Error(`Order ${orderId} not found in driver queue`);
        }
        return {
          ...existingItem,
          priority: index
        };
      });

      driver.orderQueue = reorderedQueue;
      await driver.save();

      // Emit real-time event
      socketService.emitDriverQueueUpdate(driverId, driver.orderQueue);

      return {
        success: true,
        message: 'Driver queue reordered successfully',
        driver: {
          id: driver._id,
          name: driver.name,
          orderQueue: driver.orderQueue
        }
      };

    } catch (error) {
      console.error('Reorder driver queue error:', error);
      throw error;
    }
  },

  // Remove order from driver queue
  removeOrderFromQueue: async (orderId, driverId, adminId) => {
    try {
      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      // Find and remove order from queue
      const orderIndex = driver.orderQueue.findIndex(
        item => item.order.toString() === orderId
      );

      if (orderIndex === -1) {
        throw new Error('Order not found in driver queue');
      }

      // Remove from queue
      driver.orderQueue.splice(orderIndex, 1);

      // If this was the current order, move to next
      if (driver.currentOrder && driver.currentOrder.toString() === orderId) {
        if (driver.orderQueue.length > 0) {
          const nextOrder = driver.orderQueue.shift();
          driver.currentOrder = nextOrder.order;
        } else {
          driver.currentOrder = null;
          driver.driverStatus = 'free';
        }
      }

      await driver.save();

      // Update order to remove driver assignment
      await Order.findByIdAndUpdate(orderId, { driver: null });

      // Emit real-time events
      socketService.emitDriverQueueUpdate(driverId, driver.orderQueue);
      socketService.emitDriverStatusUpdate(driverId, driver.driverStatus);

      return {
        success: true,
        message: 'Order removed from driver queue successfully',
        driver: {
          id: driver._id,
          name: driver.name,
          driverStatus: driver.driverStatus,
          currentOrder: driver.currentOrder,
          queueLength: driver.orderQueue.length
        }
      };

    } catch (error) {
      console.error('Remove order from queue error:', error);
      throw error;
    }
  },

  // Update driver location
  updateDriverLocation: async (driverId, location) => {
    try {
      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Driver not found');
      }

      driver.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdated: new Date()
      };

      await driver.save();

      // Emit real-time event
      socketService.emitDriverLocationUpdate(driverId, location);

      return {
        success: true,
        message: 'Driver location updated successfully',
        driver: {
          id: driver._id,
          name: driver.name,
          location: driver.location
        }
      };

    } catch (error) {
      console.error('Update driver location error:', error);
      throw error;
    }
  },

  // Get driver statistics
  getDriverStatistics: async () => {
    try {
      const stats = await User.aggregate([
        { $match: { userType: 'driver' } },
        {
          $group: {
            _id: '$driverStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      const totalDrivers = await User.countDocuments({ userType: 'driver' });
      const busyDrivers = await User.countDocuments({ 
        userType: 'driver', 
        driverStatus: 'busy' 
      });
      const freeDrivers = await User.countDocuments({ 
        userType: 'driver', 
        driverStatus: 'free' 
      });
      const offlineDrivers = await User.countDocuments({ 
        userType: 'driver', 
        driverStatus: 'offline' 
      });

      return {
        success: true,
        statistics: {
          totalDrivers,
          busyDrivers,
          freeDrivers,
          offlineDrivers,
          statusBreakdown: stats
        }
      };

    } catch (error) {
      console.error('Get driver statistics error:', error);
      throw error;
    }
  },

  // Search drivers
  searchDrivers: async (searchTerm, filters = {}) => {
    try {
      const query = {
        userType: 'driver',
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { 'vehicleInfo.vehicleNumber': { $regex: searchTerm, $options: 'i' } }
        ]
      };

      if (filters.driverStatus) {
        query.driverStatus = filters.driverStatus;
      }

      const drivers = await User.find(query)
        .populate('currentOrder', 'orderNumber status')
        .select('-password')
        .limit(20);

      return {
        success: true,
        drivers: drivers.map(driver => ({
          id: driver._id,
          name: driver.name,
          email: driver.email,
          driverStatus: driver.driverStatus,
          currentOrder: driver.currentOrder,
          queueLength: driver.orderQueue.length,
          vehicleInfo: driver.vehicleInfo
        }))
      };

    } catch (error) {
      console.error('Search drivers error:', error);
      throw error;
    }
  }
};

module.exports = driverService;
