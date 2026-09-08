const mongoose = require('mongoose');

// Minimal crash-reporting sink for the mobile app. Deliberately unauthenticated
// (a crash can happen before login ever succeeds -- e.g. right after the app
// launches) and deliberately schema-loose, since the whole point is to catch
// whatever a real device's JS runtime throws without losing information to a
// strict validator.
const clientErrorLogSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  stack: {
    type: String,
    maxlength: 8000
  },
  isFatal: {
    type: Boolean,
    default: false
  },
  screen: {
    type: String,
    maxlength: 200
  },
  platform: {
    type: String,
    maxlength: 50
  },
  appVersion: {
    type: String,
    maxlength: 50
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userType: {
    type: String,
    maxlength: 50
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

clientErrorLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ClientErrorLog', clientErrorLogSchema);
