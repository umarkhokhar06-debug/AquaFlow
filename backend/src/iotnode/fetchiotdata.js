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
      const deviceOptions = {
        clientId: `aquaflow-backend-${Date.now()}`,
        host: process.env.AWS_IOT_ENDPOINT,
        keepalive: 60,
        protocol: 'mqtts',
        port: 8883,
        reconnectPeriod: 1000
      };

      // Prefer inline PEM content from env vars (works on hosts with no
      // writable/persistent filesystem, e.g. Render); fall back to the
      // crt/ folder for local development.
      if (process.env.AWS_IOT_CERTIFICATE && process.env.AWS_IOT_PRIVATE_KEY) {
        deviceOptions.privateKey = Buffer.from(process.env.AWS_IOT_PRIVATE_KEY.replace(/\\n/g, '\n'));
        deviceOptions.clientCert = Buffer.from(process.env.AWS_IOT_CERTIFICATE.replace(/\\n/g, '\n'));
        deviceOptions.caCert = Buffer.from((process.env.AWS_ROOT_CA1 || '').replace(/\\n/g, '\n'));
      } else {
        const crtFolder = path.join(__dirname, '..', 'crt');
        deviceOptions.keyPath = path.join(crtFolder, 'private.key');
        deviceOptions.certPath = path.join(crtFolder, 'certificate.crt');
        deviceOptions.caPath = path.join(crtFolder, 'rootCA.pem');
      }

      this.device = awsIot.device(deviceOptions);

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
      if (!data.deviceId) {
        console.error('Ignoring AWS IoT message with no deviceId:', data);
        return;
      }
      iotDataService.processIoTData(data.deviceId, data)
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