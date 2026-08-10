const User = require('../models/User');
const Device = require('../models/Device');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const SupportTicket = require('../models/SupportTicket');

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
}

module.exports = new SearchService();
