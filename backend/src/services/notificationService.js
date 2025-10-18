const Notification = require('../models/Notification');
const socketService = require('./socketService');

const notificationService = {
  // Create a new notification
  createNotification: async (recipientId, title, message, type = 'system_update', data = {}, priority = 'medium') => {
    try {
      const notification = new Notification({
        recipient: recipientId,
        title,
        message,
        type,
        data,
        priority
      });

      await notification.save();

      // Send real-time notification via WebSocket
      socketService.emitToUser(recipientId, 'newNotification', {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        data: notification.data,
        createdAt: notification.createdAt
      });

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Create notification for order assignment
  notifyOrderAssigned: async (driverId, order) => {
    return await notificationService.createNotification(
      driverId,
      'New Order Assigned',
      `You have been assigned order #${order.orderNumber}`,
      'order_assigned',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customer.name,
        totalAmount: order.totalAmount
      },
      'high'
    );
  },

  // Create notification for order cancellation
  notifyOrderCancelled: async (driverId, order) => {
    return await notificationService.createNotification(
      driverId,
      'Order Cancelled',
      `Order #${order.orderNumber} has been cancelled`,
      'order_cancelled',
      {
        orderId: order._id,
        orderNumber: order.orderNumber
      },
      'medium'
    );
  },

  // Create notification for payment received
  notifyPaymentReceived: async (driverId, amount, orderNumber) => {
    return await notificationService.createNotification(
      driverId,
      'Payment Received',
      `You have received payment of $${amount.toFixed(2)} for order #${orderNumber}`,
      'payment_received',
      {
        amount,
        orderNumber
      },
      'medium'
    );
  },

  // Create system update notification
  notifySystemUpdate: async (recipientId, title, message, data = {}) => {
    return await notificationService.createNotification(
      recipientId,
      title,
      message,
      'system_update',
      data,
      'low'
    );
  },

  // Create promotional notification
  notifyPromotion: async (recipientId, title, message, data = {}) => {
    return await notificationService.createNotification(
      recipientId,
      title,
      message,
      'promotional',
      data,
      'low'
    );
  },

  // Create emergency notification
  notifyEmergency: async (recipientId, title, message, data = {}) => {
    return await notificationService.createNotification(
      recipientId,
      title,
      message,
      'emergency',
      data,
      'urgent'
    );
  },

  // Send notification to multiple users
  sendBulkNotifications: async (recipientIds, title, message, type = 'system_update', data = {}, priority = 'medium') => {
    try {
      const notifications = recipientIds.map(recipientId => ({
        recipient: recipientId,
        title,
        message,
        type,
        data,
        priority
      }));

      const savedNotifications = await Notification.insertMany(notifications);

      // Send real-time notifications
      for (let i = 0; i < recipientIds.length; i++) {
        const notification = savedNotifications[i];
        socketService.emitToUser(recipientIds[i], 'newNotification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          priority: notification.priority,
          data: notification.data,
          createdAt: notification.createdAt
        });
      }

      return savedNotifications;
    } catch (error) {
      console.error('Error sending bulk notifications:', error);
      throw error;
    }
  },

  // Get unread notifications for a user
  getUnreadNotifications: async (userId) => {
    try {
      return await Notification.getUnreadForUser(userId);
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId, userId) => {
    try {
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });

      if (!notification) {
        throw new Error('Notification not found');
      }

      return await notification.markAsRead();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId) => {
    try {
      return await Notification.markAllAsReadForUser(userId);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Clean up expired notifications
  cleanupExpiredNotifications: async () => {
    try {
      const result = await Notification.deleteMany({
        expiresAt: { $lt: new Date() }
      });
      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
      throw error;
    }
  },

  // Get notification statistics for a user
  getNotificationStats: async (userId) => {
    try {
      const stats = await Notification.aggregate([
        { $match: { recipient: userId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            },
            byType: {
              $push: {
                type: '$type',
                isRead: '$isRead'
              }
            }
          }
        }
      ]);

      if (stats.length === 0) {
        return {
          total: 0,
          unread: 0,
          byType: {}
        };
      }

      const typeStats = {};
      stats[0].byType.forEach(item => {
        if (!typeStats[item.type]) {
          typeStats[item.type] = { total: 0, unread: 0 };
        }
        typeStats[item.type].total++;
        if (!item.isRead) {
          typeStats[item.type].unread++;
        }
      });

      return {
        total: stats[0].total,
        unread: stats[0].unread,
        byType: typeStats
      };
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw error;
    }
  }
};

module.exports = notificationService;