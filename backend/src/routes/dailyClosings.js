const express = require('express');
const dailyClosingController = require('../controllers/dailyClosingController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireDriverAccess = require('../middlewares/requireDriverAccess');
const { requireAdminOrDispatcher } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Driver: submit today's closing, view their own history
router.post('/', requireDriverAccess, dailyClosingController.submit);
router.get('/mine', requireDriverAccess, dailyClosingController.getMine);

// Admin/dispatcher: reconciliation
router.get('/', requireAdminOrDispatcher, dailyClosingController.getAll);
router.put('/:id/reconcile', requireAdminOrDispatcher, dailyClosingController.reconcile);

module.exports = router;
