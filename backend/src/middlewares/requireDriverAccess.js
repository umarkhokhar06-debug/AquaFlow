const requireDriverAccess = (req, res, next) => {
  try {
    // Check if user is authenticated (authMiddleware should run first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Check if user is a driver
    if (req.user.userType !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Driver account required.'
      });
    }

    next();
  } catch (error) {
    console.error('Driver access middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = requireDriverAccess;