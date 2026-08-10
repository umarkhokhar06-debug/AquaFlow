const mongoose = require('mongoose');

// One snapshot per device per day, taken by the nightly scan job. Raw
// IoTData can have many readings a day (or none) — this is the cleaned,
// once-daily series that consumption trends and forecasts are computed from.
const dailyConsumptionSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  levelPercent: {
    type: Number,
    min: 0,
    max: 100
  },
  estimatedLitersRemaining: {
    type: Number,
    min: 0
  },
  // Positive = liters used since yesterday's snapshot. Negative/absent when
  // the level went up (a refill happened, see wasRefill) or there's no
  // prior snapshot to compare against yet.
  consumedLiters: {
    type: Number,
    default: null
  },
  wasRefill: {
    type: Boolean,
    default: false
  },
  // True when no fresh reading was available at scan time and this snapshot
  // reuses the last known reading (SRS §22 edge case: device offline at
  // nightly scan). Stale snapshots are excluded from consumption-rate math.
  stale: {
    type: Boolean,
    default: false
  },
  // True when the computed day-over-day change is physically implausible
  // (e.g. "lost" more water than the tank could ever hold) -- almost
  // certainly a sensor glitch, not real usage. SRS §22: "Unexpected sensor
  // reading: flag for validation rather than generating a confident
  // forecast." Excluded from consumption-rate math, same as stale days.
  flaggedForReview: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

dailyConsumptionSchema.index({ device: 1, date: -1 }, { unique: true });

module.exports = mongoose.model('DailyConsumption', dailyConsumptionSchema);
