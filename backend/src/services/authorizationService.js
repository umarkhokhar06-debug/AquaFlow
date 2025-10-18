const User = require('../models/User');

const authorizationService = {
  // Check if user has specific role
  hasRole: (user, requiredRole) => {
    if (!user || !user.userType) {
      return false;
    }
    return user.userType === requiredRole;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (user, roles) => {
    if (!user || !user.userType || !Array.isArray(roles)) {
      return false;
    }
    return roles.includes(user.userType);
  },

  // Check if user is admin
  isAdmin: (user) => {
    return authorizationService.hasRole(user, 'admin');
  },

  // Check if user is driver
  isDriver: (user) => {
    return authorizationService.hasRole(user, 'driver');
  },

  // Check if user is customer
  isCustomer: (user) => {
    return authorizationService.hasRole(user, 'customer');
  },

  // Check if user can access customer data
  canAccessCustomerData: (user, targetUserId) => {
    // Admin can access all customer data
    if (authorizationService.isAdmin(user)) {
      return true;
    }
    
    // Customer can only access their own data
    if (authorizationService.isCustomer(user)) {
      return user.id === targetUserId;
    }
    
    // Driver can access customer data (for delivery purposes)
    if (authorizationService.isDriver(user)) {
      return true;
    }
    
    return false;
  },

  // Check if user can manage users
  canManageUsers: (user) => {
    // Only admin can manage users
    return authorizationService.isAdmin(user);
  },

  // Check if user can view all orders
  canViewAllOrders: (user) => {
    // Admin and driver can view all orders
    return authorizationService.hasAnyRole(user, ['admin', 'driver']);
  },

  // Check if user can create orders
  canCreateOrders: (user) => {
    // Customers and admin can create orders
    return authorizationService.hasAnyRole(user, ['customer', 'admin']);
  },

  // Check if user can update orders
  canUpdateOrders: (user, orderUserId) => {
    // Admin can update any order
    if (authorizationService.isAdmin(user)) {
      return true;
    }
    
    // Customer can only update their own orders
    if (authorizationService.isCustomer(user)) {
      return user.id === orderUserId;
    }
    
    // Driver can update orders assigned to them
    if (authorizationService.isDriver(user)) {
      return true; // This would need order assignment logic
    }
    
    return false;
  },

  // Check if user can delete orders
  canDeleteOrders: (user, orderUserId) => {
    // Only admin can delete orders
    return authorizationService.isAdmin(user);
  },

  // Check if user can access driver features
  canAccessDriverFeatures: (user) => {
    return authorizationService.hasAnyRole(user, ['driver', 'admin']);
  },

  // Check if user can access admin features
  canAccessAdminFeatures: (user) => {
    return authorizationService.isAdmin(user);
  },

  // Get user permissions
  getUserPermissions: (user) => {
    if (!user || !user.userType) {
      return [];
    }

    const permissions = [];

    switch (user.userType) {
      case 'admin':
        permissions.push(
          'manage_users',
          'view_all_orders',
          'create_orders',
          'update_orders',
          'delete_orders',
          'access_driver_features',
          'access_admin_features',
          'view_all_customers',
          'manage_system'
        );
        break;
      
      case 'driver':
        permissions.push(
          'view_all_orders',
          'update_orders',
          'access_driver_features',
          'view_customer_data'
        );
        break;
      
      case 'customer':
        permissions.push(
          'create_orders',
          'update_own_orders',
          'view_own_orders',
          'view_own_profile'
        );
        break;
    }

    return permissions;
  },

  // Check if user has specific permission
  hasPermission: (user, permission) => {
    const permissions = authorizationService.getUserPermissions(user);
    return permissions.includes(permission);
  },

  // Validate user type transition (if needed in the future)
  canChangeUserType: (currentUser, targetUser, newUserType) => {
    // Only admin can change user types
    if (!authorizationService.isAdmin(currentUser)) {
      return false;
    }
    
    // Prevent changing admin user types (safety measure)
    if (targetUser.userType === 'admin' && currentUser.id !== targetUser.id) {
      return false;
    }
    
    return true;
  }
};

module.exports = authorizationService;

