const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const userManagementRoutes = require('./routes/userManagement');
const driverRoutes = require('./routes/drivers');
const iotRoutes = require('./routes/iot');
const calibrationRoutes = require('./routes/calibration');
const driverAppRoutes = require('./routes/driverApp');
const deviceRoutes = require('./routes/devices');
const truckRoutes = require('./routes/trucks');
const dispatchRoutes = require('./routes/dispatch');
const forecastRoutes = require('./routes/forecast');
const reportRoutes = require('./routes/reports');
const promoCodeRoutes = require('./routes/promoCodes');
const financeRoutes = require('./routes/finance');
const paymentRoutes = require('./routes/payments');
const paymentController = require('./controllers/paymentController');
const supportRoutes = require('./routes/support');

const app = express();

// The app sits behind a single CloudFront distribution -- trust its
// X-Forwarded-For so req.ip resolves to the real client, not CloudFront.
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Stripe webhook signature verification needs the raw, unparsed request
// body, so this route must be registered before express.json() runs.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Static device simulator control panel: /simulator
app.use('/simulator', express.static(path.join(__dirname, '..', 'public', 'simulator')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin/users', userManagementRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/iot', iotRoutes);
app.use('/api/calibration', calibrationRoutes);
app.use('/api/driver', driverAppRoutes); // Driver mobile app routes
app.use('/api/devices', deviceRoutes);
app.use('/api/admin/trucks', truckRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/admin/finance', financeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/support', supportRoutes);

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
