const express = require('express');
const installationController = require('../controllers/installationController');
const authMiddleware = require('../middlewares/authMiddleware');
const requireInstallerAccess = require('../middlewares/requireInstallerAccess');
const { requireCustomer, requireAdminOrDispatcher } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

router.use(authMiddleware);

// Customer: request an installation
router.post('/', requireCustomer, installationController.requestInstallation);

// Installer: my assigned jobs + completing one
router.get('/mine', requireInstallerAccess, installationController.getMine);
router.put('/:id/complete', requireInstallerAccess, installationController.completeInstallation);

// Admin/dispatcher: see all requests, assign an installer
router.get('/', requireAdminOrDispatcher, installationController.getAll);
router.put('/:id/assign', requireAdminOrDispatcher, installationController.assignInstaller);

// Shared read (customer who requested it, installer assigned to it, or admin/dispatcher)
router.get('/:id', installationController.getById);

module.exports = router;
