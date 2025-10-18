const iotDataService = require('../services/iotDataService');
const iotSubscriber = require('../iotnode/fetchiotdata');

class IoTDataController {
  // Get latest IoT data
  async getLatestData(req, res) {
    try {
      const latestData = iotDataService.getLatestData();
      
      if (!latestData) {
        return res.status(404).json({
          success: false,
          message: 'No IoT data available yet'
        });
      }

      res.status(200).json({
        success: true,
        data: latestData
      });
    } catch (error) {
      console.error('Error fetching latest IoT data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch latest IoT data',
        error: error.message
      });
    }
  }

  // Get all IoT data with pagination
  async getAllData(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await iotDataService.getAllData(page, limit);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching IoT data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch IoT data',
        error: error.message
      });
    }
  }

  // Get IoT connection status
  async getConnectionStatus(req, res) {
    try {
      const isConnected = iotSubscriber.getConnectionStatus();
      
      res.status(200).json({
        success: true,
        connected: isConnected,
        message: isConnected ? 'Connected to AWS IoT Core' : 'Not connected to AWS IoT Core'
      });
    } catch (error) {
      console.error('Error checking connection status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check connection status',
        error: error.message
      });
    }
  }

  // Manually trigger IoT connection (for testing)
  async connectToIoT(req, res) {
    try {
      await iotSubscriber.connect();
      
      res.status(200).json({
        success: true,
        message: 'Successfully connected to AWS IoT Core'
      });
    } catch (error) {
      console.error('Error connecting to IoT:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to connect to AWS IoT Core',
        error: error.message
      });
    }
  }
}

module.exports = new IoTDataController();