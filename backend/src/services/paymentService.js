const Stripe = require('stripe');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const notificationService = require('./notificationService');
const socketService = require('./socketService');

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const CURRENCY = (process.env.STRIPE_CURRENCY || 'pkr').toLowerCase();

function requireStripeConfigured() {
  if (!stripe) {
    const err = new Error('Online payments are not configured on this server (STRIPE_SECRET_KEY missing)');
    err.status = 503;
    throw err;
  }
}

class PaymentService {
  // Called from order creation when paymentMethod is 'card'/'online'/'wallet'.
  // Reuses an existing pending intent instead of creating a duplicate charge
  // if one already exists for this order (SRS §22: "payment succeeds but
  // callback is delayed -- reconcile using provider status before duplicate
  // charging").
  async createPaymentIntent(order) {
    requireStripeConfigured();

    const existing = await Payment.findOne({ order: order._id, status: { $in: ['pending', 'succeeded'] } })
      .select('+clientSecret')
      .sort({ createdAt: -1 });

    if (existing) {
      const reconciled = await this.reconcilePayment(existing._id);
      if (reconciled.status === 'succeeded') {
        return { alreadyPaid: true, payment: reconciled };
      }
      if (reconciled.status === 'pending') {
        return { alreadyPaid: false, clientSecret: reconciled.clientSecret, paymentId: reconciled._id };
      }
      // fell through to failed/refunded -- fall through and create a fresh intent below
    }

    const amountMinorUnits = Math.round(order.totalAmount * 100);
    const intent = await stripe.paymentIntents.create({
      amount: amountMinorUnits,
      currency: CURRENCY,
      metadata: { orderId: order._id.toString(), orderNumber: order.orderNumber }
    });

    const payment = await Payment.create({
      order: order._id,
      customer: order.customer,
      provider: 'stripe',
      providerPaymentId: intent.id,
      amount: order.totalAmount,
      currency: CURRENCY,
      status: 'pending',
      clientSecret: intent.client_secret
    });

    return { alreadyPaid: false, clientSecret: intent.client_secret, paymentId: payment._id };
  }

  // Verifies the Stripe webhook signature and applies the event. This is the
  // server-side verification SRS §21 requires before an order is marked paid
  // -- the client never gets to declare its own payment successful.
  async handleWebhookEvent(rawBody, signature) {
    requireStripeConfigured();
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      const err = new Error('STRIPE_WEBHOOK_SECRET is not configured');
      err.status = 503;
      throw err;
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const intent = event.data.object;

    if (event.type === 'payment_intent.succeeded') {
      await this._applyStatus(intent.id, 'succeeded', event);
    } else if (event.type === 'payment_intent.payment_failed') {
      await this._applyStatus(intent.id, 'failed', event, intent.last_payment_error?.message || 'Payment failed');
    }

    return { received: true, type: event.type };
  }

  // Idempotent: re-applying the same terminal status is a no-op, so a
  // redelivered webhook (Stripe retries until 2xx) or a manual reconcile
  // racing the webhook can never double-process the same payment.
  async _applyStatus(providerPaymentId, status, rawEvent, failureReason = null) {
    const payment = await Payment.findOne({ providerPaymentId });
    if (!payment) return null;
    if (payment.status === status) return payment; // already applied
    if (payment.status === 'succeeded') return payment; // never downgrade a completed payment

    payment.status = status;
    payment.lastEvent = rawEvent;
    payment.failureReason = failureReason;
    await payment.save();

    if (status === 'succeeded') {
      // Only advance a still-pending order -- never overwrite an order a
      // human already resolved another way (e.g. cancelled/refunded).
      const order = await Order.findOneAndUpdate(
        { _id: payment.order, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'paid' } },
        { new: true }
      );
      if (order) {
        await notificationService.createNotification(
          payment.customer,
          'Payment received',
          `Your payment of ${payment.amount} for order ${order.orderNumber} was received.`,
          'payment_received',
          { orderId: order._id, paymentId: payment._id }
        );
        socketService.emitOrderUpdateToCustomer(payment.customer, order._id, 'payment_succeeded', { paymentStatus: 'paid' });
      }
    } else if (status === 'failed') {
      await notificationService.createNotification(
        payment.customer,
        'Payment failed',
        `Your payment for order ${payment.order} could not be completed${failureReason ? `: ${failureReason}` : '.'}`,
        'payment_failed',
        { orderId: payment.order, paymentId: payment._id }
      );
      socketService.emitOrderUpdateToCustomer(payment.customer, payment.order, 'payment_failed', { reason: failureReason });
    }

    return payment;
  }

  // Manual reconciliation: asks Stripe directly what the live status of a
  // payment is, rather than trusting only whatever local state/webhook
  // history exists. Used both when reusing a pending intent and via the
  // admin/customer-facing reconcile endpoint for support investigation.
  async reconcilePayment(paymentId) {
    requireStripeConfigured();
    const payment = await Payment.findById(paymentId).select('+clientSecret');
    if (!payment) {
      const err = new Error('Payment not found');
      err.status = 404;
      throw err;
    }
    if (payment.status === 'succeeded' || payment.status === 'refunded') {
      return payment;
    }

    const intent = await stripe.paymentIntents.retrieve(payment.providerPaymentId);
    if (intent.status === 'succeeded') {
      return this._applyStatus(payment.providerPaymentId, 'succeeded', intent);
    }
    if (['canceled', 'requires_payment_method'].includes(intent.status) && payment.status === 'pending') {
      // Leave as pending unless Stripe reports outright failure via webhook;
      // 'requires_payment_method' just means the customer hasn't paid yet.
      return payment;
    }
    return payment;
  }

  async getPaymentForOrder(orderId) {
    return Payment.findOne({ order: orderId }).sort({ createdAt: -1 });
  }

  async getTransactions({ from, to, status, page = 1, limit = 50 } = {}) {
    const query = {};
    if (status) query.status = status;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      Payment.find(query).populate('order', 'orderNumber totalAmount').populate('customer', 'name email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payment.countDocuments(query)
    ]);

    return { transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
}

module.exports = new PaymentService();
