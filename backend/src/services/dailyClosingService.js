const DailyClosing = require('../models/DailyClosing');
const auditLogService = require('./auditLogService');

function startOfDay(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

class DailyClosingService {
  async submit(driverId, payload) {
    const { cashCollected, onlineCollected, paymentProofUrl, notes, date } = payload;

    if (typeof cashCollected !== 'number' || cashCollected < 0) {
      const err = new Error('cashCollected is required and must be a non-negative number');
      err.status = 400;
      throw err;
    }

    const closingDate = startOfDay(date);

    const existing = await DailyClosing.findOne({ driver: driverId, date: closingDate });
    if (existing) {
      const err = new Error('A closing has already been submitted for this date');
      err.status = 409;
      throw err;
    }

    return DailyClosing.create({
      driver: driverId,
      date: closingDate,
      cashCollected,
      onlineCollected: onlineCollected || 0,
      paymentProofUrl,
      notes
    });
  }

  async getMine(driverId, { limit = 30 } = {}) {
    return DailyClosing.find({ driver: driverId }).sort({ date: -1 }).limit(limit);
  }

  async getAll({ status, driverId } = {}) {
    const query = {};
    if (status) query.status = status;
    if (driverId) query.driver = driverId;
    return DailyClosing.find(query)
      .populate('driver', 'name email')
      .populate('reconciledBy', 'name email')
      .sort({ date: -1 });
  }

  async reconcile(id, actorUser) {
    const closing = await DailyClosing.findById(id);
    if (!closing) {
      const err = new Error('Daily closing not found');
      err.status = 404;
      throw err;
    }
    if (closing.status === 'reconciled') {
      const err = new Error('This closing has already been reconciled');
      err.status = 400;
      throw err;
    }

    closing.status = 'reconciled';
    closing.reconciledBy = actorUser.id;
    closing.reconciledAt = new Date();
    await closing.save();

    await auditLogService.record({
      action: 'DAILY_CLOSING_RECONCILED',
      actorUser,
      targetUser: null,
      changes: { closingId: closing._id, driver: closing.driver, cashCollected: closing.cashCollected, onlineCollected: closing.onlineCollected }
    });

    return closing;
  }
}

module.exports = new DailyClosingService();
