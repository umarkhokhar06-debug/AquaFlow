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
      const { items, deliveryAddress, paymentMethod, notes, deliveryType, scheduledFor } = orderData;

      if (deliveryType === 'scheduled' && !scheduledFor) {
        throw new Error('scheduledFor is required when deliveryType is scheduled');
      }

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
        notes,
        deliveryType: deliveryType || 'immediate',
        scheduledFor: deliveryType === 'scheduled' ? new Date(scheduledFor) : null
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
        notes: order.notes,
        deliveryType: order.deliveryType,
        scheduledFor: order.scheduledFor
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
      if (userType === 'customer' && order.customer._id.toString() !== userId.toString()) {
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
        .populate('driver', 'name email phoneNumber location');

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
            email: order.driver.email,
            phone: order.driver.phoneNumber,
            location: order.driver.location
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
      if (userType === 'customer' && order.customer.toString() !== userId.toString()) {
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
      if (userType === 'customer' && order.customer.toString() !== userId.toString()) {
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
  },

  // The code the customer reads out to the driver to confirm delivery.
  // Owner-only -- deliveryOtp is select:false on the schema, never leaked
  // through any other order-serialization path (including to the driver).
  getDeliveryOtp: async (orderId, userId) => {
    try {
      const order = await Order.findById(orderId).select('+deliveryOtp customer status');
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.customer.toString() !== userId.toString()) {
        throw new Error('Access denied. You can only view your own order\'s OTP');
      }
      if (!order.deliveryOtp) {
        throw new Error('No delivery OTP has been issued yet -- a driver must be assigned first');
      }

      return { success: true, otp: order.deliveryOtp, status: order.status };
    } catch (error) {
      console.error('Get delivery OTP error:', error);
      throw error;
    }
  },

  // Customer rates the driver for a completed order.
  rateOrder: async (orderId, userId, { score, comment }) => {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }
      if (order.customer.toString() !== userId.toString()) {
        throw new Error('Access denied. You can only rate your own orders');
      }
      if (order.status !== 'delivered') {
        throw new Error('Only delivered orders can be rated');
      }
      if (order.rating && order.rating.score) {
        throw new Error('This order has already been rated');
      }
      if (!score || score < 1 || score > 5) {
        throw new Error('score must be between 1 and 5');
      }

      order.rating = { score, comment, ratedAt: new Date() };
      await order.save();

      if (order.driver) {
        const driver = await User.findById(order.driver);
        if (driver) {
          const newTotal = (driver.rating.totalRatings || 0) + 1;
          const newAverage = ((driver.rating.average || 5) * (driver.rating.totalRatings || 0) + score) / newTotal;
          driver.rating.average = Math.round(newAverage * 100) / 100;
          driver.rating.totalRatings = newTotal;
          await driver.save();
        }
      }

      return { success: true, message: 'Rating submitted successfully', rating: order.rating };
    } catch (error) {
      console.error('Rate order error:', error);
      throw error;
    }
  },

  // Structured invoice/receipt data for a completed (or in-progress) order.
  getInvoice: async (orderId, userId, userType) => {
    try {
      const order = await Order.findById(orderId)
        .populate('customer', 'name email fullName houseNumber portion address')
        .populate('driver', 'name email');
      if (!order) {
        throw new Error('Order not found');
      }
      if (userType === 'customer' && order.customer._id.toString() !== userId.toString()) {
        throw new Error('Access denied. You can only view your own invoices');
      }

      return {
        success: true,
        invoice: {
          orderNumber: order.orderNumber,
          issuedAt: order.deliveredAt || order.orderDate,
          customer: order.customer,
          deliveryAddress: order.deliveryAddress,
          items: order.items,
          subtotal: order.subtotal,
          tax: order.tax,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          driver: order.driver,
          status: order.status,
          deliveredAt: order.deliveredAt
        }
      };
    } catch (error) {
      console.error('Get invoice error:', error);
      throw error;
    }
  },

  // Clone a previous order's items/address into a fresh order.
  reorder: async (orderId, userId) => {
    try {
      const previous = await Order.findById(orderId);
      if (!previous) {
        throw new Error('Order not found');
      }
      if (previous.customer.toString() !== userId.toString()) {
        throw new Error('Access denied. You can only reorder your own orders');
      }

      return orderService.createOrder(userId, {
        items: previous.items.map(i => ({ type: i.type, quantity: i.quantity })),
        deliveryAddress: previous.deliveryAddress,
        paymentMethod: previous.paymentMethod
      });
    } catch (error) {
      console.error('Reorder error:', error);
      throw error;
    }
  }
};


module.exports = orderService;
