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

module.exports = mongoose.model('Truck', truckSchema);
