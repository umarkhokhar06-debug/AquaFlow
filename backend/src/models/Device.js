const mongoose = require('mongoose');
const { ADMIN_TIER_ROLES } = require('../constants/roles');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Please provide a device ID'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Please provide a device name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  // The house/property this device is installed at, for admin identification
  houseLabel: {
    type: String,
    required: [true, 'Please provide a house label for admin identification'],
    trim: true,
    maxlength: [200, 'House label cannot exceed 200 characters']
  },
  // The primary customer responsible for this device/house
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Device must have an owner']
  },
  // Additional users (tenants) granted read access to this device
  tenants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  invites: [{
    token: {
      type: String,
      required: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    used: {
      type: Boolean,
      default: false
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }],
  calibration: {
    tank_depth: {
      type: Number,
      required: [true, 'Please provide tank depth'],
      min: [1, 'Tank depth must be positive']
    },
    tank_full_distance: {
      type: Number,
      required: [true, 'Please provide tank full distance'],
      min: [0, 'Tank full distance cannot be negative']
    }
  },
  tankCapacityLiters: {
    type: Number,
    min: [1, 'Tank capacity must be positive'],
    default: 1000
  },
  lowWaterThreshold: {
    type: Number,
    default: 20,
    min: [0, 'Threshold cannot be negative'],
    max: [100, 'Threshold cannot exceed 100']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  isSimulated: {
    type: Boolean,
    default: false
  },
  lastSeenAt: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // SRS §8: "Device installation, calibration, replacement and service
  // history must be retained." Append-only; entries are never edited or
  // removed. Replacement/removal itself is additionally mirrored into
  // AuditLog (action DEVICE_REMOVED) since that history must survive even
  // after this document is deleted.
  history: [{
    event: {
      type: String,
      enum: ['installed', 'calibrated', 'status_changed'],
      required: true
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    at: {
      type: Date,
      default: Date.now
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }]
});

deviceSchema.index({ owner: 1 });
deviceSchema.index({ 'tenants.user': 1 });
deviceSchema.index({ 'invites.token': 1 });

// True if the given userId is the owner, a tenant, or an admin
deviceSchema.methods.isAccessibleBy = function(user) {
  if (!user) return false;
  if (ADMIN_TIER_ROLES.includes(user.userType)) return true;
  const userId = user.id?.toString() || user._id?.toString();
  if (this.owner.toString() === userId) return true;
  return this.tenants.some(t => t.user.toString() === userId);
};

module.exports = mongoose.model('Device', deviceSchema);
