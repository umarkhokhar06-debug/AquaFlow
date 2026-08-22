const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireDriver, requireCustomer, requireAdminOrDriver, requireAdminOrCustomer, requireAdminOrDispatcher, requireAnyRole } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

// Public routes (no authentication required)
router.get('/products', orderController.getAvailableProducts);

// Protected routes (authentication required)
router.use(authMiddleware);

// Customer routes
router.post('/', requireCustomer, orderController.createOrder);
router.get('/my-orders', requireCustomer, orderController.getCustomerOrders);
router.get('/:orderId', orderController.getOrderById);
router.put('/:orderId/cancel', orderController.cancelOrder);
router.get('/:orderId/delivery-otp', requireCustomer, orderController.getDeliveryOtp);
router.post('/:orderId/rating', requireCustomer, orderController.rateOrder);
router.get('/:orderId/invoice', orderController.getInvoice);
router.post('/:orderId/reorder', requireCustomer, orderController.reorder);
router.get('/:orderId/queue-status', requireCustomer, orderController.getQueueStatus);

// Driver, Dispatcher and Admin routes
router.get('/', requireAnyRole(['admin', 'super_admin', 'driver', 'dispatcher']), orderController.getAllOrders);
router.put('/:orderId/status', requireAdminOrDriver, orderController.updateOrderStatus);

// Dispatcher and Admin routes
router.put('/:orderId/assign-driver', requireAdminOrDispatcher, orderController.assignDriver);

// Admin only routes
router.get('/admin/statistics', requireAdmin, orderController.getOrderStatistics);

module.exports = router;
