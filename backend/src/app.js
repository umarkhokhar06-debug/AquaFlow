const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userManagementRoutes = require('./routes/userManagement');
const driverRoutes = require('./routes/drivers');
const iotRoutes = require('./routes/iot');
const calibrationRoutes = require('./routes/calibration');
const driverAppRoutes = require('./routes/driverApp');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/users', userManagementRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/driver', driverAppRoutes); // Driver mobile app routes

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Handle 404 - Route not found
app.use('*', (req, res) => {
  console.log('Route not found', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
