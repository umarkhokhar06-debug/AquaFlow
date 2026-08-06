const crypto = require('crypto');
const Device = require('../models/Device');
const User = require('../models/User');

const INVITE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

class DeviceService {
  async createDevice(payload, createdBy) {
    const {
      deviceId,
      name,
      houseLabel,
      ownerId,
      ownerEmail,
      tank_depth,
      tank_full_distance,
      tankCapacityLiters,
      lowWaterThreshold,
      isSimulated
    } = payload;

    if (!deviceId || !name || !houseLabel || !(ownerId || ownerEmail)) {
      const err = new Error('deviceId, name, houseLabel and ownerId (or ownerEmail) are required');
      err.status = 400;
      throw err;
    }

    if (typeof tank_depth !== 'number' || typeof tank_full_distance !== 'number') {
      const err = new Error('tank_depth and tank_full_distance must be numbers');
      err.status = 400;
      throw err;
    }

    const owner = ownerId
      ? await User.findById(ownerId)
      : await User.findOne({ email: ownerEmail.toLowerCase().trim() });
    if (!owner) {
      const err = new Error('Owner user not found');
      err.status = 404;
      throw err;
    }

    const existing = await Device.findOne({ deviceId: deviceId.trim().toUpperCase() });
    if (existing) {
      const err = new Error('A device with this deviceId already exists');
      err.status = 409;
      throw err;
    }

    const device = new Device({
      deviceId: deviceId.trim().toUpperCase(),
      name,
      houseLabel,
      owner: owner._id,
      calibration: { tank_depth, tank_full_distance },
      tankCapacityLiters: tankCapacityLiters || 1000,
      lowWaterThreshold: typeof lowWaterThreshold === 'number' ? lowWaterThreshold : 20,
      isSimulated: !!isSimulated,
      createdBy
    });

    await device.save();
    return this.getDeviceById(device._id);
  }

  async getAllDevices({ page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const [devices, total] = await Promise.all([
      Device.find()
        .populate('owner', 'name email fullName houseNumber address portion')
        .populate('tenants.user', 'name email fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Device.countDocuments()
    ]);

    return {
      devices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getDeviceById(id) {
    const device = await Device.findById(id)
      .populate('owner', 'name email fullName houseNumber address portion')
      .populate('tenants.user', 'name email fullName');
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }
    return device;
  }

  async getDeviceByDeviceId(deviceId, { populate = false } = {}) {
    let query = Device.findOne({ deviceId: deviceId.trim().toUpperCase() });
    if (populate) {
      query = query
        .populate('owner', 'name email fullName houseNumber address portion')
        .populate('tenants.user', 'name email fullName');
    }
    const device = await query;
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }
    return device;
  }

  async getMyDevices(userId) {
    const devices = await Device.find({
      $or: [{ owner: userId }, { 'tenants.user': userId }]
    })
      .populate('owner', 'name email fullName houseNumber address portion')
      .populate('tenants.user', 'name email fullName')
      .sort({ createdAt: -1 });
    return devices;
  }

  async updateDevice(id, updates) {
    const device = await Device.findById(id);
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }

    const { name, houseLabel, ownerId, tank_depth, tank_full_distance, tankCapacityLiters, lowWaterThreshold, status } = updates;

    if (name !== undefined) device.name = name;
    if (houseLabel !== undefined) device.houseLabel = houseLabel;
    if (tankCapacityLiters !== undefined) device.tankCapacityLiters = tankCapacityLiters;
    if (lowWaterThreshold !== undefined) device.lowWaterThreshold = lowWaterThreshold;
    if (status !== undefined) device.status = status;

    if (tank_depth !== undefined || tank_full_distance !== undefined) {
      device.calibration = {
        tank_depth: tank_depth !== undefined ? tank_depth : device.calibration.tank_depth,
        tank_full_distance: tank_full_distance !== undefined ? tank_full_distance : device.calibration.tank_full_distance
      };
    }

    if (ownerId !== undefined) {
      const owner = await User.findById(ownerId);
      if (!owner) {
        const err = new Error('Owner user not found');
        err.status = 404;
        throw err;
      }
      device.owner = owner._id;
    }

    await device.save();
    return this.getDeviceById(device._id);
  }

  async deleteDevice(id) {
    const device = await Device.findByIdAndDelete(id);
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }
    return device;
  }

  async addTenant(id, { email, userId, phoneNumber }, addedBy) {
    const device = await Device.findById(id);
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }

    let tenantUser;
    if (userId) {
      tenantUser = await User.findById(userId);
    } else if (email) {
      tenantUser = await User.findOne({ email: email.toLowerCase().trim() });
    } else if (phoneNumber) {
      tenantUser = await User.findOne({ phoneNumber: phoneNumber.trim() });
    }

    if (!tenantUser) {
      const err = new Error(
        phoneNumber
          ? 'No account found with that phone number. They need to sign up first, or you can send them an invite QR code instead.'
          : 'No account found with that email. They need to sign up first, or you can send them an invite QR code instead.'
      );
      err.status = 404;
      throw err;
    }

    this._assertCanAddTenant(device, tenantUser._id);

    device.tenants.push({ user: tenantUser._id, addedBy });
    await device.save();
    return this.getDeviceById(device._id);
  }

  _assertCanAddTenant(device, tenantUserId) {
    if (device.owner.toString() === tenantUserId.toString()) {
      const err = new Error('Owner already has access to this device');
      err.status = 400;
      throw err;
    }

    const alreadyTenant = device.tenants.some(t => t.user.toString() === tenantUserId.toString());
    if (alreadyTenant) {
      const err = new Error('User already has tenant access to this device');
      err.status = 409;
      throw err;
    }
  }

  // Create a single-use, time-limited invite. Sharing the resulting token (e.g. as a QR
  // code) lets whoever redeems it while logged in become a tenant, without the owner
  // needing to know their email/phone up front.
  async createInvite(id, createdBy) {
    const device = await Device.findById(id);
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    device.invites.push({ token, createdBy, expiresAt });
    await device.save();

    return { token, expiresAt, device: await this.getDeviceById(device._id) };
  }

  async redeemInvite(token, userId) {
    const device = await Device.findOne({ 'invites.token': token });
    if (!device) {
      const err = new Error('Invalid or expired invite');
      err.status = 404;
      throw err;
    }

    const invite = device.invites.find(i => i.token === token);
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      const err = new Error('This invite has expired or already been used');
      err.status = 410;
      throw err;
    }

    this._assertCanAddTenant(device, userId);

    device.tenants.push({ user: userId, addedBy: invite.createdBy });
    invite.used = true;
    invite.usedBy = userId;
    await device.save();

    return this.getDeviceById(device._id);
  }

  async removeTenant(id, tenantUserId) {
    const device = await Device.findById(id);
    if (!device) {
      const err = new Error('Device not found');
      err.status = 404;
      throw err;
    }

    device.tenants = device.tenants.filter(t => t.user.toString() !== tenantUserId.toString());
    await device.save();
    return this.getDeviceById(device._id);
  }
}

module.exports = new DeviceService();
