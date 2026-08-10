const express = require('express');
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

// Note: the raw-body webhook route is mounted separately in app.js, ahead
// of express.json(), since Stripe signature verification needs the
// untouched request body.

router.use(authMiddleware);

router.get('/transactions', requireAdmin, paymentController.getTransactions);
router.get('/:orderId', paymentController.getPaymentStatus);
router.post('/:orderId/reconcile', paymentController.reconcile);
router.post('/:orderId/create-intent', paymentController.createIntent);

module.exports = router;
