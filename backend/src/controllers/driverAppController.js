const User = require('../models/User');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const SupportTicket = require('../models/SupportTicket');
const EarningsRecord = require('../models/EarningsRecord');
const authService = require('../services/authService');
const socketService = require('../services/socketService');
const mongoose = require('mongoose');

const driverAppController = {
  // Authentication endpoints
  register: async (req, res) => {
    try {
      // Ensure userType is driver
      req.body.userType = 'driver';
      const result = await authService.registerUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Driver registration error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.loginUser(email, password);
      
      // Check if user is a driver
      if (result.user.userType !== 'driver') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Driver account required.'
        });
      }
      
      res.status(200).json(result);
    } catch (error) {
      console.error('Driver login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials'
      });
    }
  },

  // Driver Profile Management
  getProfile: async (req, res) => {
    try {
      const driverId = req.user.id;
      
      const driver = await User.findById(driverId)
        .select('-password')
        .lean();
      
      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: driver
      });
    } catch (error) {
      console.error('Get driver profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving profile'
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const driverId = req.user.id;
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated via this endpoint
      delete updates.userType;
      delete updates.password;
      delete updates.earnings;
      delete updates.rating;
      
      const driver = await User.findByIdAndUpdate(
        driverId,
        updates,
        { new: true, runValidators: true }
      ).select('-password');
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: driver
      });
    } catch (error) {
      console.error('Update driver profile error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error updating profile'
      });
    }
  },

  // Order Management
  getOrders: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;
      
      const query = { driver: driverId };
      
      // Support multiple statuses separated by comma
      if (status) {
        const statuses = status.split(',').map(s => s.trim());
        query.status = { $in: statuses };
      }
      
      const orders = await Order.find(query)
        .populate('customer', 'name email fullName phoneNumber')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      const totalOrders = await Order.countDocuments(query);
      
      // Transform orders to match the expected format
      const transformedOrders = orders.map(order => ({
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        customerId: order.customer._id.toString(),
        customerName: order.customer.fullName || order.customer.name,
        customerAddress: order.deliveryAddress.address,
        customerPhone: order.deliveryAddress.phoneNumber || order.customer.phoneNumber,
        status: order.status,
        priority: 'medium', // You can add logic to determine priority
        items: order.items.map(item => ({
          productId: order._id.toString(), // Use order ID or create product IDs
          productName: item.type === 'large_tanker' ? 'Large Tanker' : 
                       item.type === 'small_tanker' ? 'Small Tanker' : 'Water Bottles',
          quantity: item.quantity,
          price: item.unitPrice
        })),
        totalAmount: order.totalAmount,
        deliveryFee: 200, // Fixed delivery fee or calculate based on distance
        estimatedDeliveryTime: order.deliveryDate || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now if not set
        pickupLocation: {
          latitude: 24.8607,
          longitude: 67.0011,
          address: "Main Warehouse, Karachi" // You can make this configurable
        },
        deliveryLocation: {
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude,
          address: order.deliveryAddress.address
        },
        createdAt: order.createdAt,
        acceptedAt: order.orderDate,
        pickedUpAt: order.status === 'out_for_delivery' || order.status === 'delivered' ? order.orderDate : null,
        deliveredAt: order.deliveredAt,
        notes: order.notes || order.deliveryAddress.specialInstructions || 'Handle with care'
      }));
      
      res.status(200).json({
        success: true,
        data: {
          orders: transformedOrders,
          total: totalOrders,
          page: parseInt(page),
          totalPages: Math.ceil(totalOrders / limit)
        }
      });
    } catch (error) {
      console.error('Get driver orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving orders'
      });
    }
  },

  getOrderDetails: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { orderId } = req.params;
      
      const order = await Order.findOne({
        _id: orderId,
        driver: driverId
      }).populate('customer', 'name email');
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Get order details error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving order details'
      });
    }
  },

  updateOrderStatus: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { orderId } = req.params;
      const { status, notes } = req.body;
      
      const validStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      
      const order = await Order.findOne({
        _id: orderId,
        driver: driverId
      });
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      order.status = status;
      if (notes) order.notes = notes;
      
      if (status === 'delivered') {
        order.deliveredAt = new Date();
        
        // Update driver status to free
        await User.findByIdAndUpdate(driverId, {
          driverStatus: 'free',
          currentOrder: null
        });
        
        // Create earnings record with all required fields
        const deliveredAt = new Date();
        const baseAmount = order.totalAmount * 0.8;
        const commissionRate = 20;
        const commissionAmount = order.totalAmount * 0.2;
        const tip = 0;
        const bonus = 0;
        const deductions = 0;
        const totalEarned = baseAmount + tip + bonus - deductions;
        // Calculate period fields
        const year = deliveredAt.getFullYear();
        const month = deliveredAt.getMonth() + 1;
        const firstDayOfYear = new Date(year, 0, 1);
        const daysDiff = Math.floor((deliveredAt - firstDayOfYear) / (24 * 60 * 60 * 1000));
        const week = Math.ceil((daysDiff + firstDayOfYear.getDay() + 1) / 7);
        const earningsRecord = new EarningsRecord({
          driver: driverId,
          order: orderId,
          orderNumber: order.orderNumber,
          baseAmount,
          tip,
          bonus,
          deductions,
          totalEarned,
          commission: {
            rate: commissionRate,
            amount: commissionAmount
          },
          paymentStatus: 'pending',
          deliveredAt,
          period: {
            year,
            month,
            week
          }
        });
        await earningsRecord.save();
        
        // Update driver earnings
        await User.findByIdAndUpdate(driverId, {
          $inc: {
            'earnings.totalEarned': earningsRecord.totalEarned,
            'earnings.currentMonthEarnings': earningsRecord.totalEarned
          }
        });
      }
      
      await order.save();
      
      // Populate driver info for the response
      const driver = await User.findById(driverId).select('name email');
      
      // Send real-time updates to customer
      socketService.emitOrderUpdateToCustomer(
        order.customer,
        order._id,
        'status-update',
        {
          status: order.status,
          driver: driver ? {
            id: driver._id,
            name: driver.name,
            email: driver.email
          } : null
        }
      );

      // Send real-time updates to admin
      socketService.emitOrderStatusUpdate(
        order._id,
        order.status,
        driverId
      );
      
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: order
      });
    } catch (error) {
      console.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating order status'
      });
    }
  },

  // Dashboard Stats
  getDashboardStats: async (req, res) => {
    try {
      const driverId = req.user.id;
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Get pending orders count
      const pendingOrders = await Order.countDocuments({
        driver: driverId,
        status: { $in: ['confirmed', 'preparing', 'out_for_delivery'] }
      });
      
      // Get today's earnings
      const todayEarnings = await EarningsRecord.aggregate([
        {
          $match: {
            driver: new mongoose.Types.ObjectId(driverId),
            createdAt: { $gte: startOfDay }
          }
        },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: '$totalEarned' },
            ordersCompleted: { $sum: 1 }
          }
        }
      ]);
      
      // Get month's earnings
      const monthEarnings = await EarningsRecord.aggregate([
        {
          $match: {
            driver: new mongoose.Types.ObjectId(driverId),
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: null,
            totalEarned: { $sum: '$totalEarned' },
            ordersCompleted: { $sum: 1 }
          }
        }
      ]);
      
      // Get driver rating
      const driver = await User.findById(driverId).select('rating');
      
      const stats = {
        pendingOrders,
        todayEarnings: todayEarnings[0]?.totalEarned || 0,
        todayOrders: todayEarnings[0]?.ordersCompleted || 0,
        monthEarnings: monthEarnings[0]?.totalEarned || 0,
        monthOrders: monthEarnings[0]?.ordersCompleted || 0,
        rating: driver?.rating?.average || 5.0,
        totalRatings: driver?.rating?.totalRatings || 0
      };
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving dashboard stats'
      });
    }
  },

  // Notifications
  getNotifications: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      
      const query = { recipient: driverId };
      if (unreadOnly === 'true') query.isRead = false;
      
      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      const totalNotifications = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        recipient: driverId,
        isRead: false
      });
      
      res.status(200).json({
        success: true,
        data: {
          notifications,
          unreadCount,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalNotifications / limit),
            totalNotifications
          }
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving notifications'
      });
    }
  },

  markNotificationAsRead: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { notificationId } = req.params;
      
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: driverId
      });
      
      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }
      
      await notification.markAsRead();
      
      res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error marking notification as read'
      });
    }
  },

  markAllNotificationsAsRead: async (req, res) => {
    try {
      const driverId = req.user.id;
      
      await Notification.markAllAsReadForUser(driverId);
      
      res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error marking notifications as read'
      });
    }
  },

  // Location tracking
  updateLocation: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { latitude, longitude } = req.body;
      
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }
      
      const driver = await User.findByIdAndUpdate(
        driverId,
        {
          'location.latitude': latitude,
          'location.longitude': longitude,
          'location.lastUpdated': new Date()
        },
        { new: true }
      ).select('location');
      
      // Find all active orders for this driver and emit to customers
      const activeOrders = await Order.find({
        driver: driverId,
        status: { $in: ['preparing', 'out_for_delivery'] }
      }).select('customer');

      const customerIds = activeOrders.map(order => order.customer.toString());
      const uniqueCustomerIds = [...new Set(customerIds)];

      // Emit to each customer with active orders
      uniqueCustomerIds.forEach(customerId => {
        socketService.emitDriverLocationUpdate(driverId, driver.location);
      });
      
      // Emit location update to admin dashboard
      socketService.emitToAdmins('driverLocationUpdate', {
        driverId,
        location: driver.location
      });
      
      res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        data: driver.location
      });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating location'
      });
    }
  },

  // Vehicle info
  getVehicleInfo: async (req, res) => {
    try {
      const driverId = req.user.id;
      
      const driver = await User.findById(driverId)
        .select('vehicleInfo')
        .lean();
      
      res.status(200).json({
        success: true,
        data: driver.vehicleInfo
      });
    } catch (error) {
      console.error('Get vehicle info error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving vehicle info'
      });
    }
  },

  updateVehicleInfo: async (req, res) => {
    try {
      const driverId = req.user.id;
      const vehicleUpdates = req.body;
      
      const driver = await User.findByIdAndUpdate(
        driverId,
        { vehicleInfo: vehicleUpdates },
        { new: true, runValidators: true }
      ).select('vehicleInfo');
      
      res.status(200).json({
        success: true,
        message: 'Vehicle info updated successfully',
        data: driver.vehicleInfo
      });
    } catch (error) {
      console.error('Update vehicle info error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error updating vehicle info'
      });
    }
  },

  // Support
  createSupportTicket: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { subject, description, category, priority } = req.body;
      
      const ticket = new SupportTicket({
        user: driverId,
        subject,
        description,
        category: category || 'general',
        priority: priority || 'medium'
      });
      
      await ticket.save();
      
      res.status(201).json({
        success: true,
        message: 'Support ticket created successfully',
        data: ticket
      });
    } catch (error) {
      console.error('Create support ticket error:', error);
      
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error creating support ticket'
      });
    }
  },

  getSupportTickets: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;
      
      const tickets = await SupportTicket.getTicketsByUser(driverId, status)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();
      
      const totalTickets = await SupportTicket.countDocuments({
        user: driverId,
        ...(status && { status })
      });
      
      res.status(200).json({
        success: true,
        data: {
          tickets,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalTickets / limit),
            totalTickets
          }
        }
      });
    } catch (error) {
      console.error('Get support tickets error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving support tickets'
      });
    }
  },

  // Settings
  updateSettings: async (req, res) => {
    try {
      const driverId = req.user.id;
      const settings = req.body;
      
      const driver = await User.findByIdAndUpdate(
        driverId,
        { settings },
        { new: true, runValidators: true }
      ).select('settings');
      
      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: driver.settings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating settings'
      });
    }
  },

  // Earnings
  getEarnings: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { year, month, page = 1, limit = 20 } = req.query;
      
      let earnings;
      if (year) {
        earnings = await EarningsRecord.getEarningsByPeriod(
          driverId,
          parseInt(year),
          month ? parseInt(month) : null
        );
      } else {
        earnings = await EarningsRecord.find({ driver: driverId })
          .populate('order', 'orderNumber deliveredAt')
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);
      }
      
      const totalEarningsData = await EarningsRecord.getTotalEarnings(driverId);
      const totalEarnings = totalEarningsData[0] || {
        totalEarned: 0,
        totalOrders: 0,
        averageEarning: 0,
        totalPaid: 0,
        totalPending: 0
      };
      
      res.status(200).json({
        success: true,
        data: {
          earnings,
          summary: totalEarnings,
          pagination: !year ? {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalEarnings.totalOrders / limit),
            totalRecords: totalEarnings.totalOrders
          } : null
        }
      });
    } catch (error) {
      console.error('Get earnings error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving earnings'
      });
    }
  },

  // Update driver status (online/offline/busy)
  updateDriverStatus: async (req, res) => {
    try {
      const driverId = req.user.id;
      const { status } = req.body;
      
      const validStatuses = ['free', 'busy', 'offline'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid driver status'
        });
      }
      
      const driver = await User.findByIdAndUpdate(
        driverId,
        { driverStatus: status },
        { new: true }
      ).select('driverStatus');
      
      // Emit status update to admin dashboard
      socketService.emitToAdmins('driverStatusUpdate', {
        driverId,
        status: driver.driverStatus
      });
      
      res.status(200).json({
        success: true,
        message: 'Driver status updated successfully',
        data: { status: driver.driverStatus }
      });
    } catch (error) {
      console.error('Update driver status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error updating driver status'
      });
    }
  }
};

module.exports = driverAppController;