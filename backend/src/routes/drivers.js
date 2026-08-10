const express = require('express');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireDriver, requireAdminOrDriver, requireAdminOrDispatcher } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ============ PROFILE ROUTES (Driver only) ============
router.get('/profile', requireDriver, driverController.getProfile);
router.put('/profile', requireDriver, driverController.updateProfile);
router.put('/vehicle', requireDriver, driverController.updateVehicleInfo);
router.put('/settings', requireDriver, driverController.updateSettings);

// ============ ADMIN ROUTES ============
// Admin and Dispatcher: viewing drivers is part of live dispatch operations
router.get('/', requireAdminOrDispatcher, driverController.getAllDrivers);
router.get('/search', requireAdminOrDispatcher, driverController.searchDrivers);
router.get('/statistics', requireAdmin, driverController.getDriverStatistics);
router.get('/:driverId', requireAdminOrDispatcher, driverController.getDriverById);
router.put('/:driverId/status', requireAdmin, driverController.updateDriverStatus);
router.put('/:driverId/queue/reorder', requireAdmin, driverController.reorderDriverQueue);
router.delete('/:driverId/queue/:orderId', requireAdmin, driverController.removeOrderFromQueue);

// Admin and Driver routes
router.put('/:driverId/location', requireAdminOrDriver, driverController.updateDriverLocation);

// Driver only routes
router.put('/:driverId/complete-order', requireDriver, driverController.completeCurrentOrder);

// Order assignment (Admin only)
router.put('/:driverId/assign/:orderId', requireAdmin, driverController.assignOrderToDriver);

module.exports = router;
