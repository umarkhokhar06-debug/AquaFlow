const Installation = require('../models/Installation');
const User = require('../models/User');
const deviceService = require('./deviceService');
const auditLogService = require('./auditLogService');
const notificationService = require('./notificationService');

class InstallationService {
  async requestInstallation(payload, customerUser) {
    const { address, contactPhone, notes } = payload;

    const installation = await Installation.create({
      requestedBy: customerUser.id,
      address,
      contactPhone,
      notes
    });

    return installation;
  }

  async getAll({ status } = {}) {
    const query = {};
    if (status) query.status = status;
    return Installation.find(query)
      .populate('requestedBy', 'name email fullName phoneNumber')
      .populate('assignedInstaller', 'name email')
      .sort({ createdAt: -1 });
  }

  // An installer's own assigned-but-not-yet-completed jobs.
  async getMine(installerId) {
    return Installation.find({ assignedInstaller: installerId, status: 'assigned' })
      .populate('requestedBy', 'name email fullName phoneNumber address')
      .sort({ assignedAt: 1 });
  }

  async getById(id, requestingUser) {
    const installation = await Installation.findById(id)
      .populate('requestedBy', 'name email fullName phoneNumber address')
      .populate('assignedInstaller', 'name email');
    if (!installation) {
      const err = new Error('Installation request not found');
      err.status = 404;
      throw err;
    }

    if (requestingUser) {
      const isAdminOrDispatcher = ['admin', 'super_admin', 'dispatcher'].includes(requestingUser.userType);
      const isRequester = installation.requestedBy._id.toString() === requestingUser.id.toString();
      const isAssignedInstaller = installation.assignedInstaller?._id?.toString() === requestingUser.id.toString();
      if (!isAdminOrDispatcher && !isRequester && !isAssignedInstaller) {
        const err = new Error('Access denied');
        err.status = 403;
        throw err;
      }
    }

    return installation;
  }

  async assignInstaller(id, installerId, actorUser) {
    const installation = await this.getById(id);
    if (installation.status === 'completed' || installation.status === 'cancelled') {
      const err = new Error(`Cannot assign an installer to a ${installation.status} request`);
      err.status = 400;
      throw err;
    }

    const installer = await User.findById(installerId);
    if (!installer || installer.userType !== 'installer') {
      const err = new Error('Installer not found');
      err.status = 404;
      throw err;
    }

    installation.assignedInstaller = installerId;
    installation.assignedAt = new Date();
    installation.assignedBy = actorUser.id;
    installation.status = 'assigned';
    await installation.save();

    await auditLogService.record({
      action: 'INSTALLATION_ASSIGNED',
      actorUser,
      targetUser: installer,
      changes: { installationId: installation._id, requestedBy: installation.requestedBy }
    });

    notificationService.createNotification(
      installerId,
      'Installation assigned',
      'A new installation visit has been assigned to you.',
      'system_update',
      { installationId: installation._id }
    ).catch(() => {});

    return installation;
  }

  // Installer completes the on-site visit: submits the intake form, which
  // creates the real Device record so it shows up for the customer
  // immediately (reuses deviceService's existing create path).
  async completeInstallation(id, intake, installerUser) {
    const installation = await Installation.findById(id);
    if (!installation) {
      const err = new Error('Installation request not found');
      err.status = 404;
      throw err;
    }
    if (!installation.assignedInstaller || installation.assignedInstaller.toString() !== installerUser.id.toString()) {
      const err = new Error('This installation is not assigned to you');
      err.status = 403;
      throw err;
    }
    if (installation.status !== 'assigned') {
      const err = new Error(`Cannot complete a request with status ${installation.status}`);
      err.status = 400;
      throw err;
    }

    const {
      deviceId, houseLabel, ownerName, numberOfUsers,
      tankLengthCm, tankWidthCm, tankHeightCm,
      tank_depth, tank_full_distance, tankCapacityLiters,
      expectedMonthlyDemand
    } = intake;

    if (!deviceId || !houseLabel || typeof tank_depth !== 'number' || typeof tank_full_distance !== 'number') {
      const err = new Error('deviceId, houseLabel, tank_depth and tank_full_distance are required to complete an installation');
      err.status = 400;
      throw err;
    }

    const device = await deviceService.createDevice({
      deviceId,
      name: houseLabel,
      houseLabel,
      ownerId: installation.requestedBy,
      tank_depth,
      tank_full_distance,
      tankCapacityLiters
    }, installerUser.id);

    installation.intake = {
      deviceId, houseLabel, ownerName, numberOfUsers,
      tankLengthCm, tankWidthCm, tankHeightCm,
      tank_depth, tank_full_distance, tankCapacityLiters,
      expectedMonthlyDemand
    };
    installation.status = 'completed';
    installation.completedAt = new Date();
    installation.device = device._id;
    await installation.save();

    await auditLogService.record({
      action: 'INSTALLATION_COMPLETED',
      actorUser: installerUser,
      targetUser: null,
      changes: { installationId: installation._id, deviceId }
    });

    notificationService.createNotification(
      installation.requestedBy,
      'Device installed',
      'Your water tank device has been installed and is now connected.',
      'system_update',
      { installationId: installation._id, deviceId }
    ).catch(() => {});

    return installation;
  }
}

module.exports = new InstallationService();
