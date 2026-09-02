const mongoose = require('mongoose');

// SRS §8.7: admin enters daily fuel quantity/cost and kilometers driven per
// truck; mileage and fuel-cost-per-km are computed off these, never entered
// directly.
const fuelLogSchema = new mongoose.Schema({
  truck: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Truck',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  fuelQuantityLiters: {
    type: Number,
    required: true,
    min: [0, 'Fuel quantity cannot be negative']
  },
  fuelCost: {
    type: Number,
    min: [0, 'Fuel cost cannot be negative']
  },
  kmDriven: {
    type: Number,
    required: true,
    min: [0, 'Kilometers driven cannot be negative']
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
});

// One entry per truck per day.
fuelLogSchema.index({ truck: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('FuelLog', fuelLogSchema);
