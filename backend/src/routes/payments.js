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

// Saved payment methods -- must come before '/:orderId' so 'methods' isn't
// parsed as an orderId.
router.post('/methods/setup-intent', paymentController.createSetupIntent);
router.get('/methods', paymentController.listPaymentMethods);
router.delete('/methods/:paymentMethodId', paymentController.detachPaymentMethod);

router.get('/:orderId', paymentController.getPaymentStatus);
router.post('/:orderId/reconcile', paymentController.reconcile);
router.post('/:orderId/create-intent', paymentController.createIntent);

module.exports = router;
