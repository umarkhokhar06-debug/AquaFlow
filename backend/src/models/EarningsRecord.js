const mongoose = require('mongoose');

const earningsRecordSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  baseAmount: {
    type: Number,
    required: true,
    min: [0, 'Base amount cannot be negative']
  },
  tip: {
    type: Number,
    default: 0,
    min: [0, 'Tip cannot be negative']
  },
  bonus: {
    type: Number,
    default: 0,
    min: [0, 'Bonus cannot be negative']
  },
  deductions: {
    type: Number,
    default: 0,
    min: [0, 'Deductions cannot be negative']
  },
  totalEarned: {
    type: Number,
    required: true,
    min: [0, 'Total earned cannot be negative']
  },
  commission: {
    rate: {
      type: Number,
      required: true,
      min: [0, 'Commission rate cannot be negative'],
      max: [100, 'Commission rate cannot exceed 100']
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Commission amount cannot be negative']
    }
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cash', 'digital_wallet', 'check'],
    default: 'bank_transfer'
  },
  paidAt: {
    type: Date,
    default: null
  },
  transactionId: {
    type: String,
    default: null
  },
  period: {
    year: {
      type: Number,
      required: true
    },
    month: {
      type: Number,
      required: true,
      min: [1, 'Month must be between 1 and 12'],
      max: [12, 'Month must be between 1 and 12']
    },
    week: {
      type: Number,
      required: true,
      min: [1, 'Week must be between 1 and 53'],
      max: [53, 'Week must be between 1 and 53']
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date,
    required: true
  }
});

// Calculate total before saving
earningsRecordSchema.pre('save', function(next) {
  if (this.isModified('baseAmount') || this.isModified('tip') || this.isModified('bonus') || this.isModified('deductions')) {
    this.totalEarned = this.baseAmount + this.tip + this.bonus - this.deductions;
  }
  next();
});

// Calculate period fields before saving
earningsRecordSchema.pre('save', function(next) {
  if (this.isNew) {
    const date = this.deliveredAt || new Date();
    this.period.year = date.getFullYear();
    this.period.month = date.getMonth() + 1;
    
    // Calculate week number
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const daysDiff = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
    this.period.week = Math.ceil((daysDiff + firstDayOfYear.getDay() + 1) / 7);
  }
  next();
});

// Index for efficient querying
earningsRecordSchema.index({ driver: 1, createdAt: -1 });
earningsRecordSchema.index({ driver: 1, 'period.year': 1, 'period.month': 1 });
earningsRecordSchema.index({ driver: 1, paymentStatus: 1 });
earningsRecordSchema.index({ order: 1 }, { unique: true });

// Static method to get earnings by driver and period
earningsRecordSchema.statics.getEarningsByPeriod = function(driverId, year, month = null) {
  const query = { 
    driver: driverId, 
    'period.year': year 
  };
  if (month) query['period.month'] = month;
  
  return this.find(query).populate('order', 'orderNumber deliveredAt');
};

// Static method to get total earnings for driver
earningsRecordSchema.statics.getTotalEarnings = function(driverId) {
  return this.aggregate([
    { $match: { driver: driverId } },
    {
      $group: {
        _id: null,
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
    }
  ]);
};

module.exports = mongoose.model('EarningsRecord', earningsRecordSchema);