const Device = require('../models/Device');

// Loads the device named by :deviceId (the human-readable device ID, not the Mongo _id)
// and ensures the authenticated user is the owner, a tenant, or an admin.
const requireDeviceAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId: deviceId.trim().toUpperCase() });

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    if (!device.isAccessibleBy(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not have access to this device.'
      });
    }

    req.device = device;
    next();
  } catch (error) {
    console.error('Device access middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in device authorization'
    });
  }
};

module.exports = requireDeviceAccess;
