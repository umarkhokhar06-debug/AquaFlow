const mongoose = require('mongoose');

const iotDataSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    required: true
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