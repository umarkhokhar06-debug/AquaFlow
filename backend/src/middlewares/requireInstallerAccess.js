const requireInstallerAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.userType !== 'installer') {
    return res.status(403).json({ success: false, message: 'Access denied. Installer account required.' });
  }
  next();
};

module.exports = requireInstallerAccess;
