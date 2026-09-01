const systemConfigService = require('../services/systemConfigService');

class SystemConfigController {
  async getAllConfig(req, res) {
    try {
      const config = await systemConfigService.getAll();
      res.status(200).json({ success: true, config });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch system config'
      });
    }
  }

  async updateConfig(req, res) {
    try {
      const { key, value, description } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ success: false, message: 'key and value are required' });
      }
      const entry = await systemConfigService.set(key, value, req.user, description);
      res.status(200).json({ success: true, entry });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to update system config'
      });
    }
  }

  // Customer-facing: just the express fee, no admin auth required.
  async getExpressFee(req, res) {
    try {
      const expressFeeAmount = await systemConfigService.get('expressFeeAmount', 300);
      res.status(200).json({ success: true, expressFeeAmount });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch express fee'
      });
    }
  }
}

module.exports = new SystemConfigController();
