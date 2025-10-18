const User = require('../models/User');
const tokenService = require('./tokenService');
const bcrypt = require('bcryptjs');

const authService = {
  // Register user with user type support
  registerUser: async (userData) => {
    try {
      const { userType, name, email, password, ...additionalFields } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Validate user type specific fields
      if (userType === 'customer') {
        const { fullName, houseNumber, portion, address } = additionalFields;
        if (!fullName || !houseNumber || !portion || !address) {
          throw new Error('Customer registration requires fullName, houseNumber, portion, and address');
        }
        if (!['upper', 'lower'].includes(portion)) {
          throw new Error('Portion must be either upper or lower');
        }
      }

      // Create user object
      const userObject = {
        userType,
        name,
        email,
        password,
        ...(userType === 'customer' && additionalFields)
      };

      // Create new user
      const user = await User.create(userObject);

      // Generate token
      const token = tokenService.generateUserToken(user);

      // Return user data without password
      const userResponse = {
        id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email,
        ...(userType === 'customer' && {
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address
        }),
        createdAt: user.createdAt
      };

      return {
        success: true,
        message: 'User registered successfully',
        token,
        user: userResponse
      };

    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Login user with user type support
  loginUser: async (email, password) => {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Please provide email and password');
      }

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate token
      const token = tokenService.generateUserToken(user);

      // Return user data without password
      const userResponse = {
        id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email,
        ...(user.userType === 'customer' && {
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address
        }),
        createdAt: user.createdAt
      };

      return {
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
      };

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email,
        ...(user.userType === 'customer' && {
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address
        }),
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  },

  // Update user profile
  updateUserProfile: async (userId, updateData) => {
    try {
      const { password, ...allowedUpdates } = updateData;
      
      // Remove userType from updates (should not be changeable)
      delete allowedUpdates.userType;

      const user = await User.findByIdAndUpdate(
        userId,
        allowedUpdates,
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email,
        ...(user.userType === 'customer' && {
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address
        }),
        createdAt: user.createdAt
      };
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  // Change password
  changePassword: async (userId, currentPassword, newPassword) => {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  // Verify user exists and is active
  verifyUser: async (userId) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        userType: user.userType,
        name: user.name,
        email: user.email
      };
    } catch (error) {
      console.error('Verify user error:', error);
      throw error;
    }
  }
};

module.exports = authService;

