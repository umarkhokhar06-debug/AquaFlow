const iotDataService = require('../services/iotDataService');
const iotSubscriber = require('../iotnode/fetchiotdata');

class IoTDataController {
  // Ingestion endpoint: a device (real or simulated) pushes a reading here.
  // No user auth — devices identify themselves by deviceId, matching how the
  // ESP32 firmware will call this once it talks HTTP instead of/alongside MQTT.
  async ingestData(req, res) {
    try {
      const { deviceId, humidity, temperature, distance, timestamp } = req.body;

      if (!deviceId) {
        return res.status(400).json({ success: false, message: 'deviceId is required' });
      }

      const iotData = await iotDataService.processIoTData(deviceId, {
        humidity,
        temperature,
        distance,
        timestamp
      });

      res.status(201).json({ success: true, data: iotData });
    } catch (error) {
      console.error('Error ingesting IoT data:', error);
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to ingest IoT data'
      });
    }
  }

  // Get latest reading for a device (req.device set by requireDeviceAccess)
  async getLatestData(req, res) {
    try {
      const latestData = await iotDataService.getLatestData(req.device.deviceId);

      if (!latestData) {
        return res.status(404).json({
          success: false,
          message: 'No IoT data available yet for this device'
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

  // Get all readings for a device with pagination
  async getAllData(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const result = await iotDataService.getAllData(req.device.deviceId, page, limit);

      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching IoT data:', error);
      res.status(error.status || 500).json({
        success: false,
        message: 'Failed to fetch IoT data',
        error: error.message
      });
    }
  }

  // Get IoT connection status (AWS IoT Core MQTT link, for real devices)
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
