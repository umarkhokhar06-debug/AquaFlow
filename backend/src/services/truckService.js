const Truck = require('../models/Truck');
const User = require('../models/User');

class TruckService {
  async createTruck(payload, createdBy) {
    const { plateNumber, capacity, status } = payload;

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

    const { plateNumber, capacity, status } = updates;

    if (plateNumber !== undefined) truck.plateNumber = plateNumber.trim().toUpperCase();
    if (capacity !== undefined) truck.capacity = capacity;
    if (status !== undefined) truck.status = status;

    await truck.save();
    return this.getTruckById(truck._id);
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
