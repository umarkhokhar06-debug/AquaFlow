const IoTData = require('../models/IoTData');
const Device = require('../models/Device');
const Notification = require('../models/Notification');
const socketService = require('./socketService');

class IoTDataService {
  constructor() {
    // deviceId (string) -> latest reading
    this.latestByDevice = new Map();
    // deviceId (string) -> whether a low-water alert is currently active (avoids re-notifying every reading)
    this.lowWaterAlertActive = new Map();
  }

  // Process and save a reading for a specific device, identified by its human-readable deviceId
  async processIoTData(deviceId, data) {
    if (!deviceId) {
      throw new Error('deviceId is required');
    }

    const device = await Device.findOne({ deviceId: deviceId.trim().toUpperCase() });
    if (!device) {
      const err = new Error(`Unknown device: ${deviceId}`);
      err.status = 404;
      throw err;
    }

    let timestamp = data.timestamp;
    if (typeof timestamp === 'string') {
      timestamp = new Date(timestamp.trim());
    } else if (!timestamp) {
      timestamp = new Date();
    }

    const { tank_depth, tank_full_distance } = device.calibration;

    let tankLevel = null;
    if (typeof data.distance === 'number') {
      tankLevel = ((tank_depth - data.distance) / (tank_depth - tank_full_distance)) * 100;
      tankLevel = Math.max(0, Math.min(100, tankLevel));
    }

    const iotData = new IoTData({
      device: device._id,
      humidity: data.humidity,
      temperature: data.temperature,
      distance: data.distance,
      tankLevel,
      timestamp
    });

    await iotData.save();

    device.lastSeenAt = new Date();
    await device.save();

    const latest = {
      deviceId: device.deviceId,
      humidity: data.humidity,
      temperature: data.temperature,
      tankLevel,
      timestamp,
      receivedAt: new Date()
    };
    this.latestByDevice.set(device.deviceId, latest);

    socketService.emitDeviceReading(device, latest);

    if (typeof tankLevel === 'number') {
      await this.checkLowWaterThreshold(device, tankLevel);
    }

    return iotData;
  }

  async checkLowWaterThreshold(device, tankLevel) {
    const wasActive = this.lowWaterAlertActive.get(device.deviceId) || false;
    const isBelow = tankLevel < device.lowWaterThreshold;

    if (isBelow && !wasActive) {
      this.lowWaterAlertActive.set(device.deviceId, true);

      const recipientIds = [device.owner.toString(), ...device.tenants.map(t => t.user.toString())];
      const title = 'Low Water Alert';
      const message = `${device.name} (${device.houseLabel}) is at ${tankLevel.toFixed(0)}% — below the ${device.lowWaterThreshold}% threshold.`;

      await Promise.all(recipientIds.map(recipient =>
        Notification.create({
          recipient,
          title,
          message,
          type: 'system_update',
          priority: 'high',
          data: { deviceId: device.deviceId, tankLevel }
        })
      ));

      socketService.emitLowWaterAlert(device, tankLevel, recipientIds);
    } else if (!isBelow && wasActive) {
      this.lowWaterAlertActive.set(device.deviceId, false);
    }
  }

  // Latest reading for a device, falling back to the most recent DB record after a restart
  async getLatestData(deviceId) {
    const key = deviceId.trim().toUpperCase();
    if (this.latestByDevice.has(key)) {
      return this.latestByDevice.get(key);
    }

    const device = await Device.findOne({ deviceId: key });
    if (!device) return null;

    const last = await IoTData.findOne({ device: device._id }).sort({ receivedAt: -1 });
    if (!last) return null;

    const latest = {
      deviceId: device.deviceId,
      humidity: last.humidity,
      temperature: last.temperature,
      tankLevel: last.tankLevel,
      timestamp: last.timestamp,
      receivedAt: last.receivedAt
    };
    this.latestByDevice.set(key, latest);
    return latest;
  }

  // Latest reading for every device, keyed by deviceId. Uses the in-memory
  // cache first (instant) and only hits the DB for devices never seen since
  // this process started — cheap even for hundreds of devices.
  async getLatestForAllDevices() {
    const devices = await Device.find().select('deviceId');
    const result = {};

    await Promise.all(devices.map(async (d) => {
      result[d.deviceId] = await this.getLatestData(d.deviceId);
    }));

    return result;
  }

  // Push a fresh random reading to every simulated device. Used by both the
  // automatic 1-minute loop and the simulator panel's "Randomize All" button.
  async randomizeAllDevices() {
    const devices = await Device.find({ isSimulated: true });

    await Promise.all(devices.map((device) => {
      const level = Math.random() * 100;
      const { tank_depth, tank_full_distance } = device.calibration;
      const distance = tank_depth - (level / 100) * (tank_depth - tank_full_distance);
      return this.processIoTData(device.deviceId, {
        distance: Number(distance.toFixed(2)),
        temperature: Number((27 + Math.random() * 4).toFixed(1)),
        humidity: Number((40 + Math.random() * 15).toFixed(1)),
        timestamp: new Date()
      });
    }));

    return devices.length;
  }

  async getAllData(deviceId, page = 1, limit = 50) {
    const device = await Device.findOne({ deviceId: deviceId.trim().toUpperCase() });
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      IoTData.find({ device: device._id }).sort({ receivedAt: -1 }).skip(skip).limit(limit),
      IoTData.countDocuments({ device: device._id })
    ]);

    return {
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }
}

module.exports = new IoTDataService();
