const EarningsRecord = require('../models/EarningsRecord');
const User = require('../models/User');
const Order = require('../models/Order');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');

const earningsService = {
  // Create earnings record for completed order
  createEarningsRecord: async (orderId, driverId) => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.status !== 'delivered') {
        throw new Error('Order must be delivered to create earnings record');
      }

      // Check if earnings record already exists
      const existingRecord = await EarningsRecord.findOne({ order: orderId });
      if (existingRecord) {
        throw new Error('Earnings record already exists for this order');
      }

      // Calculate earnings (80% of order value, 20% commission)
      const baseAmount = order.totalAmount * 0.8;
      const commissionRate = 20;
      const commissionAmount = order.totalAmount * 0.2;

      const earningsRecord = new EarningsRecord({
        driver: driverId,
        order: orderId,
        orderNumber: order.orderNumber,
        baseAmount: baseAmount,
        commission: {
          rate: commissionRate,
          amount: commissionAmount
        },
        deliveredAt: order.deliveredAt || new Date()
      });

      await earningsRecord.save();

      // Update driver's total earnings
      await User.findByIdAndUpdate(driverId, {
        $inc: {
          'earnings.totalEarned': earningsRecord.totalEarned,
          'earnings.currentMonthEarnings': earningsRecord.totalEarned
        }
      });

      // Notify driver about earnings
      await notificationService.notifyPaymentReceived(
        driverId,
        earningsRecord.totalEarned,
        order.orderNumber
      );

      return earningsRecord;
    } catch (error) {
      console.error('Error creating earnings record:', error);
      throw error;
    }
  },

  // Get earnings summary for driver
  getEarningsSummary: async (driverId) => {
    try {
      const totalEarningsData = await EarningsRecord.getTotalEarnings(driverId);
      const summary = totalEarningsData[0] || {
        totalEarned: 0,
        totalOrders: 0,
        averageEarning: 0,
        totalPaid: 0,
        totalPending: 0
      };

      // Get current month earnings
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      const monthlyEarnings = await EarningsRecord.aggregate([
        {
          $match: {
            driver: new mongoose.Types.ObjectId(driverId),
            'period.year': currentYear,
            'period.month': currentMonth
          }
        },
        {
          $group: {
            _id: null,
            monthlyTotal: { $sum: '$totalEarned' },
            monthlyOrders: { $sum: 1 }
          }
        }
      ]);

      summary.monthlyTotal = monthlyEarnings[0]?.monthlyTotal || 0;
      summary.monthlyOrders = monthlyEarnings[0]?.monthlyOrders || 0;

      // Get today's earnings
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayEarnings = await EarningsRecord.aggregate([
        {
          $match: {
            driver: new mongoose.Types.ObjectId(driverId),
            createdAt: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        {
          $group: {
            _id: null,
            todayTotal: { $sum: '$totalEarned' },
            todayOrders: { $sum: 1 }
          }
        }
      ]);

      summary.todayTotal = todayEarnings[0]?.todayTotal || 0;
      summary.todayOrders = todayEarnings[0]?.todayOrders || 0;

      return summary;
    } catch (error) {
      console.error('Error getting earnings summary:', error);
      throw error;
    }
  },

  // Get detailed earnings history
  getEarningsHistory: async (driverId, filters = {}) => {
    try {
      const { 
        year, 
        month, 
        startDate, 
        endDate, 
        paymentStatus, 
        page = 1, 
        limit = 20 
      } = filters;

      let query = { driver: driverId };

      // Apply filters
      if (year) {
        query['period.year'] = parseInt(year);
      }
      if (month) {
        query['period.month'] = parseInt(month);
      }
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      if (paymentStatus) {
        query.paymentStatus = paymentStatus;
      }

      const earnings = await EarningsRecord.find(query)
        .populate('order', 'orderNumber deliveredAt customer')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const totalRecords = await EarningsRecord.countDocuments(query);

      return {
        earnings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords
        }
      };
    } catch (error) {
      console.error('Error getting earnings history:', error);
      throw error;
    }
  },

  // Get earnings by period (weekly, monthly, yearly)
  getEarningsByPeriod: async (driverId, period = 'monthly', year = null) => {
    try {
      const currentDate = new Date();
      const targetYear = year || currentDate.getFullYear();

      let groupBy;
      let periods;

      switch (period) {
        case 'weekly':
          groupBy = { year: '$period.year', week: '$period.week' };
          periods = Array.from({ length: 53 }, (_, i) => i + 1);
          break;
        case 'monthly':
          groupBy = { year: '$period.year', month: '$period.month' };
          periods = Array.from({ length: 12 }, (_, i) => i + 1);
          break;
        case 'yearly':
          groupBy = { year: '$period.year' };
          periods = Array.from({ length: 5 }, (_, i) => targetYear - 4 + i);
          break;
        default:
          throw new Error('Invalid period. Must be weekly, monthly, or yearly');
      }

      const earnings = await EarningsRecord.aggregate([
        {
          $match: {
            driver: new mongoose.Types.ObjectId(driverId),
            ...(period !== 'yearly' && { 'period.year': targetYear })
          }
        },
        {
          $group: {
            _id: groupBy,
            totalEarned: { $sum: '$totalEarned' },
            totalOrders: { $sum: 1 },
            averageEarning: { $avg: '$totalEarned' },
            totalPaid: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalEarned', 0]
              }
            },
            totalPending: {
              $sum: {
                $cond: [{ $eq: ['$paymentStatus', 'pending'] }, '$totalEarned', 0]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
      ]);

      // Fill in missing periods with zero values
      const filledEarnings = periods.map(periodValue => {
        const existing = earnings.find(e => {
          if (period === 'yearly') return e._id.year === periodValue;
          if (period === 'monthly') return e._id.month === periodValue;
          if (period === 'weekly') return e._id.week === periodValue;
          return false;
        });

        return existing || {
          _id: period === 'yearly' ? { year: periodValue } : 
               period === 'monthly' ? { year: targetYear, month: periodValue } :
               { year: targetYear, week: periodValue },
          totalEarned: 0,
          totalOrders: 0,
          averageEarning: 0,
          totalPaid: 0,
          totalPending: 0
        };
      });

      return filledEarnings;
    } catch (error) {
      console.error('Error getting earnings by period:', error);
      throw error;
    }
  },

  // Add tip to earnings record
  addTip: async (earningsRecordId, tipAmount) => {
    try {
      const record = await EarningsRecord.findById(earningsRecordId);
      
      if (!record) {
        throw new Error('Earnings record not found');
      }

      record.tip = (record.tip || 0) + tipAmount;
      await record.save();

      // Update driver's total earnings
      await User.findByIdAndUpdate(record.driver, {
        $inc: {
          'earnings.totalEarned': tipAmount,
          'earnings.currentMonthEarnings': tipAmount
        }
      });

      // Notify driver about tip
      await notificationService.createNotification(
        record.driver,
        'Tip Received',
        `You received a tip of $${tipAmount.toFixed(2)} for order #${record.orderNumber}`,
        'payment_received',
        {
          orderId: record.order,
          orderNumber: record.orderNumber,
          tipAmount
        },
        'medium'
      );

      return record;
    } catch (error) {
      console.error('Error adding tip:', error);
      throw error;
    }
  },

  // Add bonus to earnings record
  addBonus: async (earningsRecordId, bonusAmount, reason = 'Performance bonus') => {
    try {
      const record = await EarningsRecord.findById(earningsRecordId);
      
      if (!record) {
        throw new Error('Earnings record not found');
      }

      record.bonus = (record.bonus || 0) + bonusAmount;
      await record.save();

      // Update driver's total earnings
      await User.findByIdAndUpdate(record.driver, {
        $inc: {
          'earnings.totalEarned': bonusAmount,
          'earnings.currentMonthEarnings': bonusAmount
        }
      });

      // Notify driver about bonus
      await notificationService.createNotification(
        record.driver,
        'Bonus Received',
        `You received a bonus of $${bonusAmount.toFixed(2)} - ${reason}`,
        'payment_received',
        {
          orderId: record.order,
          orderNumber: record.orderNumber,
          bonusAmount,
          reason
        },
        'medium'
      );

      return record;
    } catch (error) {
      console.error('Error adding bonus:', error);
      throw error;
    }
  },

  // Mark earnings as paid
  markAsPaid: async (earningsRecordIds, paymentMethod = 'bank_transfer', transactionId = null) => {
    try {
      const records = await EarningsRecord.find({
        _id: { $in: earningsRecordIds },
        paymentStatus: 'pending'
      });

      if (records.length === 0) {
        throw new Error('No pending earnings records found');
      }

      const updates = {
        paymentStatus: 'paid',
        paymentMethod,
        paidAt: new Date()
      };

      if (transactionId) {
        updates.transactionId = transactionId;
      }

      await EarningsRecord.updateMany(
        { _id: { $in: earningsRecordIds } },
        updates
      );

      // Update drivers' last payout date
      const driverIds = [...new Set(records.map(r => r.driver.toString()))];
      await User.updateMany(
        { _id: { $in: driverIds } },
        { 'earnings.lastPayoutDate': new Date() }
      );

      // Notify drivers about payment
      for (const record of records) {
        await notificationService.createNotification(
          record.driver,
          'Payment Processed',
          `Your earnings of $${record.totalEarned.toFixed(2)} have been paid`,
          'payment_received',
          {
            orderId: record.order,
            orderNumber: record.orderNumber,
            amount: record.totalEarned,
            transactionId
          },
          'high'
        );
      }

      return records;
    } catch (error) {
      console.error('Error marking earnings as paid:', error);
      throw error;
    }
  },

  // Reset monthly earnings (to be called at the start of each month)
  resetMonthlyEarnings: async () => {
    try {
      await User.updateMany(
        { userType: 'driver' },
        { 'earnings.currentMonthEarnings': 0 }
      );

      console.log('Monthly earnings reset for all drivers');
      return true;
    } catch (error) {
      console.error('Error resetting monthly earnings:', error);
      throw error;
    }
  }
};

module.exports = earningsService;