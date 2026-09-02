const mongoose = require('mongoose');

// Short-lived phone verification codes -- additive to email/password auth,
// not a replacement (see otpService.js). One purpose today ('signup') but
// kept generic since password-reset-by-phone etc. would reuse this shape.
const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['signup'],
    default: 'signup'
  },
  expiresAt: {
    type: Date,
    required: true
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

otpSchema.index({ phoneNumber: 1, purpose: 1, createdAt: -1 });
// TTL cleanup -- expired codes disappear on their own instead of piling up.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', otpSchema);
