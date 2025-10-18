const IoTData = require('../models/IoTData');
const Calibration = require('../models/Calibration');

class IoTDataService {
  constructor() {
    this.latestData = null;
  }

  // Process and save IoT data
  async processIoTData(data) {
    try {
      console.log('Received IoT data:', data);

      // Parse timestamp if it's a string
      let timestamp = data.timestamp;
      if (typeof timestamp === 'string') {
        timestamp = new Date(timestamp.trim());
      }

      // Fetch latest calibration values
      const calibration = await Calibration.findOne().sort({ createdAt: -1 });
      if (!calibration) {
        throw new Error('Calibration values not set');
      }
      const { tank_depth, tank_full_distance } = calibration;

      // Calculate tank level from distance
      // tankLevel = ((tank_depth - distance) / (tank_depth - tank_full_distance)) * 100
      let tankLevel = null;
      if (typeof data.distance === 'number') {
        tankLevel = ((tank_depth - data.distance) / (tank_depth - tank_full_distance)) * 100;
        // Clamp between 0 and 100
        tankLevel = Math.max(0, Math.min(100, tankLevel));
      }

      console.log(`Calculated tank level: ${tankLevel}%`);
      

      // Create new IoT data entry (store tankLevel instead of distance)
      const iotData = new IoTData({
        humidity: data.humidity,
        temperature: data.temperature,
        distance: data.distance,
        tankLevel,
        timestamp: timestamp
      });

      // Save to database
      await iotData.save();

      // Store as latest data
      this.latestData = {
        humidity: data.humidity,
        temperature: data.temperature,
        tankLevel,
        timestamp: timestamp,
        receivedAt: new Date()
      };

      console.log('IoT data saved successfully');
      return iotData;
    } catch (error) {
      console.error('Error processing IoT data:', error);
      throw error;
    }
  }

  // Get latest IoT data
  getLatestData() {
    return this.latestData;
  }

  // Get all IoT data with pagination
  async getAllData(page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const data = await IoTData.find()
        .sort({ receivedAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await IoTData.countDocuments();
      
      return {
        data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching IoT data:', error);
      throw error;
    }
  }
}

module.exports = new IoTDataService();