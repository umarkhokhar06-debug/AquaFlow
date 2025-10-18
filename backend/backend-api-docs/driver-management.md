# Driver Management API Documentation

## Overview
This document describes the driver management endpoints for administrators and drivers. Admins can view drivers, assign orders, manage driver queues, and track driver status. Drivers can update their status, location, and complete orders.

## Base URL
```
http://localhost:4000/api/drivers
```

## Authentication
All endpoints require:
- **Authentication**: Valid JWT token in Authorization header
- **Authorization**: Admin role for management operations, Driver role for driver operations

```
Authorization: Bearer <jwt_token>
```

## Driver Status Types
- **free**: Driver is available for new orders
- **busy**: Driver is currently fulfilling an order
- **offline**: Driver is not available

## Endpoints

### 1. Get All Drivers
**GET** `/`

Get all drivers with pagination and filtering options (Admin only).

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Drivers per page (default: 10)
- `driverStatus` (optional): Filter by driver status (free, busy, offline)
- `search` (optional): Search in name, email, or vehicle number

#### Example Request
```
GET /api/drivers?page=1&limit=10&driverStatus=free&search=john
```

#### Response
```json
{
  "success": true,
  "drivers": [
    {
      "id": "driver_id",
      "name": "John Driver",
      "email": "john@example.com",
      "driverStatus": "free",
      "currentOrder": null,
      "orderQueue": [],
      "maxQueueSize": 5,
      "location": {
        "latitude": 24.8607,
        "longitude": 67.0011,
        "lastUpdated": "2024-01-01T00:00:00.000Z"
      },
      "vehicleInfo": {
        "vehicleType": "truck",
        "vehicleNumber": "ABC-123",
        "capacity": 10
      },
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalDrivers": 50,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2. Get Driver by ID
**GET** `/:driverId`

Get detailed information about a specific driver (Admin only).

#### Response
```json
{
  "success": true,
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "email": "john@example.com",
    "driverStatus": "busy",
    "currentOrder": {
      "id": "order_id",
      "orderNumber": "ORD-1704067200000-123",
      "status": "out_for_delivery",
      "totalAmount": 5500,
      "customer": {
        "id": "customer_id",
        "name": "Jane Customer",
        "email": "jane@example.com"
      }
    },
    "orderQueue": [
      {
        "order": {
          "id": "order_id_2",
          "orderNumber": "ORD-1704067200000-124",
          "status": "confirmed",
          "totalAmount": 3000
        },
        "assignedAt": "2024-01-01T12:00:00.000Z",
        "priority": 0
      }
    ],
    "maxQueueSize": 5,
    "location": {
      "latitude": 24.8607,
      "longitude": 67.0011,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    },
    "vehicleInfo": {
      "vehicleType": "truck",
      "vehicleNumber": "ABC-123",
      "capacity": 10
    },
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Update Driver Status
**PUT** `/:driverId/status`

Update driver status (Admin only).

#### Request Body
```json
{
  "status": "free",
  "location": {
    "latitude": 24.8607,
    "longitude": 67.0011
  }
}
```

#### Response
```json
{
  "success": true,
  "message": "Driver status updated successfully",
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "driverStatus": "free",
    "location": {
      "latitude": 24.8607,
      "longitude": 67.0011,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 4. Assign Order to Driver
**PUT** `/:driverId/assign/:orderId`

Assign an order to a driver (Admin only).

#### Response
```json
{
  "success": true,
  "message": "Order assigned to driver successfully",
  "order": {
    "id": "order_id",
    "orderNumber": "ORD-1704067200000-123",
    "driver": {
      "id": "driver_id",
      "name": "John Driver",
      "email": "john@example.com"
    }
  },
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "driverStatus": "busy",
    "queueLength": 1
  }
}
```

#### Error Responses
- **400**: Driver is offline, queue is full, or order already assigned
- **404**: Driver or order not found

### 5. Complete Current Order
**PUT** `/:driverId/complete-order`

Complete the current order and move to next in queue (Driver only).

#### Response
```json
{
  "success": true,
  "message": "Order completed successfully",
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "driverStatus": "free",
    "currentOrder": null,
    "queueLength": 0
  }
}
```

### 6. Reorder Driver Queue
**PUT** `/:driverId/queue/reorder`

Reorder the driver's queue (Admin only).

#### Request Body
```json
{
  "queueOrder": ["order_id_1", "order_id_2", "order_id_3"]
}
```

#### Response
```json
{
  "success": true,
  "message": "Driver queue reordered successfully",
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "orderQueue": [
      {
        "order": "order_id_1",
        "assignedAt": "2024-01-01T12:00:00.000Z",
        "priority": 0
      },
      {
        "order": "order_id_2",
        "assignedAt": "2024-01-01T12:30:00.000Z",
        "priority": 1
      }
    ]
  }
}
```

### 7. Remove Order from Driver Queue
**DELETE** `/:driverId/queue/:orderId`

Remove an order from driver's queue (Admin only).

#### Response
```json
{
  "success": true,
  "message": "Order removed from driver queue successfully",
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "driverStatus": "free",
    "currentOrder": null,
    "queueLength": 0
  }
}
```

### 8. Update Driver Location
**PUT** `/:driverId/location`

Update driver's location (Admin and Driver).

#### Request Body
```json
{
  "latitude": 24.8607,
  "longitude": 67.0011
}
```

#### Response
```json
{
  "success": true,
  "message": "Driver location updated successfully",
  "driver": {
    "id": "driver_id",
    "name": "John Driver",
    "location": {
      "latitude": 24.8607,
      "longitude": 67.0011,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 9. Get Driver Statistics
**GET** `/statistics`

Get driver statistics (Admin only).

#### Response
```json
{
  "success": true,
  "statistics": {
    "totalDrivers": 25,
    "busyDrivers": 10,
    "freeDrivers": 12,
    "offlineDrivers": 3,
    "statusBreakdown": [
      {
        "_id": "free",
        "count": 12
      },
      {
        "_id": "busy",
        "count": 10
      },
      {
        "_id": "offline",
        "count": 3
      }
    ]
  }
}
```

### 10. Search Drivers
**GET** `/search`

Search drivers by name, email, or vehicle number (Admin only).

#### Query Parameters
- `q` (required): Search term
- `driverStatus` (optional): Filter by driver status

#### Example Request
```
GET /api/drivers/search?q=john&driverStatus=free
```

#### Response
```json
{
  "success": true,
  "drivers": [
    {
      "id": "driver_id",
      "name": "John Driver",
      "email": "john@example.com",
      "driverStatus": "free",
      "currentOrder": null,
      "queueLength": 0,
      "vehicleInfo": {
        "vehicleType": "truck",
        "vehicleNumber": "ABC-123",
        "capacity": 10
      }
    }
  ]
}
```

## Real-time Events

### Driver Status Update
```javascript
socket.on('driver-status-update', (data) => {
  // data.data.driverId
  // data.data.status
  // data.data.location
  updateDriverStatus(data.data.driverId, data.data.status);
});
```

### Driver Queue Update
```javascript
socket.on('driver-queue-update', (data) => {
  // data.data.driverId
  // data.data.queue
  updateDriverQueue(data.data.driverId, data.data.queue);
});
```

### Driver Location Update
```javascript
socket.on('driver-location-update', (data) => {
  // data.data.driverId
  // data.data.location
  updateDriverLocation(data.data.driverId, data.data.location);
});
```

## Driver Queue Management

### Queue Behavior
- **Free Driver**: New orders become current order, status changes to busy
- **Busy Driver**: New orders are added to queue
- **Queue Full**: Cannot assign more orders until queue has space
- **Order Completion**: Automatically moves to next order in queue

### Queue Priority
- Orders are processed in FIFO (First In, First Out) order
- Admin can reorder queue to change priority
- Higher priority orders can be moved to front

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Validation error or invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Driver or order not found |
| 500 | Internal Server Error - Server error |

## Usage Examples

### Assign Order to Driver
```bash
curl -X PUT http://localhost:4000/api/drivers/driver_id/assign/order_id \
  -H "Authorization: Bearer <admin_token>"
```

### Update Driver Status
```bash
curl -X PUT http://localhost:4000/api/drivers/driver_id/status \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"status": "free"}'
```

### Complete Order (Driver)
```bash
curl -X PUT http://localhost:4000/api/drivers/driver_id/complete-order \
  -H "Authorization: Bearer <driver_token>"
```

## Frontend Integration

### Admin Dashboard
```javascript
// Listen for driver status updates
socket.on('driver-status-update', (data) => {
  updateDriverInList(data.data.driverId, {
    status: data.data.status,
    location: data.data.location
  });
});

// Listen for queue updates
socket.on('driver-queue-update', (data) => {
  updateDriverQueue(data.data.driverId, data.data.queue);
});
```

### Driver App
```javascript
// Update location
const updateLocation = (latitude, longitude) => {
  fetch(`/api/drivers/${driverId}/location`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ latitude, longitude })
  });
};

// Complete current order
const completeOrder = () => {
  fetch(`/api/drivers/${driverId}/complete-order`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
```

## Notes

- All timestamps are in ISO 8601 format
- Driver locations are updated in real-time
- Queue management is automatic when orders are completed
- Driver status affects order assignment eligibility
- Real-time updates are sent to all relevant parties
