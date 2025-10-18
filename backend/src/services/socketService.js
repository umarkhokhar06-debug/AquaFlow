const socketAuthMiddleware = require('../middlewares/socketAuthMiddleware');

const socketService = {
  io: null,

  // Initialize Socket.IO
  initialize(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
      }
    });

    // Apply authentication middleware
    this.io.use(socketAuthMiddleware);

    this.setupEventHandlers();
    console.log('Socket.IO initialized');
  },

  // Setup event handlers
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join admin room for admin users
      socket.on('join-admin-room', () => {
        if (socket.user.userType === 'admin') {
          socket.join('admin-room');
          console.log(`Admin joined admin room: ${socket.id}`);
        }
      });

      // Join driver room for driver users
      socket.on('join-driver-room', () => {
        if (socket.user.userType === 'driver' || socket.user.userType === 'admin') {
          socket.join('driver-room');
          socket.join(`driver-${socket.user.id}`);
          console.log(`Driver/Admin joined driver room: ${socket.id}`);
        }
      });

      // Join customer room for customer users
      socket.on('join-customer-room', () => {
        if (socket.user.userType === 'customer') {
          socket.join(`customer-${socket.user.id}`);
          console.log(`Customer joined personal room: ${socket.id}`);
        }
      });

      // Handle driver location updates
      socket.on('update-driver-location', async (data) => {
        if (socket.user.userType !== 'driver') {
          console.log(`Non-driver attempted to update location: ${socket.id}`);
          return;
        }

        try {
          const driverId = socket.user.id;
          const { location, timestamp } = data;

          if (!location || !location.latitude || !location.longitude) {
            console.log('Invalid location data received');
            return;
          }

          // Update driver location in database
          const User = require('../models/User');
          const Order = require('../models/Order');

          await User.findByIdAndUpdate(driverId, {
            'location.latitude': location.latitude,
            'location.longitude': location.longitude,
            'location.lastUpdated': location.lastUpdated || new Date()
          });

          console.log(`Driver ${driverId} location updated: ${location.latitude}, ${location.longitude}`);

          // Find all active orders for this driver
          const activeOrders = await Order.find({
            driver: driverId,
            status: { $in: ['preparing', 'out_for_delivery'] }
          }).select('customer');

          // Emit location update to all customers with active orders from this driver
          const customerIds = activeOrders.map(order => order.customer.toString());
          const uniqueCustomerIds = [...new Set(customerIds)];

          uniqueCustomerIds.forEach(customerId => {
            this.io.to(`customer-${customerId}`).emit('driver-location-update', {
              type: 'driver-location-update',
              data: {
                driverId,
                location: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  lastUpdated: location.lastUpdated || timestamp || new Date().toISOString()
                },
                timestamp: timestamp || new Date().toISOString()
              },
              timestamp: timestamp || new Date().toISOString()
            });
          });

          // Also emit to admin room
          this.io.to('admin-room').emit('driver-location-update', {
            type: 'driver-location-update',
            data: {
              driverId,
              location: {
                latitude: location.latitude,
                longitude: location.longitude,
                lastUpdated: location.lastUpdated || timestamp || new Date().toISOString()
              },
              timestamp: timestamp || new Date().toISOString()
            },
            timestamp: timestamp || new Date().toISOString()
          });

          console.log(`Driver location update emitted to ${uniqueCustomerIds.length} customers and admin`);

        } catch (error) {
          console.error('Error handling driver location update:', error);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  },

  // Emit new order to admin room
  emitNewOrder(order) {
    if (this.io) {
      this.io.to('admin-room').emit('new-order', {
        type: 'new-order',
        data: order,
        timestamp: new Date().toISOString()
      });
      console.log('New order emitted to admin room');
    }
  },

  // Emit order status update
  emitOrderStatusUpdate(orderId, status, updatedBy) {
    if (this.io) {
      this.io.to('admin-room').emit('order-status-update', {
        type: 'order-status-update',
        data: {
          orderId,
          status,
          updatedBy,
          timestamp: new Date().toISOString()
        }
      });

      this.io.to('driver-room').emit('order-status-update', {
        type: 'order-status-update',
        data: {
          orderId,
          status,
          updatedBy,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Order status update emitted: ${orderId} -> ${status}`);
    }
  },

  // Emit order assignment to driver
  emitOrderAssignment(orderId, driverId, driverName) {
    if (this.io) {
      this.io.to('admin-room').emit('order-assignment', {
        type: 'order-assignment',
        data: {
          orderId,
          driverId,
          driverName,
          timestamp: new Date().toISOString()
        }
      });

      this.io.to(`driver-${driverId}`).emit('order-assignment', {
        type: 'order-assignment',
        data: {
          orderId,
          driverId,
          driverName,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Order assignment emitted: ${orderId} -> ${driverName}`);
    }
  },

  // Emit order update to customer
  emitOrderUpdateToCustomer(customerId, orderId, updateType, data) {
    if (this.io) {
      this.io.to(`customer-${customerId}`).emit('order-update', {
        type: 'order-update',
        data: {
          orderId,
          updateType,
          data: data,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

      console.log(`Order update emitted to customer ${customerId}: ${updateType}`);
    }
  },

  // Emit user management updates to admin
  emitUserUpdate(updateType, userData) {
    if (this.io) {
      this.io.to('admin-room').emit('user-update', {
        type: 'user-update',
        data: {
          updateType,
          user: userData,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`User update emitted: ${updateType}`);
    }
  },

  // Emit driver status update
  emitDriverStatusUpdate(driverId, status, location = null) {
    if (this.io) {
      this.io.to('admin-room').emit('driver-status-update', {
        type: 'driver-status-update',
        data: {
          driverId,
          status,
          location,
          timestamp: new Date().toISOString()
        }
      });

      this.io.to(`driver-${driverId}`).emit('driver-status-update', {
        type: 'driver-status-update',
        data: {
          driverId,
          status,
          location,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Driver status update emitted: ${driverId} -> ${status}`);
    }
  },

  // Emit driver queue update
  emitDriverQueueUpdate(driverId, queue) {
    if (this.io) {
      this.io.to('admin-room').emit('driver-queue-update', {
        type: 'driver-queue-update',
        data: {
          driverId,
          queue,
          timestamp: new Date().toISOString()
        }
      });

      this.io.to(`driver-${driverId}`).emit('driver-queue-update', {
        type: 'driver-queue-update',
        data: {
          driverId,
          queue,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`Driver queue update emitted: ${driverId}`);
    }
  },

  // Emit driver location update
  emitDriverLocationUpdate(driverId, location) {
    if (this.io) {
      // Emit to admin room
      this.io.to('admin-room').emit('driver-location-update', {
        type: 'driver-location-update',
        data: {
          driverId,
          location,
          timestamp: new Date().toISOString()
        }
      });

      // Emit to driver's own room
      this.io.to(`driver-${driverId}`).emit('driver-location-update', {
        type: 'driver-location-update',
        data: {
          driverId,
          location,
          timestamp: new Date().toISOString()
        }
      });

      // Optionally emit to customer room(s) if driver has a current order
      const User = require('../models/User');
      const Order = require('../models/Order');
      User.findById(driverId).select('currentOrder').then(async (driver) => {
        if (driver && driver.currentOrder) {
          const order = await Order.findById(driver.currentOrder).select('customer');
          if (order && order.customer) {
            this.io.to(`customer-${order.customer}`).emit('driver-location-update', {
              type: 'driver-location-update',
              data: {
                driverId,
                location,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      });

      console.log(`Driver location update emitted: ${driverId}`);
    }
  },

  // Emit system notification
  emitSystemNotification(message, type = 'info', targetRoom = 'admin-room') {
    if (this.io) {
      this.io.to(targetRoom).emit('system-notification', {
        type: 'system-notification',
        data: {
          message,
          notificationType: type,
          timestamp: new Date().toISOString()
        }
      });

      console.log(`System notification emitted: ${message}`);
    }
  },

  // Get connected clients count
  getConnectedClientsCount() {
    if (this.io) {
      return this.io.engine.clientsCount;
    }
    return 0;
  },

  // Get admin room clients count
  getAdminRoomClientsCount() {
    if (this.io) {
      const adminRoom = this.io.sockets.adapter.rooms.get('admin-room');
      return adminRoom ? adminRoom.size : 0;
    }
    return 0;
  }
};

module.exports = socketService;
