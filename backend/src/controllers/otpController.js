const otpService = require('../services/otpService');

const otpController = {
  sendOtp: async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ success: false, message: 'phoneNumber is required' });
      }
      const result = await otpService.sendOtp(phoneNumber);
      res.status(200).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to send verification code' });
    }
  },

  verifyOtp: async (req, res) => {
    try {
      const { phoneNumber, code } = req.body;
      if (!phoneNumber || !code) {
        return res.status(400).json({ success: false, message: 'phoneNumber and code are required' });
      }
      const result = await otpService.verifyOtp(phoneNumber, code);
      res.status(200).json(result);
    } catch (error) {
      res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to verify code' });
    }
  }
};

module.exports = otpController;
