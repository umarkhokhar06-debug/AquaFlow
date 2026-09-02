const mongoose = require('mongoose');

// SRS §7 / §3.11: a customer with no device requests one, an installer
// visits the house, and completing the visit creates the real Device
// record (see installationService.completeInstallation). Kept as its own
// model rather than a Device sub-document since a request can exist -- and
// needs to be tracked/assigned -- before any Device exists at all.
const installationSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    type: String,
    trim: true,
    maxlength: [300, 'Address cannot exceed 300 characters']
  },
  contactPhone: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['requested', 'assigned', 'completed', 'cancelled'],
    default: 'requested'
  },
  assignedInstaller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: { type: Date, default: null },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  // Filled in by the installer on-site when the visit is completed.
  intake: {
    deviceId: { type: String, trim: true, uppercase: true },
    houseLabel: { type: String, trim: true },
    ownerName: { type: String, trim: true },
    numberOfUsers: { type: Number, min: 1 },
    tankLengthCm: { type: Number, min: 1 },
    tankWidthCm: { type: Number, min: 1 },
    tankHeightCm: { type: Number, min: 1 },
    tank_depth: { type: Number, min: 1 },
    tank_full_distance: { type: Number, min: 0 },
    tankCapacityLiters: { type: Number, min: 1 },
    // Customer's expected monthly tanker demand, for forecasting (SRS §7).
    expectedMonthlyDemand: { type: Number, min: 0 }
  },
  completedAt: { type: Date, default: null },
  // Set once completion creates the real Device record.
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    default: null
  },
  createdAt: { type: Date, default: Date.now }
});

installationSchema.index({ requestedBy: 1 });
installationSchema.index({ assignedInstaller: 1 });
installationSchema.index({ status: 1 });

module.exports = mongoose.model('Installation', installationSchema);
