const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
  plateNumber: {
    type: String,
    required: [true, 'Please provide a plate number'],
    unique: true,
    trim: true,
    uppercase: true
  },
  status: {
    type: String,
    enum: ['active', 'idle', 'assigned', 'on_break', 'maintenance'],
    default: 'idle'
  },
  capacity: {
    type: Number,
    min: [1, 'Capacity must be positive']
  },
  // Source of truth for driver<->truck assignment (single-direction, like
  // Device.owner) — a driver's truck is found via Truck.findOne({ assignedDriver }).
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  registrationNumber: {
    type: String,
    trim: true
  },
  registrationExpiry: {
    type: Date
  },
  insurancePolicyNumber: {
    type: String,
    trim: true
  },
  insuranceExpiry: {
    type: Date
  },
  maintenanceHistory: [{
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters']
    },
    cost: {
      type: Number,
      min: [0, 'Cost cannot be negative']
    },
    performedAt: {
      type: Date,
      default: Date.now
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Every status transition gets appended here (see pre-save hook below) so
  // utilization/busy/idle time can be computed accurately over any date
  // range, instead of drifting running counters.
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    }
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

truckSchema.index({ assignedDriver: 1 });

truckSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('status')) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
  next();
});

module.exports = mongoose.model('Truck', truckSchema);
