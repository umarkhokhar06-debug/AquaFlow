const mongoose = require('mongoose');

// SRS §4.7-4.8: a driver's monthly bonuses -- per-delivery tiering,
// punctuality, rating, and maintenance-care. Kept separate from
// EarningsRecord (which is strictly per-order) since these are computed
// over a whole month, not tied to any single delivery.
const driverBonusSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  year: { type: Number, required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  type: {
    type: String,
    enum: ['delivery_tier', 'punctuality', 'rating', 'maintenance'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Bonus amount cannot be negative']
  },
  // A short snapshot of the numbers that justified the award, for audit
  // trail purposes (e.g. { deliveryCount: 12, onTimeRate: 94 }).
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  awardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  awardedAt: {
    type: Date,
    default: Date.now
  }
});

// One award per driver/period/type -- awarding is idempotent, calling it
// again for an already-awarded type is a no-op rather than a duplicate.
driverBonusSchema.index({ driver: 1, year: 1, month: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('DriverBonus', driverBonusSchema);
