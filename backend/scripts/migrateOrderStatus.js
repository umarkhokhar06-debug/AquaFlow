// One-time migration: old generic e-commerce status enum -> new SRS-aligned
// tanker-delivery lifecycle. Run manually before deploying the backend that
// includes this change (not an automatic boot hook, to avoid surprise
// mutations on every restart):
//
//   node scripts/migrateOrderStatus.js
//
// Mapping is derived from actual prior behavior, not just the status names:
// 'confirmed' was set by the webapp immediately after a driver was assigned
// (see the old OrderManagement.jsx double-call this rework removes), so it
// maps to 'driver_assigned', not 'queued'. 'pending' was the resting state
// for orders still waiting on a driver, so it maps to 'queued'.
require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../src/models/Order');

const STATUS_MAP = {
  pending: 'queued',
  confirmed: 'driver_assigned',
  preparing: 'going_to_filling_station',
  out_for_delivery: 'on_the_way',
  // delivered, cancelled unchanged -- omitted, handled by the $nin below.
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const oldStatuses = Object.keys(STATUS_MAP);
  const orders = await Order.find({ status: { $in: oldStatuses } });
  console.log(`Found ${orders.length} order(s) with a pre-migration status.`);

  let migrated = 0;
  for (const order of orders) {
    const oldStatus = order.status;
    const newStatus = STATUS_MAP[oldStatus];
    if (!newStatus) continue;

    order.status = newStatus;
    // Best-effort backfill: we don't know the real per-stage timestamps for
    // pre-existing orders, so record one entry at the order's last known
    // updatedAt as an approximation rather than leaving statusHistory empty.
    if (!order.statusHistory || order.statusHistory.length === 0) {
      order.statusHistory = [{ status: newStatus, changedAt: order.updatedAt || order.orderDate }];
    } else {
      order.statusHistory.push({ status: newStatus, changedAt: new Date() });
    }

    await order.save();
    migrated += 1;
    console.log(`  ${order.orderNumber}: ${oldStatus} -> ${newStatus}`);
  }

  console.log(`Migrated ${migrated} order(s).`);

  const remaining = await Order.countDocuments({ status: { $in: oldStatuses } });
  if (remaining > 0) {
    console.error(`WARNING: ${remaining} order(s) still have a pre-migration status after running.`);
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
