const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userType: {
    type: String,
    required: [true, 'Please provide a user type'],
    enum: {
      values: ['customer', 'driver', 'admin'],
      message: 'User type must be customer, driver, or admin'
    }
  },
  // Common fields for all user types
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  // Customer-specific fields
  fullName: {
    type: String,
    required: function() {
      return this.userType === 'customer';
    },
    trim: true,
    maxlength: [100, 'Full name cannot be more than 100 characters']
  },
  houseNumber: {
    type: String,
    required: function() {
      return this.userType === 'customer';
    },
    trim: true,
    maxlength: [20, 'House number cannot be more than 20 characters']
  },
  portion: {
    type: String,
    required: function() {
      return this.userType === 'customer';
    },
    enum: {
      values: ['upper', 'lower'],
      message: 'Portion must be either upper or lower'
    }
  },
  address: {
    type: String,
    required: function() {
      return this.userType === 'customer';
    },
    trim: true,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  // User status
  status: {
    type: String,
    required: true,
    enum: {
      values: ['active', 'blocked'],
      message: 'Status must be active or blocked'
    },
    default: 'active'
  },
  
  // Driver-specific fields
  driverStatus: {
    type: String,
    required: function() {
      return this.userType === 'driver';
    },
    enum: {
      values: ['free', 'busy', 'offline'],
      message: 'Driver status must be free, busy, or offline'
    },
    default: 'offline'
  },
  currentOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  orderQueue: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    priority: {
      type: Number,
      default: 0
    }
  }],
  maxQueueSize: {
    type: Number,
    default: 5,
    min: [1, 'Max queue size must be at least 1'],
    max: [10, 'Max queue size cannot exceed 10']
  },
  location: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  vehicleInfo: {
    vehicleType: {
      type: String,
      enum: ['truck', 'van', 'motorcycle'],
      default: 'truck'
    },
    vehicleNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Vehicle number cannot exceed 20 characters']
    },
    capacity: {
      type: Number,
      min: [1, 'Capacity must be at least 1']
    },
    licensePlate: {
      type: String,
      trim: true,
      maxlength: [15, 'License plate cannot exceed 15 characters']
    },
    insuranceNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Insurance number cannot exceed 50 characters']
    }
  },
  // Driver performance metrics
  rating: {
    average: {
      type: Number,
      default: 5.0,
      min: [1, 'Rating cannot be less than 1'],
      max: [5, 'Rating cannot be more than 5']
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  // Driver earnings
  earnings: {
    totalEarned: {
      type: Number,
      default: 0,
      min: [0, 'Total earned cannot be negative']
    },
    currentMonthEarnings: {
      type: Number,
      default: 0,
      min: [0, 'Current month earnings cannot be negative']
    },
    lastPayoutDate: {
      type: Date,
      default: null
    }
  },
  // Driver settings
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'ur', 'ar']
    },
    autoAcceptOrders: {
      type: Boolean,
      default: false
    }
  },
  blockedAt: {
    type: Date,
    default: null
  },
  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  blockedReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Block reason cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
