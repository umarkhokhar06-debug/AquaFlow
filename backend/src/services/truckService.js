const Truck = require('../models/Truck');
const User = require('../models/User');

class TruckService {
  async createTruck(payload, createdBy) {
    const {
      plateNumber, capacity, status,
      registrationNumber, registrationExpiry,
      insurancePolicyNumber, insuranceExpiry
    } = payload;

    if (!plateNumber) {
      const err = new Error('plateNumber is required');
      err.status = 400;
      throw err;
    }

    const existing = await Truck.findOne({ plateNumber: plateNumber.trim().toUpperCase() });
    if (existing) {
      const err = new Error('A truck with this plate number already exists');
      err.status = 409;
      throw err;
    }

    const truck = new Truck({
      plateNumber: plateNumber.trim().toUpperCase(),
      capacity,
      status: status || 'idle',
      registrationNumber,
      registrationExpiry,
      insurancePolicyNumber,
      insuranceExpiry,
      createdBy
    });

    await truck.save();
    return this.getTruckById(truck._id);
  }

  async getAllTrucks({ page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const [trucks, total] = await Promise.all([
      Truck.find()
        .populate('assignedDriver', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Truck.countDocuments()
    ]);

    return {
      trucks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  async getTruckById(id) {
    const truck = await Truck.findById(id).populate('assignedDriver', 'name email');
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }
    return truck;
  }

  async updateTruck(id, updates) {
    const truck = await Truck.findById(id);
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }

    const {
      plateNumber, capacity, status,
      registrationNumber, registrationExpiry,
      insurancePolicyNumber, insuranceExpiry
    } = updates;

    if (plateNumber !== undefined) truck.plateNumber = plateNumber.trim().toUpperCase();
    if (capacity !== undefined) truck.capacity = capacity;
    if (status !== undefined) truck.status = status;
    if (registrationNumber !== undefined) truck.registrationNumber = registrationNumber;
    if (registrationExpiry !== undefined) truck.registrationExpiry = registrationExpiry;
    if (insurancePolicyNumber !== undefined) truck.insurancePolicyNumber = insurancePolicyNumber;
    if (insuranceExpiry !== undefined) truck.insuranceExpiry = insuranceExpiry;

    await truck.save();
    return this.getTruckById(truck._id);
  }

  async addMaintenanceRecord(truckId, { description, cost, performedAt }, recordedBy) {
    const truck = await Truck.findById(truckId);
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }

    if (!description) {
      const err = new Error('description is required');
      err.status = 400;
      throw err;
    }

    truck.maintenanceHistory.push({
      description,
      cost,
      performedAt: performedAt || new Date(),
      recordedBy
    });

    await truck.save();
    return this.getTruckById(truck._id);
  }

  // Walks statusHistory and sums how long the truck spent in each status
  // within [from, to] — accurate for any date range, no drifting counters.
  async getUtilization(truckId, { from, to } = {}) {
    const truck = await Truck.findById(truckId);
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }

    const rangeStart = from ? new Date(from) : new Date(truck.createdAt);
    const rangeEnd = to ? new Date(to) : new Date();

    return this._computeUtilization(truck, rangeStart, rangeEnd);
  }

  _computeUtilization(truck, rangeStart, rangeEnd) {
    const history = [...truck.statusHistory].sort((a, b) => a.changedAt - b.changedAt);
    const statusMs = {};
    let cursor = rangeStart;

    for (let i = 0; i < history.length; i++) {
      const entry = history[i];
      const segmentStart = entry.changedAt > cursor ? entry.changedAt : cursor;
      const segmentEnd = (history[i + 1] ? history[i + 1].changedAt : rangeEnd);
      const clampedEnd = segmentEnd < rangeEnd ? segmentEnd : rangeEnd;

      if (clampedEnd > segmentStart && segmentStart >= rangeStart) {
        const duration = clampedEnd - segmentStart;
        statusMs[entry.status] = (statusMs[entry.status] || 0) + duration;
      }
    }

    const totalMs = Math.max(1, rangeEnd - rangeStart);
    const busyMs = (statusMs.active || 0) + (statusMs.assigned || 0);
    const idleMs = statusMs.idle || 0;

    return {
      truckId: truck._id,
      plateNumber: truck.plateNumber,
      rangeStart,
      rangeEnd,
      statusBreakdownMs: statusMs,
      busyMs,
      idleMs,
      totalMs,
      utilizationPercent: Math.round((busyMs / totalMs) * 1000) / 10
    };
  }

  // Fleet-wide utilization with simple threshold-based flags. These are
  // grounded only in observed truck busy/idle time -- not demand forecasting
  // (that requires the forecast engine, a later phase), so recommendations
  // stay honest about what data they're actually based on.
  async getFleetUtilizationReport({ from, to, underThreshold = 20, overThreshold = 80 } = {}) {
    const trucks = await Truck.find();
    const rangeEnd = to ? new Date(to) : new Date();

    const report = trucks.map((truck) => {
      const rangeStart = from ? new Date(from) : new Date(truck.createdAt);
      const utilization = this._computeUtilization(truck, rangeStart, rangeEnd);

      let recommendation = null;
      if (utilization.utilizationPercent < underThreshold) {
        recommendation = `Under-utilized (${utilization.utilizationPercent}% busy) -- consider reassigning this truck or reviewing its route coverage.`;
      } else if (utilization.utilizationPercent > overThreshold) {
        recommendation = `Over-utilized (${utilization.utilizationPercent}% busy) -- this truck is near capacity, consider adding fleet capacity in its area.`;
      }

      return { ...utilization, recommendation };
    });

    return { trucks: report };
  }

  async deleteTruck(id) {
    const truck = await Truck.findById(id);
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }

    if (truck.assignedDriver) {
      const err = new Error('Unassign the driver before deleting this truck');
      err.status = 400;
      throw err;
    }

    await Truck.findByIdAndDelete(id);
    return truck;
  }

  async assignDriver(truckId, driverId) {
    const truck = await Truck.findById(truckId);
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }

    const driver = await User.findById(driverId);
    if (!driver || driver.userType !== 'driver') {
      const err = new Error('driverId must reference an existing driver account');
      err.status = 400;
      throw err;
    }

    // A driver can only hold one truck — free whichever one they currently have.
    const previousTruck = await Truck.findOne({ assignedDriver: driver._id, _id: { $ne: truck._id } });
    if (previousTruck) {
      previousTruck.assignedDriver = null;
      previousTruck.status = 'idle';
      await previousTruck.save();
    }

    truck.assignedDriver = driver._id;
    truck.status = 'assigned';
    await truck.save();

    return this.getTruckById(truck._id);
  }

  async unassignDriver(truckId) {
    const truck = await Truck.findById(truckId);
    if (!truck) {
      const err = new Error('Truck not found');
      err.status = 404;
      throw err;
    }

    truck.assignedDriver = null;
    truck.status = 'idle';
    await truck.save();

    return this.getTruckById(truck._id);
  }
}

module.exports = new TruckService();
