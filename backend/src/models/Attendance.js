const mongoose = require('mongoose');

// SRS §5: driver "attendance/operational records". One document per
// clock-in; clockOutAt stays null while the driver is on shift.
const attendanceSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  clockInAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  clockInLocation: {
    latitude: Number,
    longitude: Number
  },
  clockOutAt: {
    type: Date,
    default: null
  },
  clockOutLocation: {
    latitude: Number,
    longitude: Number
  }
});

attendanceSchema.index({ driver: 1, clockInAt: -1 });
// At most one open (clockOutAt: null) shift per driver at a time.
attendanceSchema.index(
  { driver: 1 },
  { unique: true, partialFilterExpression: { clockOutAt: null } }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
