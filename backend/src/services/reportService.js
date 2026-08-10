const Order = require('../models/Order');
const User = require('../models/User');
const Device = require('../models/Device');
const Truck = require('../models/Truck');
const SupportTicket = require('../models/SupportTicket');
const dispatchService = require('./dispatchService');
const truckService = require('./truckService');
const forecastService = require('./forecastService');

function dateRange(from, to) {
  return {
    start: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: to ? new Date(to) : new Date()
  };
}

// Minimal dependency-free CSV writer -- covers the "exportable" requirement
// without pulling in exceljs/pdfkit for a demo-stage app. CSV opens
// directly in Excel/Sheets, which covers most of the practical need;
// true .xlsx/.pdf binary export is a reasonable scope trim, not built here.
function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

class ReportService {
  // SRS §11: top-level KPIs for the admin dashboard
  async getDashboardKPIs({ from, to } = {}) {
    const { start, end } = dateRange(from, to);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [
      trucksByStatus, activeOrders, completedInRange, todaysOrders,
      totalDevices, activeDevices, activeCustomers, revenueAgg, queue
    ] = await Promise.all([
      Truck.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } }),
      Order.countDocuments({ status: 'delivered', deliveredAt: { $gte: start, $lte: end } }),
      Order.countDocuments({ orderDate: { $gte: todayStart } }),
      Device.countDocuments(),
      Device.countDocuments({ status: 'active' }),
      User.countDocuments({ userType: 'customer', status: 'active' }),
      Order.aggregate([
        { $match: { status: 'delivered', deliveredAt: { $gte: start, $lte: end } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      dispatchService.getQueue()
    ]);

    const truckStatusMap = Object.fromEntries(trucksByStatus.map(t => [t._id, t.count]));

    return {
      range: { start, end },
      trucks: {
        active: truckStatusMap.active || 0,
        idle: truckStatusMap.idle || 0,
        assigned: truckStatusMap.assigned || 0,
        onBreak: truckStatusMap.on_break || 0,
        maintenance: truckStatusMap.maintenance || 0
      },
      orders: {
        active: activeOrders,
        completedInRange,
        today: todaysOrders
      },
      devices: { total: totalDevices, active: activeDevices },
      activeCustomers,
      revenueInRange: revenueAgg[0]?.total || 0,
      operationalAlerts: {
        exceptionOrders: queue.exception.length,
        delayedOrders: queue.delayed.length,
        trucksInMaintenance: truckStatusMap.maintenance || 0
      }
    };
  }

  // SRS §13: device capacity vs. truck capacity vs. forecast demand
  async getDeviceCapacityInsights() {
    const [total, active, inactive, maintenance, fleetForecast, fleetUtilization] = await Promise.all([
      Device.countDocuments(),
      Device.countDocuments({ status: 'active' }),
      Device.countDocuments({ status: 'inactive' }),
      Device.countDocuments({ status: 'maintenance' }),
      forecastService.getFleetForecast(),
      truckService.getFleetUtilizationReport()
    ]);

    const overUtilized = fleetUtilization.trucks.filter(t => t.recommendation && t.recommendation.startsWith('Over'));
    const underUtilized = fleetUtilization.trucks.filter(t => t.recommendation && t.recommendation.startsWith('Under'));

    const recommendations = [];
    if (fleetForecast.driverShortfall > 0) {
      recommendations.push(`Forecast indicates ${fleetForecast.expectedOrders} order(s) expected tomorrow but only ${fleetForecast.availableDrivers} driver(s) available (short by ${fleetForecast.driverShortfall}) -- consider adding drivers/trucks.`);
    }
    if (overUtilized.length > 0) {
      recommendations.push(`${overUtilized.length} truck(s) are over-utilized -- fleet capacity may be insufficient for current demand.`);
    }
    if (underUtilized.length > 0) {
      recommendations.push(`${underUtilized.length} truck(s) are under-utilized -- consider reallocating before adding new capacity.`);
    }
    if (inactive + maintenance > total * 0.2 && total > 0) {
      recommendations.push(`${inactive + maintenance} of ${total} devices are inactive/in maintenance -- service coverage may be at risk.`);
    }

    return {
      devices: { total, active, inactive, maintenance, requiringAttention: inactive + maintenance },
      fleetForecast,
      overUtilizedTrucks: overUtilized,
      underUtilizedTrucks: underUtilized,
      recommendations
    };
  }

  // SRS §17: named report types. Each returns { rows, csv }.
  async getReport(type, { from, to } = {}) {
    const { start, end } = dateRange(from, to);
    const builders = {
      sales: () => this._salesReport(start, end),
      'payment-methods': () => this._paymentMethodReport(start, end),
      'driver-performance': () => this._driverPerformanceReport(start, end),
      'truck-utilization': () => this._truckUtilizationReport(start, end),
      'device-status': () => this._deviceStatusReport(),
      'water-consumption': () => this._waterConsumptionReport(),
      'customer-growth': () => this._customerGrowthReport(start, end),
      complaints: () => this._complaintsReport(start, end)
    };

    if (!builders[type]) {
      const err = new Error(`Unknown report type: ${type}. Valid types: ${Object.keys(builders).join(', ')}`);
      err.status = 400;
      throw err;
    }

    const rows = await builders[type]();
    return { type, range: { start, end }, rows, csv: toCsv(rows) };
  }

  async _salesReport(start, end) {
    const orders = await Order.find({ orderDate: { $gte: start, $lte: end } })
      .populate('customer', 'name email')
      .select('orderNumber orderDate status totalAmount paymentMethod paymentStatus customer');
    return orders.map(o => ({
      orderNumber: o.orderNumber,
      date: o.orderDate.toISOString(),
      customer: o.customer?.name || '',
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      totalAmount: o.totalAmount
    }));
  }

  async _paymentMethodReport(start, end) {
    const agg = await Order.aggregate([
      { $match: { orderDate: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } }
    ]);
    const grandTotal = agg.reduce((s, r) => s + r.total, 0) || 1;
    return agg.map(r => ({
      paymentMethod: r._id,
      orderCount: r.count,
      totalAmount: r.total,
      percentOfRevenue: Math.round((r.total / grandTotal) * 1000) / 10
    }));
  }

  async _driverPerformanceReport(start, end) {
    const drivers = await User.find({ userType: 'driver' }).select('name email rating earnings');
    const rows = await Promise.all(drivers.map(async (d) => {
      const delivered = await Order.countDocuments({ driver: d._id, status: 'delivered', deliveredAt: { $gte: start, $lte: end } });
      return {
        driver: d.name,
        email: d.email,
        deliveriesInRange: delivered,
        ratingAverage: d.rating?.average || null,
        totalRatings: d.rating?.totalRatings || 0,
        totalEarned: d.earnings?.totalEarned || 0
      };
    }));
    return rows;
  }

  async _truckUtilizationReport(start, end) {
    const { trucks } = await truckService.getFleetUtilizationReport({ from: start, to: end });
    return trucks.map(t => ({
      plateNumber: t.plateNumber,
      utilizationPercent: t.utilizationPercent,
      busyHours: Math.round(t.busyMs / 3600000 * 10) / 10,
      idleHours: Math.round(t.idleMs / 3600000 * 10) / 10,
      recommendation: t.recommendation || ''
    }));
  }

  async _deviceStatusReport() {
    const devices = await Device.find().select('deviceId name houseLabel status lastSeenAt');
    return devices.map(d => ({
      deviceId: d.deviceId,
      name: d.name,
      houseLabel: d.houseLabel,
      status: d.status,
      lastSeenAt: d.lastSeenAt ? d.lastSeenAt.toISOString() : ''
    }));
  }

  async _waterConsumptionReport() {
    const trends = await forecastService.getConsumptionTrends();
    return trends.all.map(f => ({
      deviceId: f.deviceId,
      name: f.name,
      houseLabel: f.houseLabel,
      avgDailyConsumptionLiters: f.avgDailyConsumptionLiters,
      daysRemaining: f.daysRemaining,
      trend: f.trend
    }));
  }

  async _customerGrowthReport(start, end) {
    const agg = await User.aggregate([
      { $match: { userType: 'customer', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    return agg.map(r => ({ date: r._id, newCustomers: r.count }));
  }

  async _complaintsReport(start, end) {
    const tickets = await SupportTicket.find({ createdAt: { $gte: start, $lte: end } })
      .populate('user', 'name email')
      .select('category priority status createdAt user');
    return tickets.map(t => ({
      user: t.user?.name || '',
      category: t.category,
      priority: t.priority,
      status: t.status,
      createdAt: t.createdAt.toISOString()
    }));
  }
}

module.exports = new ReportService();
