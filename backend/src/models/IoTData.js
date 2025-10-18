const mongoose = require('mongoose');

const iotDataSchema = new mongoose.Schema({
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

module.exports = mongoose.model('IoTData', iotDataSchema);