import { useEffect, useState, useCallback } from 'react';
import { socketService, NewOrderData, OrderStatusUpdateData, OrderAssignmentData, OrderUpdateData, UserUpdateData, SystemNotificationData } from '../utils/socketService';

export interface UseSocketReturn {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  onNewOrder: (callback: (data: NewOrderData) => void) => void;
  onOrderStatusUpdate: (callback: (data: OrderStatusUpdateData) => void) => void;
  onOrderAssignment: (callback: (data: OrderAssignmentData) => void) => void;
  onOrderUpdate: (callback: (data: OrderUpdateData) => void) => void;
  onUserUpdate: (callback: (data: UserUpdateData) => void) => void;
  onSystemNotification: (callback: (data: SystemNotificationData) => void) => void;
  removeNewOrderListener: (callback: (data: NewOrderData) => void) => void;
  removeOrderStatusUpdateListener: (callback: (data: OrderStatusUpdateData) => void) => void;
  removeOrderAssignmentListener: (callback: (data: OrderAssignmentData) => void) => void;
  removeOrderUpdateListener: (callback: (data: OrderUpdateData) => void) => void;
  removeUserUpdateListener: (callback: (data: UserUpdateData) => void) => void;
  removeSystemNotificationListener: (callback: (data: SystemNotificationData) => void) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(async () => {
    try {
      await socketService.connect();
    } catch (error) {
      console.error('Failed to connect to socket:', error);
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
  }, []);

  const onNewOrder = useCallback((callback: (data: NewOrderData) => void) => {
    socketService.onNewOrder(callback);
  }, []);

  const onOrderStatusUpdate = useCallback((callback: (data: OrderStatusUpdateData) => void) => {
    socketService.onOrderStatusUpdate(callback);
  }, []);

  const onOrderAssignment = useCallback((callback: (data: OrderAssignmentData) => void) => {
    socketService.onOrderAssignment(callback);
  }, []);

  const onOrderUpdate = useCallback((callback: (data: OrderUpdateData) => void) => {
    socketService.onOrderUpdate(callback);
  }, []);

  const onUserUpdate = useCallback((callback: (data: UserUpdateData) => void) => {
    socketService.onUserUpdate(callback);
  }, []);

  const onSystemNotification = useCallback((callback: (data: SystemNotificationData) => void) => {
    socketService.onSystemNotification(callback);
  }, []);

  const removeNewOrderListener = useCallback((callback: (data: NewOrderData) => void) => {
    socketService.removeNewOrderListener(callback);
  }, []);

  const removeOrderStatusUpdateListener = useCallback((callback: (data: OrderStatusUpdateData) => void) => {
    socketService.removeOrderStatusUpdateListener(callback);
  }, []);

  const removeOrderAssignmentListener = useCallback((callback: (data: OrderAssignmentData) => void) => {
    socketService.removeOrderAssignmentListener(callback);
  }, []);

  const removeOrderUpdateListener = useCallback((callback: (data: OrderUpdateData) => void) => {
    socketService.removeOrderUpdateListener(callback);
  }, []);

  const removeUserUpdateListener = useCallback((callback: (data: UserUpdateData) => void) => {
    socketService.removeUserUpdateListener(callback);
  }, []);

  const removeSystemNotificationListener = useCallback((callback: (data: SystemNotificationData) => void) => {
    socketService.removeSystemNotificationListener(callback);
  }, []);

  useEffect(() => {
    // Listen for connection changes
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    socketService.onConnectionChange(handleConnectionChange);

    return () => {
      socketService.removeConnectionChangeListener(handleConnectionChange);
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    onNewOrder,
    onOrderStatusUpdate,
    onOrderAssignment,
    onOrderUpdate,
    onUserUpdate,
    onSystemNotification,
    removeNewOrderListener,
    removeOrderStatusUpdateListener,
    removeOrderAssignmentListener,
    removeOrderUpdateListener,
    removeUserUpdateListener,
    removeSystemNotificationListener,
  };
};
