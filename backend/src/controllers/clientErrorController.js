const ClientErrorLog = require('../models/ClientErrorLog');
const tokenService = require('../services/tokenService');

const clientErrorController = {
  // Deliberately unauthenticated -- a crash can happen before login ever
  // succeeds. If a valid Bearer token happens to be present, attach who it
  // was for; otherwise log anonymously. Never let a bug in error *reporting*
  // itself throw back at the crashing app.
  report: async (req, res) => {
    try {
      const { message, stack, isFatal, screen, platform, appVersion, userType } = req.body;
      if (!message) {
        return res.status(400).json({ success: false, message: 'message is required' });
      }

      let userId = null;
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = tokenService.verifyToken(authHeader.substring(7));
          userId = decoded.id;
        } catch {
          // Invalid/expired token -- fine, log anonymously rather than reject.
        }
      }

      await ClientErrorLog.create({
        message: String(message).slice(0, 2000),
        stack: stack ? String(stack).slice(0, 8000) : undefined,
        isFatal: !!isFatal,
        screen: screen ? String(screen).slice(0, 200) : undefined,
        platform: platform ? String(platform).slice(0, 50) : undefined,
        appVersion: appVersion ? String(appVersion).slice(0, 50) : undefined,
        userId,
        userType: userType ? String(userType).slice(0, 50) : undefined
      });

      res.status(201).json({ success: true });
    } catch (error) {
      console.error('Failed to record client error report:', error.message);
      // Still 200 -- the reporting client shouldn't retry/loop over this.
      res.status(200).json({ success: false });
    }
  }
};

module.exports = clientErrorController;
