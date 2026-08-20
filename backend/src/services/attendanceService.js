const Attendance = require('../models/Attendance');

function dateFilter(from, to) {
  if (!from && !to) return undefined;
  const filter = {};
  if (from) filter.$gte = new Date(from);
  if (to) filter.$lte = new Date(to);
  return filter;
}

const attendanceService = {
  async clockIn(driverId, location) {
    const open = await Attendance.findOne({ driver: driverId, clockOutAt: null });
    if (open) {
      const err = new Error('Already clocked in for an open shift');
      err.status = 400;
      throw err;
    }

    return Attendance.create({
      driver: driverId,
      clockInAt: new Date(),
      clockInLocation: location || undefined
    });
  },

  async clockOut(driverId, location) {
    const open = await Attendance.findOne({ driver: driverId, clockOutAt: null }).sort({ clockInAt: -1 });
    if (!open) {
      const err = new Error('Not currently clocked in');
      err.status = 400;
      throw err;
    }

    open.clockOutAt = new Date();
    if (location) open.clockOutLocation = location;
    await open.save();
    return open;
  },

  async getStatus(driverId) {
    const open = await Attendance.findOne({ driver: driverId, clockOutAt: null });
    return { clockedIn: !!open, since: open?.clockInAt || null };
  },

  async getMyAttendance(driverId, { from, to } = {}) {
    const query = { driver: driverId };
    const clockInAt = dateFilter(from, to);
    if (clockInAt) query.clockInAt = clockInAt;
    return Attendance.find(query).sort({ clockInAt: -1 });
  },

  // Admin/dispatcher view across all drivers (SRS §5 "operational records").
  async getAllAttendance({ from, to, driverId } = {}) {
    const query = {};
    if (driverId) query.driver = driverId;
    const clockInAt = dateFilter(from, to);
    if (clockInAt) query.clockInAt = clockInAt;
    return Attendance.find(query).populate('driver', 'name email').sort({ clockInAt: -1 });
  }
};

module.exports = attendanceService;
