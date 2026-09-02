const express = require('express');
const driverBonusController = require('../controllers/driverBonusController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireDriverAccess = require('../middlewares/requireDriverAccess');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Driver: their own bonus history
router.get('/mine', requireDriverAccess, driverBonusController.getMine);

// Admin: preview a driver's monthly bonus eligibility, then award it
router.get('/', requireAdmin, driverBonusController.getAll);
router.get('/:driverId/preview', requireAdmin, driverBonusController.preview);
router.post('/award', requireAdmin, driverBonusController.award);

module.exports = router;
