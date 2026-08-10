const mongoose = require('mongoose');

// One row per payment attempt against an order (SRS §16: "Merchant
// settlement/reconciliation must allow transaction-level matching" and
// §21: "Payment integration must verify transaction status server-side
// before marking an order paid"). This is the transaction ledger --
// Order.paymentStatus is the summary flag, this is the audit trail behind it.
const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: String,
    enum: ['stripe'],
    default: 'stripe'
  },
  providerPaymentId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'refunded'],
    default: 'pending'
  },
  clientSecret: {
    type: String,
    select: false
  },
  // Last raw provider event applied to this record -- kept for manual
  // reconciliation/support investigation, not surfaced to customers.
  lastEvent: {
    type: mongoose.Schema.Types.Mixed,
    select: false
  },
  failureReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

paymentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
