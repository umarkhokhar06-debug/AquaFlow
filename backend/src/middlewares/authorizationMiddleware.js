const authorizationService = require('../services/authorizationService');

// Middleware to check if user has specific role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!authorizationService.hasRole(req.user, requiredRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredRole} role required`
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

// Middleware to check if user has any of the specified roles
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!authorizationService.hasAnyRole(req.user, roles)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. One of these roles required: ${roles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

// Middleware to check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!authorizationService.hasPermission(req.user, permission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Permission '${permission}' required`
        });
      }

      next();
    } catch (error) {
      console.error('Permission authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
};

// Middleware to check if user can access customer data
const canAccessCustomerData = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const targetUserId = req.params.userId || req.params.id;
    
    if (!authorizationService.canAccessCustomerData(req.user, targetUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot access this customer data'
      });
    }

    next();
  } catch (error) {
    console.error('Customer data access error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Middleware to check if user can manage users
const canManageUsers = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!authorizationService.canManageUsers(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required to manage users'
      });
    }

    next();
  } catch (error) {
    console.error('User management authorization error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Convenience middleware for common roles
const requireAdmin = requireRole('admin');
const requireDriver = requireRole('driver');
const requireCustomer = requireRole('customer');
const requireAdminOrDriver = requireAnyRole(['admin', 'driver']);
const requireAdminOrCustomer = requireAnyRole(['admin', 'customer']);

module.exports = {
  requireRole,
  requireAnyRole,
  requirePermission,
  canAccessCustomerData,
  canManageUsers,
  requireAdmin,
  requireDriver,
  requireCustomer,
  requireAdminOrDriver,
  requireAdminOrCustomer
};

