const mongoose = require('mongoose');

// Order-centric operational log for dispatch actions (assignment,
// reassignment, and AI-recommendation overrides). Kept separate from
// AuditLog, which is user-account-centric (role changes, employee
// creation, block/delete) — different subject, different shape.
const dispatchLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['ORDER_ASSIGNED', 'ORDER_REASSIGNED']
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  dispatcher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The top-ranked driver from the recommendation engine at assignment
  // time, if a recommendation was computed. Null if the dispatcher assigned
  // directly without requesting a recommendation first.
  recommendedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  overrode: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

dispatchLogSchema.index({ order: 1, createdAt: -1 });
dispatchLogSchema.index({ dispatcher: 1, createdAt: -1 });

module.exports = mongoose.model('DispatchLog', dispatchLogSchema);
