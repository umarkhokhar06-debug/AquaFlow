const SystemConfig = require('../models/SystemConfig');
const auditLogService = require('./auditLogService');

// Empty collection just falls back to these -- no seed step needed.
const DEFAULT_CONFIG = {
  expressFeeAmount: 300
};

class SystemConfigService {
  async get(key, fallbackDefault) {
    const entry = await SystemConfig.findOne({ key });
    if (entry) return entry.value;
    if (fallbackDefault !== undefined) return fallbackDefault;
    return DEFAULT_CONFIG[key];
  }

  async set(key, value, actorUser, description) {
    const before = await this.get(key);

    const entry = await SystemConfig.findOneAndUpdate(
      { key },
      {
        key,
        value,
        ...(description !== undefined ? { description } : {}),
        updatedBy: actorUser?.id || actorUser?._id || null,
        updatedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await auditLogService.record({
      action: 'SYSTEM_CONFIG_UPDATED',
      actorUser,
      targetUser: null,
      changes: { key, before, after: value }
    });

    return entry;
  }

  async getAll() {
    const entries = await SystemConfig.find({});
    const map = { ...DEFAULT_CONFIG };
    for (const entry of entries) {
      map[entry.key] = entry.value;
    }
    return map;
  }
}

module.exports = new SystemConfigService();
