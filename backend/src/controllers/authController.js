const authService = require('../services/authService');

const authController = {
  // Register new user
  register: async (req, res) => {
    try {
      const result = await authService.registerUser(req.body);
      res.status(201).json(result);

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: messages
        });
      }

      // Handle duplicate key error
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Handle custom errors
      if (error.message) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  },

  // Login user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.loginUser(email, password);
      res.status(200).json(result);

    } catch (error) {
      console.error('Login error:', error);
      
      if (error.message) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error during login'
      });
    }
  },

  // Get current user profile
  getProfile: async (req, res) => {
    try {
      const user = await authService.getUserById(req.user.id);
      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        user
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error retrieving profile'
      });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const user = await authService.updateUserProfile(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      console.error('Update profile error:', error);
      
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
        message: 'Server error updating profile'
      });
    }
  },

  // Change password
  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
      res.status(200).json(result);
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: 'Server error changing password'
      });
    }
  }
};

module.exports = authController;
