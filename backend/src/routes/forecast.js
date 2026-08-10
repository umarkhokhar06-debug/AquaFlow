const express = require('express');
const forecastController = require('../controllers/forecastController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireDeviceAccess = require('../middlewares/requireDeviceAccess');
const { requireAdmin, requireAdminOrDispatcher } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Owner, tenant, or admin can see a specific device's forecast
router.get('/devices/:deviceId', requireDeviceAccess, forecastController.getDeviceForecast);

// Admin/dispatcher: fleet-wide forecast and consumption trends
router.get('/trends', requireAdminOrDispatcher, forecastController.getConsumptionTrends);
router.get('/fleet', requireAdminOrDispatcher, forecastController.getFleetForecast);

// Admin-only: manually trigger the nightly scan (for testing/demo)
router.post('/run-nightly-scan', requireAdmin, forecastController.runNightlyScan);

module.exports = router;
