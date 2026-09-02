const Order = require('../models/Order');
const Truck = require('../models/Truck');
const User = require('../models/User');
const DriverBonus = require('../models/DriverBonus');
const systemConfigService = require('./systemConfigService');
const notificationService = require('./notificationService');
const auditLogService = require('./auditLogService');

// SRS §4.7: "first 10 deliveries at PKR 50... deliveries above 10: PKR 70
// per additional delivery." The SRS itself flags the period basis as
// unconfirmed ("the exact period basis must be confirmed in
// implementation") -- interpreted here as a DAILY tier (resets each day,
// matching "minimum daily target: 10 deliveries") summed across the month,
// since that's the literal reading of "first 10... 11th onward" and
// matches the daily-target framing right next to it.
const DEFAULTS = {
  driverDeliveryTier1Count: 10,
  driverDeliveryTier1Amount: 50,
  driverDeliveryTier2Amount: 70,
  driverPunctualityBonusAmount: 5000,
  // "subject to configured monthly eligibility rules" -- also left open by
  // the SRS; defined here as an on-time-delivery-rate threshold, backed by
  // SystemConfig so admins can actually tune it per §8.10 ("driver bonus
  // rules" is explicitly listed as a system-configuration item).
  driverPunctualityOnTimeRatePercent: 90,
  driverRatingBonusAmount: 1500,
  // A rating at or below this counts as a "qualifying negative review".
  driverNegativeReviewMaxScore: 2,
  driverMaintenanceBonusAmount: 1500
};

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
}

function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

class DriverBonusService {
  async _config() {
    const keys = Object.keys(DEFAULTS);
    const values = await Promise.all(keys.map(k => systemConfigService.get(k, DEFAULTS[k])));
    return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
  }

  // Pure computation -- never writes anything. Used both as an admin
  // preview and internally by awardMonthlyBonuses.
  async computeMonthlySummary(driverId, year, month) {
    const driver = await User.findById(driverId);
    if (!driver || driver.userType !== 'driver') {
      const err = new Error('Driver not found');
      err.status = 404;
      throw err;
    }

    const cfg = await this._config();
    const { start, end } = monthRange(year, month);

    const delivered = await Order.find({
      driver: driverId,
      status: 'delivered',
      deliveredAt: { $gte: start, $lt: end }
    }).select('deliveredAt deliveryDate rating');

    // Delivery tiering -- grouped by calendar day.
    const byDay = new Map();
    for (const order of delivered) {
      const key = dayKey(order.deliveredAt);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }
    let deliveryBonusTotal = 0;
    for (const count of byDay.values()) {
      const tier1 = Math.min(count, cfg.driverDeliveryTier1Count);
      const tier2 = Math.max(0, count - cfg.driverDeliveryTier1Count);
      deliveryBonusTotal += tier1 * cfg.driverDeliveryTier1Amount + tier2 * cfg.driverDeliveryTier2Amount;
    }

    // Punctuality -- on-time rate against the same measure used elsewhere
    // (dispatchService.getMetrics): on time if no deliveryDate commitment,
    // or delivered at/before it.
    const onTimeCount = delivered.filter(o => !o.deliveryDate || o.deliveredAt <= o.deliveryDate).length;
    const onTimeRate = delivered.length ? Math.round((onTimeCount / delivered.length) * 1000) / 10 : null;
    const punctualityEligible = delivered.length > 0 && onTimeRate >= cfg.driverPunctualityOnTimeRatePercent;

    // Rating -- disqualified by any qualifying negative review this month.
    const ratedOrders = delivered.filter(o => o.rating?.score);
    const negativeReview = ratedOrders.some(o => o.rating.score <= cfg.driverNegativeReviewMaxScore);
    const ratingEligible = !negativeReview;

    // Maintenance -- disqualified by any major repair on the driver's
    // currently-assigned truck this month. The data model only tracks a
    // truck's *current* driver, not historical per-period assignment, so
    // this checks the truck they're on now rather than whichever truck
    // they may have used earlier in the month if reassigned mid-month.
    const truck = await Truck.findOne({ assignedDriver: driverId }).select('maintenanceHistory');
    const majorRepairThisMonth = truck
      ? truck.maintenanceHistory.some(m => m.category === 'major_repair' && m.performedAt >= start && m.performedAt < end)
      : false;
    const maintenanceEligible = !majorRepairThisMonth;

    const alreadyAwarded = await DriverBonus.find({ driver: driverId, year, month }).select('type amount');
    const awardedTypes = new Set(alreadyAwarded.map(b => b.type));

    return {
      driverId,
      year,
      month,
      deliveryCount: delivered.length,
      deliveryTier: {
        amount: deliveryBonusTotal,
        eligible: deliveryBonusTotal > 0,
        awarded: awardedTypes.has('delivery_tier'),
        details: { deliveryCount: delivered.length, dayCount: byDay.size }
      },
      punctuality: {
        amount: cfg.driverPunctualityBonusAmount,
        eligible: punctualityEligible,
        awarded: awardedTypes.has('punctuality'),
        details: { onTimeRate, threshold: cfg.driverPunctualityOnTimeRatePercent }
      },
      rating: {
        amount: cfg.driverRatingBonusAmount,
        eligible: ratingEligible,
        awarded: awardedTypes.has('rating'),
        details: { ratedOrderCount: ratedOrders.length, negativeReview }
      },
      maintenance: {
        amount: cfg.driverMaintenanceBonusAmount,
        eligible: maintenanceEligible,
        awarded: awardedTypes.has('maintenance'),
        details: { hasTruck: !!truck, majorRepairThisMonth }
      }
    };
  }

  // Admin action: computes the summary and creates a DriverBonus record
  // for each eligible type not already awarded. Idempotent -- re-running
  // for the same period only awards whatever's newly eligible and unawarded.
  async awardMonthlyBonuses(driverId, year, month, actorUser) {
    const summary = await this.computeMonthlySummary(driverId, year, month);
    const toAward = [
      { type: 'delivery_tier', ...summary.deliveryTier },
      { type: 'punctuality', ...summary.punctuality },
      { type: 'rating', ...summary.rating },
      { type: 'maintenance', ...summary.maintenance }
    ].filter(b => b.eligible && !b.awarded && b.amount > 0);

    const awarded = [];
    for (const item of toAward) {
      try {
        const bonus = await DriverBonus.create({
          driver: driverId,
          year,
          month,
          type: item.type,
          amount: item.amount,
          details: item.details,
          awardedBy: actorUser.id
        });
        awarded.push(bonus);
      } catch (error) {
        if (error.code === 11000) continue; // already awarded concurrently -- skip, not an error
        throw error;
      }
    }

    if (awarded.length > 0) {
      const total = awarded.reduce((sum, b) => sum + b.amount, 0);
      await User.findByIdAndUpdate(driverId, {
        $inc: { 'earnings.totalEarned': total, 'earnings.currentMonthEarnings': total }
      });

      await notificationService.createNotification(
        driverId,
        'Monthly bonuses awarded',
        `You've been awarded Rs. ${total.toLocaleString()} in bonuses for ${month}/${year}.`,
        'payment_received',
        { year, month, types: awarded.map(b => b.type) },
        'medium'
      ).catch(() => {});

      const targetDriver = await User.findById(driverId).select('name email userType');
      await auditLogService.record({
        action: 'DRIVER_BONUS_AWARDED',
        actorUser,
        targetUser: targetDriver,
        changes: { year, month, awarded: awarded.map(b => ({ type: b.type, amount: b.amount })) }
      });
    }

    return { summary, awarded };
  }

  async getMine(driverId, { limit = 24 } = {}) {
    return DriverBonus.find({ driver: driverId }).sort({ year: -1, month: -1 }).limit(limit);
  }

  async getAll({ driverId, year, month } = {}) {
    const query = {};
    if (driverId) query.driver = driverId;
    if (year) query.year = Number(year);
    if (month) query.month = Number(month);
    return DriverBonus.find(query).populate('driver', 'name email').sort({ year: -1, month: -1 });
  }
}

module.exports = new DriverBonusService();
