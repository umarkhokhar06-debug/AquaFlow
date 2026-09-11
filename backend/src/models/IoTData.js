const mongoose = require('mongoose');

const iotDataSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  // Optional -- not every device has a DHT sensor (e.g. tank-level-only
  // ultrasonic units), so these are only populated when the reading
  // includes them.
  humidity: {
    type: Number,
    required: false
  },
  temperature: {
    type: Number,
    required: false
  },
  distance: {
    type: Number,
    required: false
  },
  tankLevel: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  }
});

iotDataSchema.index({ device: 1, receivedAt: -1 });

module.exports = mongoose.model('IoTData', iotDataSchema);