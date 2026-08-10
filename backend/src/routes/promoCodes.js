const express = require('express');
const promoController = require('../controllers/promoController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin, requireCustomer } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Customer-facing: preview a discount before checkout
router.get('/check/:code', requireCustomer, promoController.checkPromoCode);

// Admin-only management
router.post('/', requireAdmin, promoController.createPromoCode);
router.get('/', requireAdmin, promoController.getAllPromoCodes);
router.get('/:id', requireAdmin, promoController.getPromoCodeById);
router.put('/:id', requireAdmin, promoController.updatePromoCode);
router.delete('/:id', requireAdmin, promoController.deletePromoCode);
router.get('/:id/usage', requireAdmin, promoController.getUsageReport);

module.exports = router;
