const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireAdminOrDispatcher } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Financially sensitive report types are admin-only (SRS §17: "Sensitive
// financial reports are role restricted"); the rest are operational and
// visible to dispatchers too.
const ADMIN_ONLY_REPORT_TYPES = new Set(['payment-methods', 'driver-performance']);
const requireReportAccess = (req, res, next) => {
  if (ADMIN_ONLY_REPORT_TYPES.has(req.params.type)) {
    return requireAdmin(req, res, next);
  }
  return requireAdminOrDispatcher(req, res, next);
};

router.get('/dashboard', requireAdminOrDispatcher, reportController.getDashboard);
router.get('/device-capacity', requireAdminOrDispatcher, reportController.getDeviceCapacityInsights);
router.get('/:type', requireReportAccess, reportController.getReport);

module.exports = router;
