const express = require('express');
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireDriver, requireCustomer, requireAdminOrDriver, requireAdminOrCustomer } = require('../middlewares/authorizationMiddleware');

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

// Driver and Admin routes
router.get('/', requireAdminOrDriver, orderController.getAllOrders);
router.put('/:orderId/status', requireAdminOrDriver, orderController.updateOrderStatus);

// Admin only routes
router.put('/:orderId/assign-driver', requireAdmin, orderController.assignDriver);
router.get('/admin/statistics', requireAdmin, orderController.getOrderStatistics);

module.exports = router;
