const mongoose = require('mongoose');

// Denormalized user snapshot so history reads correctly even after the
// account's name/email/role changes again later.
const userSnapshotSchema = new mongoose.Schema({
  name: String,
  email: String,
  userType: String
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: [
      'ROLE_CHANGED', 'USER_CREATED', 'USER_BLOCKED', 'USER_UNBLOCKED', 'USER_DELETED',
      'EXPENSE_ADDED', 'EXPENSE_DELETED',
      'PROMO_CODE_CREATED', 'PROMO_CODE_UPDATED', 'PROMO_CODE_DELETED'
    ]
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  actorSnapshot: userSnapshotSchema,
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  targetSnapshot: userSnapshotSchema,
  // Free-form {before, after} or similar, shaped per action.
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
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

// Logs are immutable — no updatedAt, no update methods.
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ target: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
