# AWS IoT Core Integration

This application includes AWS IoT Core integration to receive sensor data and store it in the database.

## Setup

1. **AWS IoT Core Configuration**:
   - Add your AWS IoT endpoint to `.env` file:
   ```
   AWS_IOT_ENDPOINT=your-iot-endpoint.iot.us-east-1.amazonaws.com
   AWS_IOT_TOPIC=aquaflow/sensor/data
   ```

2. **Certificates**:
   - The certificates are already placed in the `crt/` folder
   - Make sure the certificate files are properly configured in AWS IoT Core

## API Endpoints

### Get Latest IoT Data
```
GET /api/iot/latest
```
Returns the most recently received sensor data.

**Response:**
```json
{
  "success": true,
  "data": {
    "humidity": 20.0,
    "temperature": 29.0,
    "distance": 23.0,
    "timestamp": "2025-10-02T00:18:03.000Z",
    "receivedAt": "2025-10-02T00:18:03.500Z"
  }
}
```

### Get All IoT Data
```
GET /api/iot/all?page=1&limit=50
```
Returns paginated list of all sensor data.

### Check Connection Status
```
GET /api/iot/status
```
Returns the current AWS IoT Core connection status.

### Manual Connection (Testing)
```
POST /api/iot/connect
```
Manually trigger connection to AWS IoT Core.

## Data Format

The expected IoT data format:
```json
{
  "humidity": 20.0,
  "temperature": 29.0,
  "distance": 23.0,
  "timestamp": "Thu Oct  2 00:18:03 2025\n"
}
```

Data is automatically saved to MongoDB when received from AWS IoT Core.