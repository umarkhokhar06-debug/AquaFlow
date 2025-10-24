import { Alert } from 'react-native';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: ((notifications: Notification[]) => void)[] = [];

  // Add a new notification
  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): void {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      read: false,
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();

    // Show native alert for important notifications
    this.showNativeAlert(newNotification);
  }

  // Show native alert
  private showNativeAlert(notification: Notification): void {
    const alertTitle = this.getAlertTitle(notification.type);
    
    Alert.alert(
      alertTitle,
      notification.message,
      [
        {
          text: 'OK',
          onPress: () => this.markAsRead(notification.id),
        },
      ],
      { cancelable: true }
    );
  }

  // Get alert title based on notification type
  private getAlertTitle(type: string): string {
    switch (type) {
      case 'success':
        return '✅ Success';
      case 'warning':
        return '⚠️ Warning';
      case 'error':
        return '❌ Error';
      case 'info':
      default:
        return 'ℹ️ Info';
    }
  }

  // Mark notification as read
  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  // Get unread notifications count
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  // Get notifications by type
  getNotificationsByType(type: string): Notification[] {
    return this.notifications.filter(n => n.type === type);
  }

  // Clear all notifications
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  // Clear notifications by type
  clearByType(type: string): void {
    this.notifications = this.notifications.filter(n => n.type !== type);
    this.notifyListeners();
  }

  // Remove specific notification
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  // Add listener for notification changes
  addListener(callback: (notifications: Notification[]) => void): void {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback: (notifications: Notification[]) => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Handle socket notifications
  handleSocketNotification(data: {
    message: string;
    notificationType: 'info' | 'warning' | 'error' | 'success';
    timestamp: string;
  }): void {
    this.addNotification({
      title: 'System Notification',
      message: data.message,
      type: data.notificationType,
    });
  }

  // Handle order notifications
  handleOrderNotification(orderNumber: string, status: string): void {
    const statusMessages = {
      'pending': 'Your order has been received and is being processed',
      'confirmed': 'Your order has been confirmed and is being prepared',
      'preparing': 'Your order is being prepared for delivery',
      'out_for_delivery': 'Your order is out for delivery',
      'delivered': 'Your order has been delivered successfully',
      'cancelled': 'Your order has been cancelled',
    };

    const message = statusMessages[status as keyof typeof statusMessages] || 
                   `Your order ${orderNumber} status has been updated to ${status}`;

    this.addNotification({
      title: `Order ${orderNumber}`,
      message,
      type: status === 'delivered' ? 'success' : 
            status === 'cancelled' ? 'error' : 'info',
    });
  }

  // Handle new order notification (for admin/driver)
  handleNewOrderNotification(orderNumber: string, customerName: string): void {
    this.addNotification({
      title: 'New Order',
      message: `New order ${orderNumber} from ${customerName}`,
      type: 'info',
    });
  }

  // Handle driver assignment notification
  handleDriverAssignmentNotification(orderNumber: string, driverName: string): void {
    this.addNotification({
      title: 'Driver Assigned',
      message: `Order ${orderNumber} has been assigned to ${driverName}`,
      type: 'info',
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
