const express = require('express');
const iotController = require('../controllers/iotController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Get latest IoT data (simple route as requested)
router.get('/latest', iotController.getLatestData);

// Get all IoT data with pagination
router.get('/all', iotController.getAllData);

// Get IoT connection status
router.get('/status', iotController.getConnectionStatus);

// Manually connect to IoT (for testing)
router.post('/connect', iotController.connectToIoT);

module.exports = router;