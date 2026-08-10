const paymentService = require('../services/paymentService');
const Order = require('../models/Order');

class PaymentController {
  // Stripe requires the raw request body (unparsed) to verify the webhook
  // signature -- this route is mounted with express.raw() ahead of the
  // global JSON body parser in app.js.
  async handleWebhook(req, res) {
    const signature = req.headers['stripe-signature'];
    try {
      const result = await paymentService.handleWebhookEvent(req.body, signature);
      res.status(200).json(result);
    } catch (error) {
      console.error('Stripe webhook error:', error.message);
      res.status(400).json({ success: false, message: `Webhook error: ${error.message}` });
    }
  }

  // Retries payment setup for an order whose intent creation failed earlier
  // (e.g. gateway was down at order-creation time) or whose previous
  // attempt failed outright.
  async createIntent(req, res) {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      if (order.customer.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      if (order.paymentMethod === 'cash') {
        return res.status(400).json({ success: false, message: 'This order is set to pay by cash' });
      }
      if (order.paymentStatus === 'paid') {
        return res.status(400).json({ success: false, message: 'This order is already paid' });
      }

      const result = await paymentService.createPaymentIntent(order);
      res.status(200).json({ success: true, payment: result.alreadyPaid ? { status: 'succeeded' } : { clientSecret: result.clientSecret, paymentId: result.paymentId } });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to create payment intent' });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const order = await Order.findById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      const isOwner = order.customer.toString() === req.user.id.toString();
      const isStaff = ['admin', 'super_admin', 'dispatcher', 'call_center_agent'].includes(req.user.userType);
      if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this payment' });
      }

      const payment = await paymentService.getPaymentForOrder(req.params.orderId);
      res.status(200).json({
        success: true,
        paymentStatus: order.paymentStatus,
        payment: payment ? { id: payment._id, status: payment.status, amount: payment.amount, currency: payment.currency, provider: payment.provider } : null
      });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch payment status' });
    }
  }

  async reconcile(req, res) {
    try {
      const payment = await paymentService.getPaymentForOrder(req.params.orderId);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'No payment found for this order' });
      }
      const order = await Order.findById(req.params.orderId);
      const isOwner = order && order.customer.toString() === req.user.id.toString();
      const isStaff = ['admin', 'super_admin'].includes(req.user.userType);
      if (!isOwner && !isStaff) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      const reconciled = await paymentService.reconcilePayment(payment._id);
      res.status(200).json({ success: true, payment: { id: reconciled._id, status: reconciled.status } });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to reconcile payment' });
    }
  }

  async getTransactions(req, res) {
    try {
      const { from, to, status, page, limit } = req.query;
      const result = await paymentService.getTransactions({
        from, to, status, page: parseInt(page) || 1, limit: parseInt(limit) || 50
      });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to fetch transactions' });
    }
  }
}

module.exports = new PaymentController();
