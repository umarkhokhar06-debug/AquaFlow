const mongoose = require('mongoose');

// SRS §4.6: a driver's end-of-day cash/online collection summary, submitted
// for admin reconciliation. paymentProofUrl is a link rather than an
// uploaded file -- this backend has no file-storage integration yet (no
// multer/S3/Cloudinary anywhere in the codebase), so this stores whatever
// proof link the driver already has rather than inventing upload infra
// unprompted; a real "attach a photo" flow needs that decided first.
const dailyClosingSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Calendar date this closing covers, normalized to midnight so there's
  // at most one closing per driver per day.
  date: {
    type: Date,
    required: true
  },
  cashCollected: {
    type: Number,
    required: true,
    min: [0, 'Cash collected cannot be negative']
  },
  onlineCollected: {
    type: Number,
    default: 0,
    min: [0, 'Online collected cannot be negative']
  },
  paymentProofUrl: {
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
    enum: ['submitted', 'reconciled'],
    default: 'submitted'
  },
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reconciledAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

dailyClosingSchema.index({ driver: 1, date: 1 }, { unique: true });
dailyClosingSchema.index({ status: 1 });

module.exports = mongoose.model('DailyClosing', dailyClosingSchema);
