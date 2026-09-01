const Order = require('../models/Order');
const socketService = require('./socketService');

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // check every 5 minutes
const WINDOW_MIN_MS = 55 * 60 * 1000; // SRS §5.3: notify ~1-1.5h before delivery
const WINDOW_MAX_MS = 90 * 60 * 1000;

let timer = null;

// Scheduled + still unassigned orders whose delivery window is 55-90 min
// away get surfaced to the dispatch console with urgency, so a human
// dispatcher assigns a driver in time. notifiedAt dedupes so each order is
// only surfaced once, not on every 5-min tick while it sits in the window.
async function tick() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + WINDOW_MIN_MS);
  const windowEnd = new Date(now.getTime() + WINDOW_MAX_MS);

  try {
    const orders = await Order.find({
      deliveryType: 'scheduled',
      driver: null,
      notifiedAt: null,
      scheduledFor: { $gte: windowStart, $lte: windowEnd }
    }).populate('customer', 'name email fullName');

    for (const order of orders) {
      socketService.emitScheduledOrderUrgent({
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        scheduledFor: order.scheduledFor,
        deliveryAddress: order.deliveryAddress,
        isExpress: order.isExpress
      });
      order.notifiedAt = now;
      await order.save();
    }

    if (orders.length > 0) {
      console.log(`Scheduled order notify loop: surfaced ${orders.length} upcoming order(s) to dispatch`);
    }
  } catch (err) {
    console.error('Scheduled order notify loop failed:', err.message);
  }
}

function start() {
  if (timer) return;
  timer = setInterval(tick, CHECK_INTERVAL_MS);
  console.log('Scheduled order notify loop started (checks every 5 min, surfaces orders 55-90 min out)');
}

function stop() {
  clearInterval(timer);
  timer = null;
}

module.exports = { start, stop };
