const User = require('../models/User');
const authorizationService = require('./authorizationService');
const auditLogService = require('./auditLogService');
const { ALL_ROLES, ADMIN_TIER_ROLES, EMPLOYEE_CREATABLE_ROLES } = require('../constants/roles');

const userManagementService = {
  // Get all users with pagination and filtering
  getAllUsers: async (filters = {}, page = 1, limit = 10) => {
    try {
      const query = {};
      
      // Apply filters
      if (filters.userType) {
        query.userType = filters.userType;
      }
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
          { fullName: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      
      const users = await User.find(query)
        .populate('blockedBy', 'name email')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const totalUsers = await User.countDocuments(query);
      const totalPages = Math.ceil(totalUsers / limit);

      return {
        success: true,
        users: users.map(user => ({
          id: user._id,
          userType: user.userType,
          name: user.name,
          email: user.email,
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address,
          status: user.status,
          blockedAt: user.blockedAt,
          blockedBy: user.blockedBy,
          blockedReason: user.blockedReason,
          createdAt: user.createdAt
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  },

  // Get user by ID with full details
  getUserById: async (userId) => {
    try {
      const user = await User.findById(userId)
        .populate('blockedBy', 'name email')
        .select('-password');

      if (!user) {
        throw new Error('User not found');
      }

      return {
        success: true,
        user: {
          id: user._id,
          userType: user.userType,
          name: user.name,
          email: user.email,
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address,
          status: user.status,
          blockedAt: user.blockedAt,
          blockedBy: user.blockedBy,
          blockedReason: user.blockedReason,
          createdAt: user.createdAt
        }
      };

    } catch (error) {
      console.error('Get user by ID error:', error);
      throw error;
    }
  },

  // Update user details
  updateUser: async (userId, updateData, actorUser) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent updating admin-tier user type by anyone other than themselves
      if (updateData.userType && authorizationService.isAdminTier(user) && user._id.toString() !== actorUser.id.toString()) {
        throw new Error('Cannot change admin-tier user type');
      }

      // Remove sensitive fields that shouldn't be updated directly
      delete updateData.password;
      delete updateData.status;
      delete updateData.blockedAt;
      delete updateData.blockedBy;
      delete updateData.blockedReason;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
      ).populate('blockedBy', 'name email');

      return {
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser._id,
          userType: updatedUser.userType,
          name: updatedUser.name,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          houseNumber: updatedUser.houseNumber,
          portion: updatedUser.portion,
          address: updatedUser.address,
          status: updatedUser.status,
          blockedAt: updatedUser.blockedAt,
          blockedBy: updatedUser.blockedBy,
          blockedReason: updatedUser.blockedReason,
          createdAt: updatedUser.createdAt
        }
      };

    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  // Block user
  blockUser: async (userId, actorUser, reason = '') => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'blocked') {
        throw new Error('User is already blocked');
      }

      // Prevent blocking other admin-tier users
      if (authorizationService.isAdminTier(user) && user._id.toString() !== actorUser.id.toString()) {
        throw new Error('Cannot block other admin-tier users');
      }

      user.status = 'blocked';
      user.blockedAt = new Date();
      user.blockedBy = actorUser.id;
      user.blockedReason = reason;

      await user.save();

      await auditLogService.record({
        action: 'USER_BLOCKED',
        actorUser,
        targetUser: user,
        changes: { reason }
      });

      return {
        success: true,
        message: 'User blocked successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          blockedAt: user.blockedAt,
          blockedReason: user.blockedReason
        }
      };

    } catch (error) {
      console.error('Block user error:', error);
      throw error;
    }
  },

  // Unblock user
  unblockUser: async (userId, actorUser) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.status === 'active') {
        throw new Error('User is already active');
      }

      user.status = 'active';
      user.blockedAt = null;
      user.blockedBy = null;
      user.blockedReason = null;

      await user.save();

      await auditLogService.record({
        action: 'USER_UNBLOCKED',
        actorUser,
        targetUser: user
      });

      return {
        success: true,
        message: 'User unblocked successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status
        }
      };

    } catch (error) {
      console.error('Unblock user error:', error);
      throw error;
    }
  },

  // Change user type
  changeUserType: async (userId, newUserType, actorUser) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent changing admin-tier user type by anyone other than themselves
      if (authorizationService.isAdminTier(user) && user._id.toString() !== actorUser.id.toString()) {
        throw new Error('Cannot change admin-tier user type');
      }

      // Validate new user type
      if (!ALL_ROLES.includes(newUserType)) {
        throw new Error('Invalid user type');
      }

      // Only a super_admin may promote someone into an admin-tier role
      if (ADMIN_TIER_ROLES.includes(newUserType) && !authorizationService.isSuperAdmin(actorUser)) {
        throw new Error('Only a super admin can assign admin or super_admin roles');
      }

      // If changing to customer, ensure required fields are present
      if (newUserType === 'customer' && user.userType !== 'customer') {
        if (!user.fullName || !user.houseNumber || !user.portion || !user.address) {
          throw new Error('Customer type requires fullName, houseNumber, portion, and address');
        }
      }

      // If changing from customer, clear customer-specific fields
      if (user.userType === 'customer' && newUserType !== 'customer') {
        user.fullName = undefined;
        user.houseNumber = undefined;
        user.portion = undefined;
        user.address = undefined;
      }

      const previousType = user.userType;
      user.userType = newUserType;
      await user.save();

      await auditLogService.record({
        action: 'ROLE_CHANGED',
        actorUser,
        targetUser: user,
        changes: { before: previousType, after: newUserType }
      });

      return {
        success: true,
        message: 'User type changed successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          userType: user.userType,
          fullName: user.fullName,
          houseNumber: user.houseNumber,
          portion: user.portion,
          address: user.address
        }
      };

    } catch (error) {
      console.error('Change user type error:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (userId, actorUser) => {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deleting admin-tier users
      if (authorizationService.isAdminTier(user)) {
        throw new Error('Cannot delete admin-tier users');
      }

      await auditLogService.record({
        action: 'USER_DELETED',
        actorUser,
        targetUser: user
      });

      await User.findByIdAndDelete(userId);

      return {
        success: true,
        message: 'User deleted successfully'
      };

    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  // Admin/super_admin creates a staff account directly (matches SRS: "Admin
  // creates employees according to operational role"). Only super_admin may
  // create admin/super_admin accounts.
  createEmployee: async (actorUser, { name, email, password, userType }) => {
    try {
      if (!EMPLOYEE_CREATABLE_ROLES.includes(userType)) {
        throw new Error(`userType must be one of: ${EMPLOYEE_CREATABLE_ROLES.join(', ')}`);
      }

      if (ADMIN_TIER_ROLES.includes(userType) && !authorizationService.isSuperAdmin(actorUser)) {
        throw new Error('Only a super admin can create admin or super_admin accounts');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      const user = await User.create({ name, email, password, userType });

      await auditLogService.record({
        action: 'USER_CREATED',
        actorUser,
        targetUser: user
      });

      return {
        success: true,
        message: 'Employee created successfully',
        user: {
          id: user._id,
          userType: user.userType,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt
        }
      };

    } catch (error) {
      console.error('Create employee error:', error);
      throw error;
    }
  },

  // Get user statistics
  getUserStatistics: async () => {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: {
              userType: '$userType',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        }
      ]);

      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ status: 'active' });
      const blockedUsers = await User.countDocuments({ status: 'blocked' });

      const userTypeStats = await User.aggregate([
        {
          $group: {
            _id: '$userType',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        success: true,
        statistics: {
          totalUsers,
          activeUsers,
          blockedUsers,
          userTypeBreakdown: userTypeStats,
          statusBreakdown: stats
        }
      };

    } catch (error) {
      console.error('Get user statistics error:', error);
      throw error;
    }
  },

  // Search users
  searchUsers: async (searchTerm, filters = {}) => {
    try {
      const query = {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { fullName: { $regex: searchTerm, $options: 'i' } }
        ]
      };

      // Apply additional filters
      if (filters.userType) {
        query.userType = filters.userType;
      }
      if (filters.status) {
        query.status = filters.status;
      }

      const users = await User.find(query)
        .populate('blockedBy', 'name email')
        .select('-password')
        .limit(20);

      return {
        success: true,
        users: users.map(user => ({
          id: user._id,
          userType: user.userType,
          name: user.name,
          email: user.email,
          fullName: user.fullName,
          status: user.status,
          createdAt: user.createdAt
        }))
      };

    } catch (error) {
      console.error('Search users error:', error);
      throw error;
    }
  }
};

module.exports = userManagementService;
