const Order = require('../models/Order');
const User = require('../models/User');
const Truck = require('../models/Truck');
const DispatchLog = require('../models/DispatchLog');
const driverService = require('./driverService');

const DELAYED_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours out for delivery = delayed
const EXCEPTION_THRESHOLD_MS = 30 * 60 * 1000; // 30 min unassigned = exception
// Heuristic weight: one additional queued order is treated as roughly
// equivalent to this many km of extra distance when ranking drivers.
// Real traffic/route-aware scoring needs a maps/traffic provider, which is
// an open decision (SRS §26) — this is a working stand-in until then.
const WORKLOAD_KM_EQUIVALENT = 10;

function haversineKm(a, b) {
  if (!a || !b || typeof a.latitude !== 'number' || typeof b.latitude !== 'number') return null;
  const R = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

class DispatchService {
  // Live queue, categorized per SRS §6.
  async getQueue() {
    const now = Date.now();
    const orders = await Order.find({ status: { $nin: ['delivered', 'cancelled'] } })
      .populate('customer', 'name email fullName houseNumber portion address')
      .populate('driver', 'name email driverStatus')
      .sort({ orderDate: -1 });

    const queue = { exception: [], new: [], scheduled: [], delayed: [], active: [] };

    for (const order of orders) {
      const ageMs = now - new Date(order.orderDate).getTime();
      const isUnassignedPending = order.status === 'pending' && !order.driver;
      const isScheduledFuture = order.deliveryType === 'scheduled' &&
        order.scheduledFor && new Date(order.scheduledFor).getTime() > now;

      if (isScheduledFuture && !order.driver) {
        queue.scheduled.push(order);
      } else if (isUnassignedPending && ageMs > EXCEPTION_THRESHOLD_MS) {
        queue.exception.push(order);
      } else if (isUnassignedPending) {
        queue.new.push(order);
      } else if (
        order.status === 'out_for_delivery' &&
        order.deliveryDate &&
        now - new Date(order.deliveryDate).getTime() > DELAYED_THRESHOLD_MS
      ) {
        queue.delayed.push(order);
      } else if (order.driver) {
        queue.active.push(order);
      }
    }

    return queue;
  }

  // Ranks available drivers for a given order. Lower score = better.
  // Grounded in what we can actually measure today: straight-line distance
  // (haversine) and current queue workload. Traffic/route-aware distance
  // needs a maps provider decision (open, SRS §26).
  async recommendDriversForOrder(orderId) {
    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    const candidates = await User.find({
      userType: 'driver',
      driverStatus: { $ne: 'offline' },
      status: 'active'
    }).select('name email driverStatus location orderQueue maxQueueSize');

    const destination = order.deliveryAddress;

    const scored = candidates
      .filter(d => d.orderQueue.length < d.maxQueueSize)
      .map(d => {
        const distanceKm = haversineKm(d.location, destination);
        const workloadRatio = d.orderQueue.length / d.maxQueueSize;
        const distanceComponent = distanceKm === null ? 9999 : distanceKm;
        const score = distanceComponent + workloadRatio * WORKLOAD_KM_EQUIVALENT;

        return {
          driverId: d._id,
          name: d.name,
          email: d.email,
          driverStatus: d.driverStatus,
          distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
          queueLength: d.orderQueue.length,
          maxQueueSize: d.maxQueueSize,
          score
        };
      })
      .sort((a, b) => a.score - b.score);

    return {
      orderId: order._id,
      recommendations: scored,
      topRecommendation: scored[0] || null
    };
  }

  // Assign (or reassign) a driver to an order, logging whether the
  // dispatcher followed or overrode the top recommendation (SRS §6: "every
  // override is logged"). Pass recommendedDriverId if the caller already
  // fetched a recommendation, so we don't recompute it here.
  async assignOrder(orderId, driverId, dispatcherUser, { recommendedDriverId, reason } = {}) {
    const order = await Order.findById(orderId);
    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    const isReassignment = !!order.driver;
    const result = await driverService.assignOrderToDriver(orderId, driverId, dispatcherUser.id);

    const overrode = !!recommendedDriverId && recommendedDriverId.toString() !== driverId.toString();

    await DispatchLog.create({
      action: isReassignment ? 'ORDER_REASSIGNED' : 'ORDER_ASSIGNED',
      order: order._id,
      dispatcher: dispatcherUser.id,
      assignedDriver: driverId,
      recommendedDriver: recommendedDriverId || null,
      overrode,
      reason
    }).catch(err => console.error('DispatchLog write failed (non-fatal):', err.message));

    return { ...result, overrode };
  }

  // Live operations map: every driver's last known location/status, current
  // order, and truck (if assigned) — SRS §6 "Live driver/truck map".
  async getLiveMap() {
    const drivers = await User.find({ userType: 'driver' })
      .select('name email driverStatus location currentOrder orderQueue')
      .populate('currentOrder', 'orderNumber status deliveryAddress');

    const trucks = await Truck.find({ assignedDriver: { $ne: null } })
      .select('plateNumber status assignedDriver');
    const truckByDriver = new Map(trucks.map(t => [t.assignedDriver.toString(), t]));

    return drivers.map(d => ({
      driverId: d._id,
      name: d.name,
      email: d.email,
      driverStatus: d.driverStatus,
      location: d.location,
      currentOrder: d.currentOrder,
      queueLength: d.orderQueue.length,
      truck: truckByDriver.get(d._id.toString()) || null
    }));
  }

  // Allocation time, reassignment rate, delivery performance. Driver
  // utilization/idle time reuses the same statusHistory-walk approach as
  // Truck (see truckService._computeUtilization for the pattern).
  async getMetrics({ from, to } = {}) {
    const rangeStart = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rangeEnd = to ? new Date(to) : new Date();

    const assignedOrders = await Order.find({
      assignedAt: { $ne: null, $gte: rangeStart, $lte: rangeEnd }
    }).select('orderDate assignedAt status deliveryDate deliveredAt');

    const allocationTimesMs = assignedOrders
      .map(o => new Date(o.assignedAt) - new Date(o.orderDate))
      .filter(ms => ms >= 0);
    const avgAllocationMs = allocationTimesMs.length
      ? allocationTimesMs.reduce((a, b) => a + b, 0) / allocationTimesMs.length
      : null;

    const logs = await DispatchLog.find({ createdAt: { $gte: rangeStart, $lte: rangeEnd } });
    const reassignments = logs.filter(l => l.action === 'ORDER_REASSIGNED').length;
    const totalAssignments = logs.length;
    const reassignmentRate = totalAssignments ? Math.round((reassignments / totalAssignments) * 1000) / 10 : 0;

    const delivered = await Order.find({
      status: 'delivered',
      deliveredAt: { $ne: null, $gte: rangeStart, $lte: rangeEnd }
    }).select('deliveryDate deliveredAt');
    const onTime = delivered.filter(o => !o.deliveryDate || o.deliveredAt <= o.deliveryDate).length;
    const onTimePercent = delivered.length ? Math.round((onTime / delivered.length) * 1000) / 10 : null;

    return {
      rangeStart,
      rangeEnd,
      avgAllocationTimeMs: avgAllocationMs,
      totalAssignments,
      reassignments,
      reassignmentRatePercent: reassignmentRate,
      deliveredCount: delivered.length,
      onTimeDeliveryPercent: onTimePercent
    };
  }
}

module.exports = new DispatchService();
