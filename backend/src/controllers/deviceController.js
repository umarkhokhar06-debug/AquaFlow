const deviceService = require('../services/deviceService');
const Device = require('../models/Device');
const { ADMIN_TIER_ROLES } = require('../constants/roles');

const isAdmin = (user) => ADMIN_TIER_ROLES.includes(user.userType);

const isOwnerOrAdmin = async (req, res, deviceMongoId) => {
  const device = await Device.findById(deviceMongoId);
  if (!device) {
    res.status(404).json({ success: false, message: 'Device not found' });
    return null;
  }
  if (isAdmin(req.user) || device.owner.toString() === req.user.id.toString()) {
    return device;
  }
  res.status(403).json({ success: false, message: 'Access denied. Only the device owner or an admin can manage tenants.' });
  return null;
};

class DeviceController {
  // Admin: register a new device and assign it to a house/owner
  async createDevice(req, res) {
    try {
      const device = await deviceService.createDevice(req.body, req.user.id);
      res.status(201).json({ success: true, device });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to create device'
      });
    }
  }

  // Admin: list every device across all houses
  async getAllDevices(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const result = await deviceService.getAllDevices({ page, limit });
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch devices'
      });
    }
  }

  // Authenticated user: devices they own or have tenant access to
  async getMyDevices(req, res) {
    try {
      const devices = await deviceService.getMyDevices(req.user.id);
      res.status(200).json({ success: true, devices });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch your devices'
      });
    }
  }

  // Admin: device detail by Mongo id
  async getDeviceById(req, res) {
    try {
      const device = await deviceService.getDeviceById(req.params.id);
      res.status(200).json({ success: true, device });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to fetch device'
      });
    }
  }

  // Admin: update device details / reassign owner / recalibrate
  async updateDevice(req, res) {
    try {
      const device = await deviceService.updateDevice(req.params.id, req.body);
      res.status(200).json({ success: true, device });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to update device'
      });
    }
  }

  // Admin: remove a device
  async deleteDevice(req, res) {
    try {
      await deviceService.deleteDevice(req.params.id);
      res.status(200).json({ success: true, message: 'Device deleted' });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to delete device'
      });
    }
  }

  // Owner or admin: grant a tenant read access to this device
  async addTenant(req, res) {
    try {
      const device = await isOwnerOrAdmin(req, res, req.params.id);
      if (!device) return;

      const updated = await deviceService.addTenant(req.params.id, req.body, req.user.id);
      res.status(200).json({ success: true, device: updated });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to add tenant'
      });
    }
  }

  // Owner or admin: revoke a tenant's access
  async removeTenant(req, res) {
    try {
      const device = await isOwnerOrAdmin(req, res, req.params.id);
      if (!device) return;

      const updated = await deviceService.removeTenant(req.params.id, req.params.userId);
      res.status(200).json({ success: true, device: updated });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to remove tenant'
      });
    }
  }

  // Owner or admin: generate a single-use invite (shared as a QR code) for someone
  // to gain tenant access without needing to know their email/phone up front
  async createInvite(req, res) {
    try {
      const device = await isOwnerOrAdmin(req, res, req.params.id);
      if (!device) return;

      const { token, expiresAt } = await deviceService.createInvite(req.params.id, req.user.id);
      res.status(201).json({ success: true, token, expiresAt, device: { deviceId: device.deviceId, name: device.name, houseLabel: device.houseLabel } });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to create invite'
      });
    }
  }

  // Any authenticated user: redeem an invite token to become a tenant
  async redeemInvite(req, res) {
    try {
      const device = await deviceService.redeemInvite(req.params.token, req.user.id);
      res.status(200).json({ success: true, device });
    } catch (error) {
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Failed to redeem invite'
      });
    }
  }
}

module.exports = new DeviceController();
