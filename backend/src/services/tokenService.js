const jwt = require('jsonwebtoken');

const tokenService = {
  // Generate JWT token
  signToken: (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
  },

  // Verify JWT token
  verifyToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  // Generate token for user
  generateUserToken: (user) => {
    const payload = {
      id: user._id,
      email: user.email,
      userType: user.userType,
    };
    return tokenService.signToken(payload);
  }
};

module.exports = tokenService;
