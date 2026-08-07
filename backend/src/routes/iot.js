const express = require('express');
const iotController = require('../controllers/iotController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireDeviceAccess = require('../middlewares/requireDeviceAccess');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

// Device ingestion — no user auth, devices identify themselves by deviceId.
// This is what the simulator script (and later the real ESP32 firmware) calls.
router.post('/data', iotController.ingestData);

// IoT (AWS) connection status/testing — unrelated to any specific device
router.get('/status', iotController.getConnectionStatus);
router.post('/connect', iotController.connectToIoT);

// Admin: device simulator panel support
router.get('/latest-all', authMiddleware, requireAdmin, iotController.getLatestForAllDevices);
router.post('/randomize-all', authMiddleware, requireAdmin, iotController.randomizeAllDevices);

// Per-device reads, restricted to the device's owner/tenants/admin
router.get('/:deviceId/latest', authMiddleware, requireDeviceAccess, iotController.getLatestData);
router.get('/:deviceId/all', authMiddleware, requireDeviceAccess, iotController.getAllData);

module.exports = router;
