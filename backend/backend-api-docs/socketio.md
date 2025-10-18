# Socket.IO Real-time Communication Documentation

## Overview
This document describes the Socket.IO implementation for real-time communication in the Tanker App Server. It enables live updates for orders, user management, and system notifications.

## Base URL
```
http://localhost:4000
```

## Installation (Frontend)

### JavaScript/Node.js
```bash
npm install socket.io-client
```

### React
```bash
npm install socket.io-client
```

### Vue.js
```bash
npm install socket.io-client
```

## Connection Setup

### Basic Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: 'your_jwt_token_here'
  }
});
```

### With Authentication
```javascript
const socket = io('http://localhost:4000', {
  auth: {
    token: localStorage.getItem('authToken')
  },
  autoConnect: false
});

// Connect after authentication
socket.connect();
```

## Authentication

All Socket.IO connections require a valid JWT token. The token should be provided in the `auth.token` field during connection.

### Authentication Error Handling
```javascript
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication token required') {
    // Redirect to login
    window.location.href = '/login';
  } else if (error.message === 'User account is blocked') {
    // Show blocked message
    alert('Your account has been blocked');
  }
});
```

## Room Management

### Join Admin Room
```javascript
// Only for admin users
socket.emit('join-admin-room');
```

### Join Driver Room
```javascript
// For driver and admin users
socket.emit('join-driver-room');
```

### Join Customer Room
```javascript
// For customer users
socket.emit('join-customer-room');
```

## Event Listeners

### 1. New Order (Admin Only)
Emitted when a new order is created.

```javascript
socket.on('new-order', (data) => {
  console.log('New order received:', data);
  // data.type: 'new-order'
  // data.data: order object
  // data.timestamp: ISO timestamp
});
```

**Data Structure:**
```javascript
{
  type: 'new-order',
  data: {
    id: 'order_id',
    orderNumber: 'ORD-1704067200000-123',
    customer: {
      id: 'customer_id',
      name: 'John Doe',
      email: 'john@example.com',
      fullName: 'John Michael Doe',
      houseNumber: '123',
      portion: 'upper',
      address: '123 Main Street, City, State'
    },
    items: [
      {
        type: 'large_tanker',
        quantity: 2,
        unitPrice: 2500,
        totalPrice: 5000
      }
    ],
    subtotal: 5000,
    tax: 500,
    totalAmount: 5500,
    deliveryAddress: { /* ... */ },
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    orderDate: '2024-01-01T00:00:00.000Z',
    notes: 'Please deliver in the morning'
  },
  timestamp: '2024-01-01T00:00:00.000Z'
}
```

### 2. Order Status Update
Emitted when order status changes.

```javascript
socket.on('order-status-update', (data) => {
  console.log('Order status updated:', data);
  // Update order status in UI
  updateOrderStatus(data.data.orderId, data.data.status);
});
```

**Data Structure:**
```javascript
{
  type: 'order-status-update',
  data: {
    orderId: 'order_id',
    status: 'confirmed',
    updatedBy: 'user_id',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

### 3. Order Assignment
Emitted when a driver is assigned to an order.

```javascript
socket.on('order-assignment', (data) => {
  console.log('Order assigned to driver:', data);
  // Update order with driver info
  updateOrderDriver(data.data.orderId, data.data.driverName);
});
```

**Data Structure:**
```javascript
{
  type: 'order-assignment',
  data: {
    orderId: 'order_id',
    driverId: 'driver_id',
    driverName: 'Jane Smith',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

### 4. Order Update (Customer)
Emitted to customers when their order is updated.

```javascript
socket.on('order-update', (data) => {
  console.log('Order update received:', data);
  // Update customer's order view
  updateCustomerOrder(data.data.orderId, data.data.updateType, data.data.data);
});
```

**Data Structure:**
```javascript
{
  type: 'order-update',
  data: {
    orderId: 'order_id',
    updateType: 'status-update' | 'driver-assigned',
    data: {
      // Update-specific data
      status: 'confirmed',
      driver: { /* driver info */ }
    },
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

### 5. User Update (Admin Only)
Emitted when user management operations occur.

```javascript
socket.on('user-update', (data) => {
  console.log('User update received:', data);
  // Update user list in admin panel
  updateUserList(data.data.updateType, data.data.user);
});
```

**Data Structure:**
```javascript
{
  type: 'user-update',
  data: {
    updateType: 'created' | 'updated' | 'blocked' | 'unblocked' | 'deleted',
    user: {
      id: 'user_id',
      name: 'John Doe',
      email: 'john@example.com',
      userType: 'customer',
      status: 'active'
    },
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

### 6. System Notification
Emitted for system-wide notifications.

```javascript
socket.on('system-notification', (data) => {
  console.log('System notification:', data);
  // Show notification to user
  showNotification(data.data.message, data.data.notificationType);
});
```

**Data Structure:**
```javascript
{
  type: 'system-notification',
  data: {
    message: 'System maintenance scheduled for 2 AM',
    notificationType: 'info' | 'warning' | 'error' | 'success',
    timestamp: '2024-01-01T00:00:00.000Z'
  }
}
```

## React Integration Example

### Hook for Socket Connection
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export const useSocket = (token) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (token) {
      const newSocket = io('http://localhost:4000', {
        auth: { token }
      });

      newSocket.on('connect', () => {
        setConnected(true);
        console.log('Connected to server');
      });

      newSocket.on('disconnect', () => {
        setConnected(false);
        console.log('Disconnected from server');
      });

      newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [token]);

  return { socket, connected };
};
```

### Admin Dashboard Component
```javascript
import React, { useEffect, useState } from 'react';
import { useSocket } from './hooks/useSocket';

const AdminDashboard = ({ authToken, userType }) => {
  const { socket, connected } = useSocket(authToken);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (socket && userType === 'admin') {
      // Join admin room
      socket.emit('join-admin-room');

      // Listen for new orders
      socket.on('new-order', (data) => {
        setOrders(prev => [data.data, ...prev]);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: `New order ${data.data.orderNumber} received`,
          type: 'info'
        }]);
      });

      // Listen for order status updates
      socket.on('order-status-update', (data) => {
        setOrders(prev => prev.map(order => 
          order.id === data.data.orderId 
            ? { ...order, status: data.data.status }
            : order
        ));
      });

      // Listen for system notifications
      socket.on('system-notification', (data) => {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message: data.data.message,
          type: data.data.notificationType
        }]);
      });

      return () => {
        socket.off('new-order');
        socket.off('order-status-update');
        socket.off('system-notification');
      };
    }
  }, [socket, userType]);

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Status: {connected ? 'Connected' : 'Disconnected'}</p>
      
      <div className="notifications">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        ))}
      </div>

      <div className="orders">
        {orders.map(order => (
          <div key={order.id} className="order">
            <h3>Order {order.orderNumber}</h3>
            <p>Customer: {order.customer.name}</p>
            <p>Status: {order.status}</p>
            <p>Total: PKR {order.totalAmount / 100}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
```

## Vue.js Integration Example

### Composable for Socket
```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export function useSocket(token) {
  const socket = ref(null);
  const connected = ref(false);

  onMounted(() => {
    if (token) {
      socket.value = io('http://localhost:4000', {
        auth: { token }
      });

      socket.value.on('connect', () => {
        connected.value = true;
      });

      socket.value.on('disconnect', () => {
        connected.value = false;
      });
    }
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.close();
    }
  });

  return { socket, connected };
}
```

## Error Handling

### Connection Errors
```javascript
socket.on('connect_error', (error) => {
  switch (error.message) {
    case 'Authentication token required':
      // Redirect to login
      break;
    case 'User not found':
      // Token invalid, refresh or re-login
      break;
    case 'User account is blocked':
      // Show blocked message
      break;
    default:
      console.error('Connection error:', error);
  }
});
```

### Reconnection
```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnected after', attemptNumber, 'attempts');
  // Rejoin rooms if needed
  if (userType === 'admin') {
    socket.emit('join-admin-room');
  }
});
```

## Best Practices

1. **Authentication**: Always provide a valid JWT token
2. **Room Management**: Join appropriate rooms based on user type
3. **Error Handling**: Handle connection errors gracefully
4. **Cleanup**: Remove event listeners on component unmount
5. **Reconnection**: Handle reconnection scenarios
6. **Security**: Never expose sensitive data in socket events

## Testing

### Test Connection
```javascript
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('Socket disconnected');
});
```

### Test Events
```javascript
// Test new order event
socket.emit('join-admin-room');
// Create an order through API to trigger the event
```

## Troubleshooting

### Common Issues
1. **Authentication Failed**: Check JWT token validity
2. **Connection Refused**: Verify server is running on correct port
3. **Events Not Received**: Ensure proper room joining
4. **CORS Issues**: Check server CORS configuration

### Debug Mode
```javascript
const socket = io('http://localhost:4000', {
  auth: { token },
  debug: true
});
```
