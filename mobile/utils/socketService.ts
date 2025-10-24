import { io, Socket } from 'socket.io-client';
import { config } from '../config';
import { storage } from './auth';

export interface SocketEventData {
  type: string;
  data: any;
  timestamp: string;
}

export interface NewOrderData {
  id: string;
  orderNumber: string;
  customer: {
    id: string;
    name: string;
    email: string;
    fullName: string;
    houseNumber: string;
    portion: string;
    address: string;
  };
  items: Array<{
    type: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  totalAmount: number;
  deliveryAddress: {
    fullName: string;
    houseNumber: string;
    portion: string;
    address: string;
    phoneNumber: string;
    specialInstructions?: string;
  };
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  orderDate: string;
  notes?: string;
}

export interface OrderStatusUpdateData {
  orderId: string;
  status: string;
  updatedBy: string;
  timestamp: string;
}

export interface OrderAssignmentData {
  orderId: string;
  driverId: string;
  driverName: string;
  timestamp: string;
}

export interface OrderUpdateData {
  orderId: string;
  updateType: 'status-update' | 'driver-assigned';
  data: {
    status?: string;
    driver?: {
      id: string;
      name: string;
      email: string;
    };
  };
  timestamp: string;
}

export interface UserUpdateData {
  updateType: 'created' | 'updated' | 'blocked' | 'unblocked' | 'deleted';
  user: {
    id: string;
    name: string;
    email: string;
    userType: string;
    status: string;
  };
  timestamp: string;
}

export interface SystemNotificationData {
  message: string;
  notificationType: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
}

export interface DriverLocationData {
  driverId: string;
  location: {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  };
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // Event listeners
  private newOrderListeners: ((data: NewOrderData) => void)[] = [];
  private driverLocationListeners: ((data: DriverLocationData) => void)[] = [];
  private orderStatusUpdateListeners: ((data: OrderStatusUpdateData) => void)[] = [];
  private orderAssignmentListeners: ((data: OrderAssignmentData) => void)[] = [];
  private orderUpdateListeners: ((data: OrderUpdateData) => void)[] = [];
  private userUpdateListeners: ((data: UserUpdateData) => void)[] = [];
  private systemNotificationListeners: ((data: SystemNotificationData) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];

  async connect(): Promise<void> {
    try {
      const userData = await storage.getUserData();
      if (!userData?.token) {
        throw new Error('No authentication token found');
      }

      this.socket = io(config.backendUrl, {
        auth: {
          token: userData.token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Socket connection error:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionListeners.forEach(listener => listener(true));
      
      // Join appropriate room based on user type
      this.joinUserRoom();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      this.connectionListeners.forEach(listener => listener(false));
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => {
          this.socket?.connect();
        }, 2000 * this.reconnectAttempts);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionListeners.forEach(listener => listener(true));
      this.joinUserRoom();
    });

    // Order events
    this.socket.on('new-order', (data: SocketEventData) => {
      console.log('New order received:', data);
      this.newOrderListeners.forEach(listener => listener(data.data));
    });

    this.socket.on('order-status-update', (data: SocketEventData) => {
      console.log('Order status update received:', data);
      this.orderStatusUpdateListeners.forEach(listener => listener(data.data));
    });

    this.socket.on('order-assignment', (data: SocketEventData) => {
      console.log('Order assignment received:', data);
      this.orderAssignmentListeners.forEach(listener => listener(data.data));
    });

    this.socket.on('order-update', (data: SocketEventData) => {
      console.log('Order update received:', data);
      this.orderUpdateListeners.forEach(listener => listener(data.data));
    });

    // Driver location updates
    this.socket.on('driver-location-update', (data: SocketEventData) => {
      console.log('[SocketService] Driver location update received:', JSON.stringify(data, null, 2));
      if (!data || !data.data) {
        console.warn('[SocketService] Invalid driver location data received:', data);
        return;
      }
      this.driverLocationListeners.forEach(listener => listener(data.data));
    });

    this.socket.on('user-update', (data: SocketEventData) => {
      console.log('User update received:', data);
      this.userUpdateListeners.forEach(listener => listener(data.data));
    });

    this.socket.on('system-notification', (data: SocketEventData) => {
      console.log('System notification received:', data);
      this.systemNotificationListeners.forEach(listener => listener(data.data));
    });
  }

  private async joinUserRoom(): Promise<void> {
    if (!this.socket || !this.isConnected) return;

    try {
      const userData = await storage.getUserData();
      if (!userData?.user) return;

      const userType = userData.user.userType;
      
      switch (userType) {
        case 'admin':
          this.socket.emit('join-admin-room');
          break;
        case 'driver':
          this.socket.emit('join-driver-room');
          break;
        case 'customer':
          this.socket.emit('join-customer-room');
          break;
      }
    } catch (error) {
      console.error('Error joining user room:', error);
    }
  }

  // Event listener registration methods
  onNewOrder(callback: (data: NewOrderData) => void): void {
    this.newOrderListeners.push(callback);
  }

  onDriverLocationUpdate(callback: (data: DriverLocationData) => void): void {
    this.driverLocationListeners.push(callback);
  }

  onOrderStatusUpdate(callback: (data: OrderStatusUpdateData) => void): void {
    this.orderStatusUpdateListeners.push(callback);
  }

  onOrderAssignment(callback: (data: OrderAssignmentData) => void): void {
    this.orderAssignmentListeners.push(callback);
  }

  onOrderUpdate(callback: (data: OrderUpdateData) => void): void {
    this.orderUpdateListeners.push(callback);
  }

  onUserUpdate(callback: (data: UserUpdateData) => void): void {
    this.userUpdateListeners.push(callback);
  }

  onSystemNotification(callback: (data: SystemNotificationData) => void): void {
    this.systemNotificationListeners.push(callback);
  }

  onConnectionChange(callback: (connected: boolean) => void): void {
    this.connectionListeners.push(callback);
  }

  // Remove event listeners
  removeNewOrderListener(callback: (data: NewOrderData) => void): void {
    this.newOrderListeners = this.newOrderListeners.filter(cb => cb !== callback);
  }

  removeDriverLocationListener(callback: (data: DriverLocationData) => void): void {
    this.driverLocationListeners = this.driverLocationListeners.filter(cb => cb !== callback);
  }

  removeOrderStatusUpdateListener(callback: (data: OrderStatusUpdateData) => void): void {
    this.orderStatusUpdateListeners = this.orderStatusUpdateListeners.filter(cb => cb !== callback);
  }

  removeOrderAssignmentListener(callback: (data: OrderAssignmentData) => void): void {
    this.orderAssignmentListeners = this.orderAssignmentListeners.filter(cb => cb !== callback);
  }

  removeOrderUpdateListener(callback: (data: OrderUpdateData) => void): void {
    this.orderUpdateListeners = this.orderUpdateListeners.filter(cb => cb !== callback);
  }

  removeUserUpdateListener(callback: (data: UserUpdateData) => void): void {
    this.userUpdateListeners = this.userUpdateListeners.filter(cb => cb !== callback);
  }

  removeSystemNotificationListener(callback: (data: SystemNotificationData) => void): void {
    this.systemNotificationListeners = this.systemNotificationListeners.filter(cb => cb !== callback);
  }

  removeConnectionChangeListener(callback: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(cb => cb !== callback);
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }

  // Emit events (if needed)
  emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Emit driver location update
  emitDriverLocation(location: { latitude: number; longitude: number }): void {
    if (!this.socket || !this.isConnected) {
      console.warn('[SocketService] Cannot emit driver location - socket not connected');
      return;
    }
    
    const locationData = {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        lastUpdated: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
    
    console.log('[SocketService] Emitting driver location:', JSON.stringify(locationData, null, 2));
    this.socket.emit('update-driver-location', locationData);
  }
}

// Export singleton instance
export const socketService = new SocketService();
