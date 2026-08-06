const express = require('express');
const deviceController = require('../controllers/deviceController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Devices the current user owns or has tenant access to
router.get('/my', deviceController.getMyDevices);

// Admin device management
router.post('/', requireAdmin, deviceController.createDevice);
router.get('/', requireAdmin, deviceController.getAllDevices);
router.get('/:id', requireAdmin, deviceController.getDeviceById);
router.put('/:id', requireAdmin, deviceController.updateDevice);
router.delete('/:id', requireAdmin, deviceController.deleteDevice);

// Tenant access management (owner or admin)
router.post('/:id/tenants', deviceController.addTenant);
router.delete('/:id/tenants/:userId', deviceController.removeTenant);

// Invite links (owner or admin creates, any logged-in user redeems)
router.post('/:id/invites', deviceController.createInvite);
router.post('/invites/:token/accept', deviceController.redeemInvite);

module.exports = router;
