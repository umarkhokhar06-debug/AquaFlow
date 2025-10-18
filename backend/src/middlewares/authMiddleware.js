const tokenService = require('../services/tokenService');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Use Bearer <token>'
      });
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    // Verify token
    const decoded = tokenService.verifyToken(token);
    
    // Get user from database
    const user = await User.findById(decoded.id);
    if (!user) {
      console.error('[AUTH] Token valid but no user found:', token);
      return res.status(401).json({ success: false, message: 'User not found for token' });
    }

    // Add user to request object
    req.user = {
      id: user._id,
      userType: user.userType,
      name: user.name,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.message === 'Invalid token') {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

module.exports = authMiddleware;
