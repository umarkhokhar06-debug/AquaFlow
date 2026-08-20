const AuditLog = require('../models/AuditLog');

const snapshot = (user) => user && ({
  name: user.name,
  email: user.email,
  userType: user.userType
});

const auditLogService = {
  // Fail-open by design: a logging hiccup must never block the admin
  // action it's recording (this app is live, no room for that surface).
  // actorUser may be a real User document, or -- for actions with no
  // authenticated account yet, e.g. a failed login against an unknown
  // email -- a plain object carrying only what's known (e.g. { email }).
  record: async ({ action, actorUser, targetUser, changes, reason, ip }) => {
    try {
      await AuditLog.create({
        action,
        actor: actorUser?.id || actorUser?._id || null,
        actorSnapshot: snapshot(actorUser),
        target: targetUser ? (targetUser.id || targetUser._id) : null,
        targetSnapshot: snapshot(targetUser),
        changes: changes || {},
        reason,
        ip: ip || null
      });
    } catch (error) {
      console.error('Audit log write failed (non-fatal):', error.message);
    }
  },

  getLogsForTarget: async (userId, page = 1, limit = 50) => {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find({ target: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments({ target: userId })
    ]);
    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  getRecentLogs: async (filters = {}, page = 1, limit = 50) => {
    const query = {};
    if (filters.action) query.action = filters.action;
    if (filters.actor) query.actor = filters.actor;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(query)
    ]);
    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }
};

module.exports = auditLogService;
