const awsIot = require('aws-iot-device-sdk');
const path = require('path');
const iotDataService = require('../services/iotDataService');


class IoTSubscriber {
  constructor() {
    this.device = null;
    this.isConnected = false;
  }

  connect() {
    try {
      // Use file paths from environment variables
      const crtFolder = path.join(__dirname, '..', 'crt');
      this.device = awsIot.device({
        keyPath: path.join(crtFolder, 'private.key'),
        certPath: path.join(crtFolder, 'certificate.crt'),
        caPath: path.join(crtFolder, 'rootCA.pem'),
        clientId: `aquaflow-backend-${Date.now()}`,
        host: process.env.AWS_IOT_ENDPOINT,
        keepalive: 60,
        protocol: 'mqtts',
        port: 8883,
        reconnectPeriod: 1000
      });

      this.device.on('connect', () => {
        this.isConnected = true;
        console.log('Connected to AWS IoT Core successfully');
        this.subscribeToTopic();
      });

      this.device.on('error', (error) => {
        this.isConnected = false;
        console.error('Failed to connect to AWS IoT Core:', error);
      });
    } catch (error) {
      console.error('Failed to initialize AWS IoT device:', error);
      this.isConnected = false;
      throw error;
    }
  }

  subscribeToTopic() {
    try {
      const topic = process.env.AWS_IOT_TOPIC;
      console.log(`Subscribing to topic: ${topic}`);
      this.device.subscribe(topic);
      this.device.on('message', (topic, payload) => {
        this.handleMessage(topic, payload);
      });
      console.log(`Successfully subscribed to topic: ${topic}`);
    } catch (error) {
      console.error('Failed to subscribe to topic:', error);
      throw error;
    }
  }


  handleMessage(topic, payload) {
    try {
      console.log(`Received message from topic ${topic}`);
      let jsonString = payload.toString();
      const data = JSON.parse(jsonString);
      console.log('Parsed data:', data);
      iotDataService.processIoTData(data)
        .then(() => {
          console.log('Data processed and saved successfully');
        })
        .catch((error) => {
          console.error('Error processing data:', error);
        });
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }


  disconnect() {
    try {
      if (this.device && this.isConnected) {
        this.device.end();
        this.isConnected = false;
        console.log('Disconnected from AWS IoT Core');
      }
    } catch (error) {
      console.error('Error disconnecting from AWS IoT Core:', error);
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = new IoTSubscriber();