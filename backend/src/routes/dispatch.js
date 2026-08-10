const express = require('express');
const dispatchController = require('../controllers/dispatchController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdminOrDispatcher } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdminOrDispatcher);

router.get('/queue', dispatchController.getQueue);
router.get('/map', dispatchController.getLiveMap);
router.get('/metrics', dispatchController.getMetrics);
router.get('/orders/:orderId/recommend', dispatchController.recommendDrivers);
router.put('/orders/:orderId/assign', dispatchController.assignOrder);

module.exports = router;
