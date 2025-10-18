const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    // Check if user is active
    if (user.status === 'blocked') {
      return next(new Error('User account is blocked'));
    }

    // Add user info to socket
    socket.user = {
      id: user._id,
      userType: user.userType,
      name: user.name,
      email: user.email
    };

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
};

module.exports = socketAuthMiddleware;
