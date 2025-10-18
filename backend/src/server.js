const app = require('./app');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');
const iotSubscriber = require('./iotnode/fetchiotdata');

const PORT = process.env.PORT || 5000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    // Initialize Socket.IO
    socketService.initialize(server);

    // Connect to AWS IoT Core
    try {
      await iotSubscriber.connect();
      console.log('AWS IoT Core subscriber initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AWS IoT Core subscriber:', error);
      // Continue server startup even if IoT connection fails
    }

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
