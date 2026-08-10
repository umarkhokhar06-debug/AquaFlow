const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    required: true,
    enum: ['order_assigned', 'order_cancelled', 'payment_received', 'payment_failed', 'system_update', 'promotional', 'emergency', 'predictive_reorder'],
    default: 'system_update'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  // SRS §18: "delivery status should be stored." Push always attempted for
  // every notification; SMS only for CRITICAL_SMS_TYPES and only if the
  // recipient has a phone number, SMS preference on, and Twilio configured.
  deliveryStatus: {
    push: { type: String, enum: ['not_attempted', 'sent', 'failed'], default: 'not_attempted' },
    sms: { type: String, enum: ['not_attempted', 'sent', 'failed', 'skipped'], default: 'not_attempted' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  readAt: {
    type: Date,
    default: null
  }
});

// Index for efficient querying
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Static method to get unread notifications for user
notificationSchema.statics.getUnreadForUser = function(userId) {
  return this.find({ 
    recipient: userId, 
    isRead: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  }).sort({ createdAt: -1 });
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsReadForUser = function(userId) {
  return this.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

module.exports = mongoose.model('Notification', notificationSchema);