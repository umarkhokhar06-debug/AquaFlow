const express = require('express');
const userManagementController = require('../controllers/userManagementController');
const authMiddleware = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/authorizationMiddleware');

const router = express.Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// User management routes
router.get('/', userManagementController.getAllUsers);
router.get('/search', userManagementController.searchUsers);
router.get('/statistics', userManagementController.getUserStatistics);
router.get('/:userId', userManagementController.getUserById);
router.put('/:userId', userManagementController.updateUser);
router.put('/:userId/block', userManagementController.blockUser);
router.put('/:userId/unblock', userManagementController.unblockUser);
router.put('/:userId/change-type', userManagementController.changeUserType);
router.delete('/:userId', userManagementController.deleteUser);

module.exports = router;
