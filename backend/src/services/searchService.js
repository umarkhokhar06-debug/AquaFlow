const User = require('../models/User');
const Device = require('../models/Device');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const SupportTicket = require('../models/SupportTicket');
const iotDataService = require('./iotDataService');
const dispatchService = require('./dispatchService');

// SRS §7: "Agents can search customer accounts, properties, tank/device
// status, orders, payments and complaints according to permissions." One
// query fanned out across the relevant collections rather than making the
// agent guess which screen to search from.
class SearchService {
  async globalSearch(query) {
    if (!query || !query.trim()) {
      const err = new Error('A search query is required');
      err.status = 400;
      throw err;
    }
    const q = query.trim();
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [customers, devices, orders, tickets] = await Promise.all([
      User.find({
        userType: 'customer',
        $or: [{ name: regex }, { email: regex }, { phoneNumber: regex }, { fullName: regex }]
      }).select('name email phoneNumber fullName houseNumber address status').limit(10),

      Device.find({
        $or: [{ deviceId: regex }, { name: regex }, { houseLabel: regex }]
      }).select('deviceId name houseLabel status tankCapacityLiters owner').populate('owner', 'name email').limit(10),

      Order.find({ orderNumber: regex })
        .select('orderNumber status paymentStatus totalAmount customer orderDate')
        .populate('customer', 'name email').limit(10),

      SupportTicket.find({
        $or: [{ ticketNumber: regex }, { subject: regex }]
      }).select('ticketNumber subject status priority category user assignedTo').populate('user', 'name email').limit(10)
    ]);

    // Payments are looked up via matched orders/customers rather than a
    // free-text field of their own (there's nothing human-readable on a
    // Payment record to text-match against).
    const relatedOrderIds = orders.map(o => o._id);
    const relatedCustomerIds = customers.map(c => c._id);
    const payments = (relatedOrderIds.length || relatedCustomerIds.length)
      ? await Payment.find({
          $or: [
            { order: { $in: relatedOrderIds } },
            { customer: { $in: relatedCustomerIds } }
          ]
        }).select('order customer provider status amount currency createdAt').limit(10)
      : [];

    return { customers, devices, orders, payments, complaints: tickets };
  }

  // SRS §6.2: one call bundling everything a call-center agent needs when a
  // customer calls in -- address/GPS, linked device + live tank status,
  // members/tenants, and recent order history with live status/ETA for
  // anything still active. Composed from existing per-domain lookups rather
  // than a new aggregate model, so it always reflects the same data the
  // customer's own app would show.
  async getCustomerProfile(customerId) {
    const customer = await User.findOne({ _id: customerId, userType: 'customer' })
      .select('name email phoneNumber fullName houseNumber portion address status createdAt');
    if (!customer) {
      const err = new Error('Customer not found');
      err.status = 404;
      throw err;
    }

    const devices = await Device.find({
      $or: [{ owner: customerId }, { 'tenants.user': customerId }]
    })
      .select('deviceId name houseLabel status tankCapacityLiters lowWaterThreshold lastSeenAt owner tenants')
      .populate('owner', 'name email')
      .populate('tenants.user', 'name email');

    const devicesWithLevel = await Promise.all(devices.map(async (device) => {
      const latest = await iotDataService.getLatestData(device.deviceId).catch(() => null);
      return {
        deviceId: device.deviceId,
        name: device.name,
        houseLabel: device.houseLabel,
        status: device.status,
        tankCapacityLiters: device.tankCapacityLiters,
        lowWaterThreshold: device.lowWaterThreshold,
        lastSeenAt: device.lastSeenAt,
        isOwner: device.owner._id.toString() === customerId.toString(),
        owner: device.owner,
        tenants: device.tenants,
        tankLevel: latest?.tankLevel ?? null,
        lastReadingAt: latest?.receivedAt ?? null
      };
    }));

    const recentOrders = await Order.find({ customer: customerId })
      .select('orderNumber status totalAmount paymentStatus orderDate deliveryType scheduledFor')
      .sort({ orderDate: -1 })
      .limit(10);

    const recentOrdersWithStatus = await Promise.all(recentOrders.map(async (order) => {
      let queueStatus = null;
      if (!['delivered', 'cancelled'].includes(order.status)) {
        queueStatus = await dispatchService.getCustomerQueueStatus(order._id, customerId).catch(() => null);
      }
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderDate: order.orderDate,
        deliveryType: order.deliveryType,
        scheduledFor: order.scheduledFor,
        position: queueStatus?.position ?? null,
        etaMinutes: queueStatus?.etaMinutes ?? null
      };
    }));

    return { customer, devices: devicesWithLevel, recentOrders: recentOrdersWithStatus };
  }
}

module.exports = new SearchService();
