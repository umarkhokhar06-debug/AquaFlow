const userManagementService = require('../services/userManagementService');

const userManagementController = {
  // Get all users with pagination and filtering
  getAllUsers: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        userType,
        status,
        search
      } = req.query;

      const filters = {};
      if (userType) filters.userType = userType;
      if (status) filters.status = status;
      if (search) filters.search = search;

      const result = await userManagementService.getAllUsers(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving users'
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await userManagementService.getUserById(userId);
      res.status(200).json(result);

    } catch (error) {
      console.error('Get user by ID error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error retrieving user'
      });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const updateData = req.body;
      const result = await userManagementService.updateUser(userId, updateData, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Update user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Cannot change admin user type') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error updating user'
      });
    }
  },

  // Block user
  blockUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      const result = await userManagementService.blockUser(userId, req.user.id, reason);
      res.status(200).json(result);

    } catch (error) {
      console.error('Block user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'User is already blocked') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Cannot block other admin users') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error blocking user'
      });
    }
  },

  // Unblock user
  unblockUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await userManagementService.unblockUser(userId);
      res.status(200).json(result);

    } catch (error) {
      console.error('Unblock user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'User is already active') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error unblocking user'
      });
    }
  },

  // Change user type
  changeUserType: async (req, res) => {
    try {
      const { userId } = req.params;
      const { userType } = req.body;

      if (!userType) {
        return res.status(400).json({
          success: false,
          message: 'User type is required'
        });
      }

      const result = await userManagementService.changeUserType(userId, userType, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Change user type error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Cannot change admin user type') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Invalid user type') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Customer type requires')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error changing user type'
      });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { userId } = req.params;
      const result = await userManagementService.deleteUser(userId, req.user.id);
      res.status(200).json(result);

    } catch (error) {
      console.error('Delete user error:', error);
      
      if (error.message === 'User not found') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message === 'Cannot delete admin users') {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error deleting user'
      });
    }
  },

  // Get user statistics
  getUserStatistics: async (req, res) => {
    try {
      const result = await userManagementService.getUserStatistics();
      res.status(200).json(result);

    } catch (error) {
      console.error('Get user statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving statistics'
      });
    }
  },

  // Search users
  searchUsers: async (req, res) => {
    try {
      const { q: searchTerm, userType, status } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const filters = {};
      if (userType) filters.userType = userType;
      if (status) filters.status = status;

      const result = await userManagementService.searchUsers(searchTerm, filters);
      res.status(200).json(result);

    } catch (error) {
      console.error('Search users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error searching users'
      });
    }
  }
};

module.exports = userManagementController;
