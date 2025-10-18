const Order = require('../models/Order');
const User = require('../models/User');
const socketService = require('./socketService');

// Product configuration
const PRODUCT_CONFIG = {
  large_tanker: {
    name: 'Large Tanker',
    size: '6000 L',
    unitPrice: 2500,    // PKR 2500 per large tanker
    availability: true,
    description: 'Large water tanker for bulk delivery'
  },
  small_tanker: {
    name: 'Small Tanker',
    size: '3500 L',
    unitPrice: 1800,    // PKR 1800 per small tanker
    availability: true,
    description: 'Small water tanker for regular delivery'
  },
  water_bottles: {
    name: 'Water Bottles',
    size: '20 L',
    unitPrice: 500,     // PKR 500 per water bottle
    availability: true,
    description: 'Individual water bottles for personal use'
  }
};

const orderService = {
  // Create a new order
  createOrder: async (customerId, orderData) => {
    try {
      const { items, deliveryAddress, paymentMethod, notes } = orderData;

      // Validate customer exists and is a customer
      const customer = await User.findById(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }
      if (customer.userType !== 'customer') {
        throw new Error('Only customers can place orders');
      }

      // Validate items
      if (!items || items.length === 0) {
        throw new Error('Order must contain at least one item');
      }

      // Process items and calculate prices
      const processedItems = items.map(item => {
        if (!PRODUCT_CONFIG[item.type]) {
          throw new Error(`Invalid product type: ${item.type}`);
        }
        
        const product = PRODUCT_CONFIG[item.type];
        
        // Check availability
        if (!product.availability) {
          throw new Error(`Product ${product.name} is currently unavailable`);
        }
        
        const unitPrice = product.unitPrice;
        const totalPrice = unitPrice * item.quantity;
        
        return {
          type: item.type,
          quantity: item.quantity,
          unitPrice,
          totalPrice
        };
      });

      // Calculate totals
      const subtotal = processedItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const tax = subtotal * 0.1; // 10% tax
      const totalAmount = subtotal + tax;

      // Generate order number
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const orderNumber = `ORD-${timestamp}-${String(random).padStart(3, '0')}`;

      // Create order
      const order = await Order.create({
        orderNumber,
        customer: customerId,
        items: processedItems,
        subtotal,
        tax,
        totalAmount,
        deliveryAddress: {
          fullName: deliveryAddress.fullName || customer.fullName,
          houseNumber: deliveryAddress.houseNumber || customer.houseNumber,
          portion: deliveryAddress.portion || customer.portion,
          address: deliveryAddress.address || customer.address,
          phoneNumber: deliveryAddress.phoneNumber,
          specialInstructions: deliveryAddress.specialInstructions,
          latitude: deliveryAddress.latitude,
          longitude: deliveryAddress.longitude
        },
        paymentMethod: paymentMethod || 'cash',
        notes
      });

      // Populate customer information
      await order.populate('customer', 'name email fullName houseNumber portion address');

      const orderResponse = {
        id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        totalAmount: order.totalAmount,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderDate: order.orderDate,
        notes: order.notes
      };

      // Emit real-time event to admin room
      socketService.emitNewOrder(orderResponse);

      return {
        success: true,
        message: 'Order created successfully',
        order: orderResponse
      };

    } catch (error) {
      console.error('Create order error:', error);
      throw error;
    }
  },

  // Get order by ID
  getOrderById: async (orderId, userId, userType) => {
    try {
      const order = await Order.findById(orderId).populate('customer', 'name email fullName houseNumber portion address');
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check access permissions
      if (userType === 'customer' && order.customer._id.toString() !== userId) {
        throw new Error('Access denied. You can only view your own orders');
      }

      return {
        success: true,
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          status: order.status,
          driver: order.driver,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          deliveredAt: order.deliveredAt,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt
        }
      };

    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  },

  // Get orders by customer
  getOrdersByCustomer: async (customerId) => {
    try {
      const orders = await Order.find({ customer: customerId })
        .sort({ orderDate: -1 })
        .populate('driver', 'name email');

      return {
        success: true,
        orders: orders.map(order => ({
          _id: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          totalAmount: order.totalAmount,
          deliveryAddress: order.deliveryAddress,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          deliveredAt: order.deliveredAt,
          driver: order.driver ? {
            id: order.driver._id,
            name: order.driver.name,
            email: order.driver.email
          } : null,
          notes: order.notes,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          __v: order.__v
        }))
      };

    } catch (error) {
      console.error('Get customer orders error:', error);
      throw error;
    }
  },

  // Get all orders (for drivers and admins)
  getAllOrders: async (filters = {}) => {
    try {
      const query = {};
      
      if (filters.status) {
        query.status = filters.status;
      }
      
      if (filters.driver) {
        query.driver = filters.driver;
      }

      const orders = await Order.find(query)
        .populate('customer', 'name email fullName houseNumber portion address')
        .populate('driver', 'name email')
        .sort({ orderDate: -1 });

      return {
        success: true,
        orders: orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer,
          items: order.items,
          totalAmount: order.totalAmount,
          status: order.status,
          driver: order.driver,
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate
        }))
      };

    } catch (error) {
      console.error('Get all orders error:', error);
      throw error;
    }
  },

  // Update order status
  updateOrderStatus: async (orderId, status, userId, userType) => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check permissions
      if (userType === 'customer' && order.customer.toString() !== userId) {
        throw new Error('Access denied. You can only update your own orders');
      }

      // Validate status transition
      const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['preparing', 'cancelled'],
        preparing: ['out_for_delivery', 'cancelled'],
        out_for_delivery: ['delivered'],
        delivered: [],
        cancelled: []
      };

      if (!validTransitions[order.status].includes(status)) {
        throw new Error(`Cannot change status from ${order.status} to ${status}`);
      }

      // Update order
      order.status = status;
      
      if (status === 'delivered') {
        order.deliveredAt = new Date();
      }
      
      if (status === 'out_for_delivery' && !order.deliveryDate) {
        order.deliveryDate = new Date();
      }

      await order.save();

      // Emit real-time event
      socketService.emitOrderStatusUpdate(order._id, status, userId);

      // Emit update to customer
      socketService.emitOrderUpdateToCustomer(order.customer, order._id, 'status-update', {
        status: order.status,
        updatedAt: order.updatedAt
      });

      return {
        success: true,
        message: 'Order status updated successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          updatedAt: order.updatedAt
        }
      };

    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  },

  // Assign driver to order
  assignDriver: async (orderId, driverId, adminId) => {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const driver = await User.findById(driverId);
      if (!driver || driver.userType !== 'driver') {
        throw new Error('Invalid driver');
      }

      order.driver = driverId;
      await order.save();

      // Emit real-time event
      socketService.emitOrderAssignment(order._id, driverId, driver.name);

      // Emit update to customer
      socketService.emitOrderUpdateToCustomer(order.customer, order._id, 'driver-assigned', {
        driver: {
          id: driver._id,
          name: driver.name,
          email: driver.email
        }
      });

      return {
        success: true,
        message: 'Driver assigned successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          driver: {
            id: driver._id,
            name: driver.name,
            email: driver.email
          }
        }
      };

    } catch (error) {
      console.error('Assign driver error:', error);
      throw error;
    }
  },

  // Get available products with prices
  getAvailableProducts: async () => {
    try {
      const products = Object.entries(PRODUCT_CONFIG).map(([type, config]) => ({
        type,
        name: config.name,
        size: config.size,
        unitPrice: config.unitPrice,
        availability: config.availability,
        description: config.description
      }));

      return {
        success: true,
        products
      };

    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  },

  // Cancel order
  cancelOrder: async (orderId, userId, userType) => {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check permissions
      if (userType === 'customer' && order.customer.toString() !== userId) {
        throw new Error('Access denied. You can only cancel your own orders');
      }

      // Check if order can be cancelled
      if (['delivered', 'cancelled'].includes(order.status)) {
        throw new Error('Order cannot be cancelled');
      }

      order.status = 'cancelled';
      await order.save();

      return {
        success: true,
        message: 'Order cancelled successfully',
        order: {
          id: order._id,
          orderNumber: order.orderNumber,
          status: order.status
        }
      };

    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }
};


module.exports = orderService;
