const forecastService = require('../services/forecastService');

class ForecastController {
  async getDeviceForecast(req, res) {
    try {
      // req.device is set by requireDeviceAccess middleware
      const forecast = await forecastService.computeDeviceForecast(req.device.deviceId);
      res.status(200).json({ success: true, forecast });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to compute device forecast'
      });
    }
  }

  async getConsumptionTrends(req, res) {
    try {
      const trends = await forecastService.getConsumptionTrends();
      res.status(200).json({ success: true, ...trends });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to compute consumption trends'
      });
    }
  }

  async getFleetForecast(req, res) {
    try {
      const forecast = await forecastService.getFleetForecast();
      res.status(200).json({ success: true, forecast });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to compute fleet forecast'
      });
    }
  }

  // Admin-only manual trigger, for testing without waiting for ~2 AM.
  async runNightlyScan(req, res) {
    try {
      const result = await forecastService.runNightlyScan();
      res.status(200).json({ success: true, result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to run nightly scan'
      });
    }
  }
}

module.exports = new ForecastController();
