const express = require('express');
const systemConfigController = require('../controllers/systemConfigController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireAdminOrCustomer } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Customer-facing: just the express fee, needed before order confirmation
router.get('/express-fee', requireAdminOrCustomer, systemConfigController.getExpressFee);

// Admin-only management
router.get('/admin', requireAdmin, systemConfigController.getAllConfig);
router.put('/admin', requireAdmin, systemConfigController.updateConfig);

module.exports = router;
