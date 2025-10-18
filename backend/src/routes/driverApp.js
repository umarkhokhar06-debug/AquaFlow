const express = require('express');
const driverAppController = require('../controllers/driverAppController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireDriverAccess = require('../middlewares/requireDriverAccess');
const supportService = require('../services/supportService');

const router = express.Router();

// Public routes (no authentication required)
router.post('/auth/register', driverAppController.register);
router.post('/auth/login', driverAppController.login);

// Protected routes (authentication + driver access required)
router.use(authMiddleware);
router.use(requireDriverAccess);

// Debug logging middleware for all driver routes
router.use((req, res, next) => {
  console.log(`[DRIVER ROUTE] ${req.method} ${req.originalUrl}`);
  next();
});

// Profile management
router.get('/profile', driverAppController.getProfile);
router.put('/profile', driverAppController.updateProfile);

// Order management
router.get('/orders', driverAppController.getOrders);
router.get('/orders/:orderId', driverAppController.getOrderDetails);
router.put('/orders/:orderId/status', driverAppController.updateOrderStatus);

// Dashboard
router.get('/dashboard/stats', driverAppController.getDashboardStats);

// Notifications
router.get('/notifications', driverAppController.getNotifications);
router.put('/notifications/:notificationId/read', driverAppController.markNotificationAsRead);
router.put('/notifications/mark-all-read', driverAppController.markAllNotificationsAsRead);

// Location tracking
router.put('/location', driverAppController.updateLocation);

// Vehicle management
router.get('/vehicle', driverAppController.getVehicleInfo);
router.put('/vehicle', driverAppController.updateVehicleInfo);

// Support
router.post('/support/tickets', driverAppController.createSupportTicket);
router.get('/support/tickets', driverAppController.getSupportTickets);
router.get('/support/faqs', async (req, res) => {
  try {
    const faqs = await supportService.getFAQs();
    res.status(200).json({
      success: true,
      data: faqs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error retrieving FAQs'
    });
  }
});

// Settings
router.put('/settings', driverAppController.updateSettings);

// Earnings
router.get('/earnings', driverAppController.getEarnings);

// Driver status
router.put('/status', driverAppController.updateDriverStatus);

// Enhanced error handler for driver routes
router.use((err, req, res, next) => {
  console.error(`[DRIVER ROUTE ERROR] ${req.method} ${req.originalUrl}`);
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = router;