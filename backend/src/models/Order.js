const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order identification
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  
  // Customer information
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Order items
  items: [{
    type: {
      type: String,
      required: true,
      enum: ['large_tanker', 'small_tanker', 'water_bottles']
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price must be positive']
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price must be positive']
    }
  }],
  
  // Order totals
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal must be positive']
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax must be positive']
  },
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount must be positive']
  },
  
  // Delivery information
  deliveryAddress: {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    houseNumber: {
      type: String,
      required: true,
      trim: true
    },
    portion: {
      type: String,
      required: true,
      enum: ['upper', 'lower']
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [500, 'Special instructions cannot exceed 500 characters']
    },
    latitude: {
      type: Number,
      required: true,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      required: true,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  
  // Order status
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending'
  },
  
  // Driver assignment
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  // Timestamps
  orderDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  
  // Payment information
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'wallet'],
    default: 'cash'
  },
  
  // Order notes
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  
  // System fields
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});


// Calculate totals before saving
orderSchema.pre('save', function(next) {
  if (this.isModified('items')) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalAmount = this.subtotal + this.tax;
  }
  next();
});

// Instance method to get order summary
orderSchema.methods.getOrderSummary = function() {
  return {
    orderNumber: this.orderNumber,
    customer: this.customer,
    items: this.items,
    totalAmount: this.totalAmount,
    status: this.status,
    orderDate: this.orderDate
  };
};

// Static method to get orders by status
orderSchema.statics.getOrdersByStatus = function(status) {
  return this.find({ status }).populate('customer', 'name email userType');
};

// Static method to get orders by customer
orderSchema.statics.getOrdersByCustomer = function(customerId) {
  return this.find({ customer: customerId }).sort({ orderDate: -1 });
};

// Static method to get orders by driver
orderSchema.statics.getOrdersByDriver = function(driverId) {
  return this.find({ driver: driverId }).populate('customer', 'name email phoneNumber');
};

module.exports = mongoose.model('Order', orderSchema);
