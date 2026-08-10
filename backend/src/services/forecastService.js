const Device = require('../models/Device');
const Order = require('../models/Order');
const User = require('../models/User');
const DailyConsumption = require('../models/DailyConsumption');
const Notification = require('../models/Notification');
const iotDataService = require('./iotDataService');
const socketService = require('./socketService');

const TREND_WINDOW_DAYS = 14;
const REORDER_DAYS_REMAINING_THRESHOLD = 1; // "may run out by tomorrow"
const REORDER_COOLDOWN_HOURS = 24; // don't re-notify the same device more than once a day
// A level jump this large day-over-day is treated as a refill/delivery,
// not negative consumption.
const REFILL_JUMP_PERCENT = 15;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

class ForecastService {
  // One device's nightly snapshot: pulls the latest known reading, compares
  // against yesterday's snapshot to derive consumedLiters/wasRefill, and
  // stores today's row. Devices with no reading at all get a stale
  // snapshot reusing the last known level (SRS §22 offline-at-scan case).
  async recordDailyDeviceSnapshot(device, scanDate) {
    const today = startOfDay(scanDate);
    const latest = await iotDataService.getLatestData(device.deviceId);

    const { tank_depth, tank_full_distance } = device.calibration;
    let levelPercent = null;
    let stale = !latest;

    if (latest && typeof latest.tankLevel === 'number') {
      levelPercent = latest.tankLevel;
    } else {
      // Fall back to yesterday's level if nothing usable was ingested today
      const yesterday = await DailyConsumption.findOne({ device: device._id }).sort({ date: -1 });
      if (yesterday) {
        levelPercent = yesterday.levelPercent;
        stale = true;
      }
    }

    if (levelPercent === null) {
      return null; // never had any data for this device -- nothing to snapshot
    }

    const estimatedLitersRemaining = Math.round((levelPercent / 100) * device.tankCapacityLiters);

    const previous = await DailyConsumption.findOne({
      device: device._id,
      date: { $lt: today }
    }).sort({ date: -1 });

    let consumedLiters = null;
    let wasRefill = false;
    // Not a sensor error per se, but not a trustworthy reading either --
    // both get excluded from the consumption-rate average the same way.
    let flaggedForReview = Number.isNaN(levelPercent) || levelPercent < 0 || levelPercent > 100;

    if (previous && !stale && !flaggedForReview) {
      const delta = previous.estimatedLitersRemaining - estimatedLitersRemaining;
      const percentDelta = levelPercent - previous.levelPercent;
      if (percentDelta >= REFILL_JUMP_PERCENT) {
        wasRefill = true;
      } else if (delta > device.tankCapacityLiters) {
        // Implausible: this device supposedly "lost" more water in one day
        // than its tank could ever hold -- almost certainly a sensor
        // glitch (miscalibration, echo error, etc.), not real usage.
        flaggedForReview = true;
      } else {
        consumedLiters = Math.max(0, delta);
      }
    }

    return DailyConsumption.findOneAndUpdate(
      { device: device._id, date: today },
      { levelPercent, estimatedLitersRemaining, consumedLiters, wasRefill, stale, flaggedForReview },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Average daily consumption over the trailing window, ignoring refill
  // days and stale snapshots (neither represents an actual usage rate).
  async computeDeviceForecast(deviceId) {
    const device = await Device.findOne({ deviceId: deviceId.trim().toUpperCase() }) || await Device.findById(deviceId);
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }

    const since = startOfDay(new Date(Date.now() - TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000));
    const history = await DailyConsumption.find({ device: device._id, date: { $gte: since } }).sort({ date: 1 });

    const usageDays = history.filter(h => !h.wasRefill && !h.stale && !h.flaggedForReview && typeof h.consumedLiters === 'number');
    const avgDailyConsumptionLiters = usageDays.length
      ? usageDays.reduce((sum, h) => sum + h.consumedLiters, 0) / usageDays.length
      : null;

    const latest = history[history.length - 1] || null;
    const currentLiters = latest ? latest.estimatedLitersRemaining : null;

    const daysRemaining = (avgDailyConsumptionLiters && avgDailyConsumptionLiters > 0 && currentLiters !== null)
      ? Math.round((currentLiters / avgDailyConsumptionLiters) * 10) / 10
      : null;

    // Trend classification: compare the first half of the window's average
    // to the second half's -- "rapidly changing" if they diverge a lot.
    let trend = 'insufficient_data';
    if (usageDays.length >= 4) {
      const mid = Math.floor(usageDays.length / 2);
      const earlyAvg = usageDays.slice(0, mid).reduce((s, h) => s + h.consumedLiters, 0) / mid;
      const lateAvg = usageDays.slice(mid).reduce((s, h) => s + h.consumedLiters, 0) / (usageDays.length - mid);
      const change = earlyAvg > 0 ? (lateAvg - earlyAvg) / earlyAvg : 0;

      if (Math.abs(change) > 0.4) trend = 'rapidly_changing';
      else if (avgDailyConsumptionLiters > device.tankCapacityLiters * 0.15) trend = 'high_consumption';
      else if (avgDailyConsumptionLiters < device.tankCapacityLiters * 0.03) trend = 'low_consumption';
      else trend = 'stable';
    }

    return {
      deviceId: device.deviceId,
      name: device.name,
      houseLabel: device.houseLabel,
      currentLevelPercent: latest ? latest.levelPercent : null,
      currentLiters,
      avgDailyConsumptionLiters: avgDailyConsumptionLiters !== null ? Math.round(avgDailyConsumptionLiters) : null,
      daysRemaining,
      trend,
      historyDays: history.length
    };
  }

  async getConsumptionTrends() {
    const devices = await Device.find({ status: 'active' });
    const forecasts = await Promise.all(devices.map(d => this.computeDeviceForecast(d.deviceId).catch(() => null)));
    const valid = forecasts.filter(Boolean);

    return {
      highConsumption: valid.filter(f => f.trend === 'high_consumption'),
      lowConsumption: valid.filter(f => f.trend === 'low_consumption'),
      rapidlyChanging: valid.filter(f => f.trend === 'rapidly_changing'),
      all: valid
    };
  }

  // Next-day operational forecast for admin/dispatcher: expected orders,
  // volume, revenue, and driver/truck capacity check. Revenue/volume are
  // grounded in real historical order data (avg order value), not invented
  // per-liter pricing -- this app prices fixed tanker sizes, not by the liter.
  async getFleetForecast() {
    const devices = await Device.find({ status: 'active' });
    const forecasts = await Promise.all(devices.map(d => this.computeDeviceForecast(d.deviceId).catch(() => null)));
    const dueTomorrow = forecasts.filter(f => f && f.daysRemaining !== null && f.daysRemaining <= REORDER_DAYS_REMAINING_THRESHOLD);

    const recentOrders = await Order.find({
      orderDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      status: { $ne: 'cancelled' }
    }).select('totalAmount');
    const avgOrderValue = recentOrders.length
      ? recentOrders.reduce((s, o) => s + o.totalAmount, 0) / recentOrders.length
      : 0;

    const expectedOrders = dueTomorrow.length;
    const expectedRevenue = Math.round(expectedOrders * avgOrderValue);
    const expectedVolumeLiters = devices
      .filter(d => dueTomorrow.some(f => f.deviceId === d.deviceId))
      .reduce((sum, d) => sum + d.tankCapacityLiters, 0);

    const activeDrivers = await User.find({ userType: 'driver', driverStatus: { $ne: 'offline' } }).select('maxQueueSize');
    const avgQueueCapacity = activeDrivers.length
      ? activeDrivers.reduce((s, d) => s + (d.maxQueueSize || 5), 0) / activeDrivers.length
      : 5;
    const requiredDrivers = avgQueueCapacity > 0 ? Math.ceil(expectedOrders / avgQueueCapacity) : expectedOrders;

    return {
      forecastFor: startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      expectedOrders,
      expectedVolumeLiters,
      expectedRevenue,
      avgOrderValueUsed: Math.round(avgOrderValue),
      requiredDrivers,
      availableDrivers: activeDrivers.length,
      driverShortfall: Math.max(0, requiredDrivers - activeDrivers.length),
      devicesDueForReorder: dueTomorrow
    };
  }

  // Sends the "your water may run out" notification for devices predicted
  // to run out soon, respecting a per-device cooldown so it doesn't spam
  // (SRS §22: don't repeat within the configured cooldown period).
  async sendPredictiveReorderNotifications(deviceForecasts) {
    const sent = [];

    for (const forecast of deviceForecasts) {
      if (forecast.daysRemaining === null || forecast.daysRemaining > REORDER_DAYS_REMAINING_THRESHOLD) continue;

      const device = await Device.findOne({ deviceId: forecast.deviceId });
      if (!device) continue;

      const cooldownStart = new Date(Date.now() - REORDER_COOLDOWN_HOURS * 60 * 60 * 1000);
      const recent = await Notification.findOne({
        type: 'predictive_reorder',
        'data.deviceId': device.deviceId,
        createdAt: { $gte: cooldownStart }
      });
      if (recent) continue;

      const recipientIds = [device.owner.toString(), ...device.tenants.map(t => t.user.toString())];
      const message = `Based on your recent usage, ${device.name} (${device.houseLabel}) may run out of water by tomorrow. Would you like to place an order?`;

      await Promise.all(recipientIds.map(recipient =>
        Notification.create({
          recipient,
          title: 'Running low soon',
          message,
          type: 'predictive_reorder',
          priority: 'medium',
          data: {
            deviceId: device.deviceId,
            daysRemaining: forecast.daysRemaining,
            currentLevelPercent: forecast.currentLevelPercent,
            action: 'confirm_order'
          }
        })
      ));

      socketService.emitSystemNotification(message, 'info', `user-${device.owner}`);
      sent.push(device.deviceId);
    }

    return sent;
  }

  // The nightly job: snapshot every device, then evaluate predictive
  // reorder notifications off the fresh forecasts.
  async runNightlyScan(scanDate = new Date()) {
    const devices = await Device.find({ status: 'active' });
    const results = { scanned: 0, staleDevices: [], notified: [] };

    for (const device of devices) {
      const snapshot = await this.recordDailyDeviceSnapshot(device, scanDate);
      if (!snapshot) continue;
      results.scanned++;
      if (snapshot.stale) results.staleDevices.push(device.deviceId);
    }

    const forecasts = (await Promise.all(devices.map(d => this.computeDeviceForecast(d.deviceId).catch(() => null))))
      .filter(Boolean);
    results.notified = await this.sendPredictiveReorderNotifications(forecasts);

    return results;
  }
}

module.exports = new ForecastService();
