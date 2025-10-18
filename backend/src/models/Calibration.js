const mongoose = require('mongoose');

const calibrationSchema = new mongoose.Schema({
  tank_depth: {
    type: Number,
    required: true
  },
  tank_full_distance: {
    type: Number,
    required: true
  },
  // Optionally, add userId or deviceId if needed for multi-user
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Calibration', calibrationSchema);