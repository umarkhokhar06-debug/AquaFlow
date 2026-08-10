const reportService = require('../services/reportService');

class ReportController {
  async getDashboard(req, res) {
    try {
      const { from, to } = req.query;
      const kpis = await reportService.getDashboardKPIs({ from, to });
      res.status(200).json({ success: true, kpis });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to build dashboard'
      });
    }
  }

  async getDeviceCapacityInsights(req, res) {
    try {
      const insights = await reportService.getDeviceCapacityInsights();
      res.status(200).json({ success: true, insights });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to build device capacity insights'
      });
    }
  }

  async getReport(req, res) {
    try {
      const { type } = req.params;
      const { from, to, format } = req.query;
      const result = await reportService.getReport(type, { from, to });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
        return res.status(200).send(result.csv);
      }

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to build report'
      });
    }
  }
}

module.exports = new ReportController();
