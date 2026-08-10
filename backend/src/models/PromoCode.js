const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Please provide a promo code'],
    unique: true,
    trim: true,
    uppercase: true
  },
  discountPercent: {
    type: Number,
    required: [true, 'Please provide a discount percentage'],
    min: [1, 'Discount must be at least 1%'],
    max: [100, 'Discount cannot exceed 100%']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  validFrom: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    default: null // null = no expiry
  },
  usageLimit: {
    type: Number,
    default: null, // null = unlimited
    min: [1, 'Usage limit must be at least 1']
  },
  perCustomerLimit: {
    type: Number,
    default: 1,
    min: [1, 'Per-customer limit must be at least 1']
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order amount cannot be negative']
  },
  // Empty/absent = applies to all product types
  applicableProductTypes: {
    type: [String],
    default: []
  },
  // Redemption history, embedded (same pattern as Device.tenants/invites) --
  // small enough per code, and this is exactly what SRS §14 means by
  // "records redemption history" / "usage and discount impact in reports".
  redemptions: [{
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    discountAmount: { type: Number, required: true },
    redeemedAt: { type: Date, default: Date.now }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

promoCodeSchema.index({ 'redemptions.customer': 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
