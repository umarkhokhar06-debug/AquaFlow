const User = require('../models/User');
const tokenService = require('./tokenService');
const bcrypt = require('bcryptjs');
const { STAFF_ROLES } = require('../constants/roles');
const auditLogService = require('./auditLogService');

const authService = {
  // Register user with user type support
  registerUser: async (userData) => {
    try {
      const { userType, name, email, password, ...additionalFields } = userData;

      if (STAFF_ROLES.includes(userType)) {
        throw new Error('Staff accounts cannot be self-registered. Contact an administrator.');
      }

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
  loginUser: async (email, password, ip) => {
    const logFailure = (actorUser, reasonCode) =>
      auditLogService.record({
        action: 'LOGIN_FAILED',
        actorUser,
        targetUser: null,
        changes: { email, reason: reasonCode },
        ip
      });

    try {
      // Validate input
      if (!email || !password) {
        await logFailure({ email }, 'missing_credentials');
        throw new Error('Please provide email and password');
      }

      // Find user and include password for comparison
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        await logFailure({ email }, 'unknown_email');
        throw new Error('Invalid credentials');
      }

      if (user.status === 'blocked') {
        await logFailure(user, 'account_blocked');
        throw new Error('Your account has been blocked. Contact support.');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await logFailure(user, 'invalid_password');
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

  // Self-service account deletion (App Store Guideline 5.1.1(v): apps that
  // support account creation must also support in-app account deletion).
  // Scoped to customer accounts, since customer is the only self-registerable
  // role -- drivers/staff are admin-created and admin-deleted.
  deleteAccount: async (userId, password) => {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error('User not found');
      }

      if (user.userType !== 'customer') {
        throw new Error('This account type cannot be self-deleted. Contact an administrator.');
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Incorrect password');
      }

      await auditLogService.record({
        action: 'USER_DELETED',
        actorUser: user,
        targetUser: user,
        changes: { reason: 'Self-deleted via account settings' }
      });

      await User.findByIdAndDelete(userId);

      return {
        success: true,
        message: 'Account deleted successfully'
      };
    } catch (error) {
      console.error('Delete account error:', error);
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

