
import axios from 'axios';
import { config } from '../config';

// Types for Driver API
export interface VehicleInfo {
  vehicleType: string;
  vehicleNumber: string;
  capacity: number;
  licensePlate: string;
  insuranceNumber: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  email: string;
  vehicleInfo: VehicleInfo;
  settings: {
    notificationsEnabled: boolean;
    soundEnabled: boolean;
    language: string;
    autoAcceptOrders: boolean;
  };
  rating: number;
  totalRatings: number;
  status: 'free' | 'busy' | 'offline';
}

export interface DriverRegisterRequest {
  name: string;
  email: string;
  password: string;
  vehicleInfo: VehicleInfo;
}

export interface DriverLoginRequest {
  email: string;
  password: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface SupportTicket {
  subject: string;
  description: string;
  category: 'general' | 'technical' | 'payment' | 'order_issue' | 'account' | 'vehicle';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface DriverSettings {
  notifications: {
    push_enabled: boolean;
    sound_enabled: boolean;
    new_orders: boolean;
    order_updates: boolean;
    promotions: boolean;
    system_updates: boolean;
  };
  privacy: {
    location_sharing: boolean;
    data_analytics: boolean;
    marketing_communications: boolean;
  };
  preferences: {
    language: string;
    currency: string;
    distance_unit: string;
    dark_mode: boolean;
  };
}

export interface DriverOrder {
  id: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  status: 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  createdAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface DashboardStats {
  todayEarnings: number;
  todayOrders: number;
  monthEarnings: number;
  monthOrders: number;
  pendingOrders: number;
  rating: number;
  totalRatings: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order_assigned' | 'order_update' | 'payment_received' | 'promotion' | 'system_update';
  read: boolean;
  createdAt: string;
  orderId?: string;
  data?: any;
}

export interface Earnings {
  id: string;
  orderId: string;
  amount: number;
  type: 'delivery_fee' | 'tip' | 'bonus' | 'penalty';
  status: 'pending' | 'paid' | 'processing';
  description: string;
  createdAt: string;
  paidAt?: string;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingAmount: number;
  paidAmount: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

// Helper functions
const createDriverAPIInstance = () => {
  const instance = axios.create({
    baseURL: `${config.backendUrl}/api/driver`,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(async (config) => {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const token = await AsyncStorage.default.getItem('driver_auth_token');
      if (token) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      // No token, skip
    }
    return config;
  });

  return instance;
};

const getAuthToken = async (): Promise<string | null> => {
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    const userDataRaw = await AsyncStorage.default.getItem('userData');
    if (!userDataRaw) throw new Error('No auth token found');
    const userData = JSON.parse(userDataRaw);
    if (!userData.token) throw new Error('No auth token found');
    return userData.token;
  } catch (error) {
    throw new Error('No auth token found');
  }
};

export const driverAPI = {

  // Profile Management
  async getProfile(): Promise<DriverProfile> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.get('/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch profile');
      }
      throw new Error('Network error');
    }
  },

  async updateProfile(data: Partial<DriverProfile>): Promise<{ success: boolean; message: string; driver?: DriverProfile }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.put('/profile', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating driver profile:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update profile');
      }
      throw new Error('Network error');
    }
  },

  // Vehicle Management
  async updateVehicleInfo(vehicleInfo: VehicleInfo): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.put('/vehicle', vehicleInfo, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating vehicle info:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update vehicle info');
      }
      throw new Error('Network error');
    }
  },

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
  const api = createDriverAPIInstance();
  const response = await api.get('/dashboard/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Dashboard stats response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch dashboard data');
      }
      throw new Error('Network error');
    }
  },

  // Orders
  async getOrders(params?: { status?: string; page?: number; limit?: number }): Promise<{ orders: DriverOrder[]; total: number; page: number; totalPages: number }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const api = createDriverAPIInstance();
      const response = await api.get('/orders', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      console.log('Orders response:', JSON.stringify(response.data));
      
      // Backend already returns orders in the correct format
      const rawData = response.data.data;
      
      // Check if orders are already in DriverOrder format (has 'id' field)
      // or need mapping from MongoDB format (has '_id' field)
      const orders = rawData.orders || [];
      const mappedOrders = orders.map((order: any) => {
        // If backend already formatted the order, use it directly with minor adjustments
        if (order.id && order.deliveryLocation) {
          return {
            ...order,
            // Ensure all required fields exist with defaults
            id: order.id,
            orderNumber: order.orderNumber || '',
            customerId: order.customerId || '',
            customerName: order.customerName || '',
            customerAddress: order.customerAddress || order.deliveryLocation?.address || '',
            customerPhone: order.customerPhone || '',
            status: order.status || '',
            priority: order.priority || 'medium',
            items: (order.items || []).map((item: any) => ({
              productId: item.productId || '',
              productName: item.productName || '',
              quantity: item.quantity || 0,
              price: item.price || 0,
            })),
            totalAmount: order.totalAmount || 0,
            deliveryFee: order.deliveryFee || 0,
            estimatedDeliveryTime: order.estimatedDeliveryTime || '',
            pickupLocation: order.pickupLocation || { latitude: 0, longitude: 0, address: '' },
            deliveryLocation: {
              latitude: order.deliveryLocation?.latitude ?? 0,
              longitude: order.deliveryLocation?.longitude ?? 0,
              address: order.deliveryLocation?.address || '',
            },
            createdAt: order.createdAt || '',
            acceptedAt: order.acceptedAt || undefined,
            pickedUpAt: order.pickedUpAt || undefined,
            deliveredAt: order.deliveredAt || undefined,
            notes: order.notes || '',
          };
        }
        
        // Legacy format: Map from MongoDB structure
        return {
          id: order._id,
          orderNumber: order.orderNumber,
          customerId: order.customer?._id || '',
          customerName: order.customer?.name || '',
          customerAddress: order.deliveryAddress?.address || '',
          customerPhone: order.deliveryAddress?.phoneNumber || '',
          status: order.status || '',
          priority: 'medium' as 'medium' | 'low' | 'high' | 'urgent',
          items: (order.items || []).map((item: any) => ({
            productId: item._id || '',
            productName: item.type || '',
            quantity: item.quantity,
            price: item.unitPrice,
          })),
          totalAmount: order.totalAmount,
          deliveryFee: 0,
          estimatedDeliveryTime: order.deliveryDate || order.orderDate || '',
          pickupLocation: { latitude: 0, longitude: 0, address: '' },
          deliveryLocation: { 
            latitude: order.deliveryAddress?.latitude || 0, 
            longitude: order.deliveryAddress?.longitude || 0, 
            address: order.deliveryAddress?.address || '' 
          },
          createdAt: order.createdAt,
          acceptedAt: undefined,
          pickedUpAt: undefined,
          deliveredAt: order.deliveredAt,
          notes: order.notes,
        };
      });
      
      return {
        orders: mappedOrders,
        total: rawData.total || mappedOrders.length,
        page: rawData.page || 1,
        totalPages: rawData.totalPages || 1,
      };
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch orders');
      }
      throw new Error('Network error');
    }
  },

  async getOrderById(orderId: string): Promise<DriverOrder> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.get(`/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Map backend order format to DriverOrder format
      const order = response.data.data;
      
      // Check if backend already formatted the order (has 'id' field)
      if (order.id && order.deliveryLocation) {
        return {
          ...order,
          id: order.id,
          orderNumber: order.orderNumber || '',
          customerId: order.customerId || '',
          customerName: order.customerName || '',
          customerAddress: order.customerAddress || order.deliveryLocation?.address || '',
          customerPhone: order.customerPhone || '',
          status: order.status || '',
          priority: order.priority || 'medium',
          items: (order.items || []).map((item: any) => ({
            productId: item.productId || '',
            productName: item.productName || '',
            quantity: item.quantity || 0,
            price: item.price || 0,
          })),
          totalAmount: order.totalAmount || 0,
          deliveryFee: order.deliveryFee || 0,
          estimatedDeliveryTime: order.estimatedDeliveryTime || '',
          pickupLocation: order.pickupLocation || { latitude: 0, longitude: 0, address: '' },
          deliveryLocation: {
            latitude: order.deliveryLocation?.latitude ?? 0,
            longitude: order.deliveryLocation?.longitude ?? 0,
            address: order.deliveryLocation?.address || '',
          },
          createdAt: order.createdAt || '',
          acceptedAt: order.acceptedAt || undefined,
          pickedUpAt: order.pickedUpAt || undefined,
          deliveredAt: order.deliveredAt || undefined,
          notes: order.notes || '',
        };
      }
      
      // Legacy format: Map from MongoDB structure
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customer?._id || '',
        customerName: order.customer?.name || '',
        customerAddress: order.deliveryAddress?.address || '',
        customerPhone: order.deliveryAddress?.phoneNumber || '',
        status: order.status || '',
        priority: 'medium' as 'medium' | 'low' | 'high' | 'urgent',
        items: (order.items || []).map((item: any) => ({
          productId: item._id || '',
          productName: item.type || '',
          quantity: item.quantity,
          price: item.unitPrice,
        })),
        totalAmount: order.totalAmount,
        deliveryFee: 0,
        estimatedDeliveryTime: order.deliveryDate || order.orderDate || '',
        pickupLocation: { latitude: 0, longitude: 0, address: '' },
        deliveryLocation: { 
          latitude: order.deliveryAddress?.latitude || 0, 
          longitude: order.deliveryAddress?.longitude || 0, 
          address: order.deliveryAddress?.address || '' 
        },
        createdAt: order.createdAt,
        acceptedAt: undefined,
        pickedUpAt: undefined,
        deliveredAt: order.deliveredAt,
        notes: order.notes,
      };
    } catch (error) {
      console.error('Error fetching order:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch order');
      }
      throw new Error('Network error');
    }
  },

  async acceptOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.post(`/orders/${orderId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error accepting order:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to accept order');
      }
      throw new Error('Network error');
    }
  },

  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.put(`/orders/${orderId}/status`, { status, notes }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating order status:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update order status');
      }
      throw new Error('Network error');
    }
  },

  // Notifications
  async getNotifications(params?: { page?: number; limit?: number; read?: boolean }): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');
      const api = createDriverAPIInstance();
      const response = await api.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch notifications');
      }
      throw new Error('Network error');
    }
  },

  async markNotificationAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.put(`/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to mark notification as read');
      }
      throw new Error('Network error');
    }
  },

  async markAllNotificationsAsRead(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

  const api = createDriverAPIInstance();
  const response = await api.put('/notifications/mark-all-read', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to mark all notifications as read');
      }
      throw new Error('Network error');
    }
  },

  // Location tracking
  async updateLocation(location: LocationUpdate): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

  const api = createDriverAPIInstance();
  const response = await api.put('/location', location, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating location:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update location');
      }
      throw new Error('Network error');
    }
  },

  // Driver Status
  async updateDriverStatus(status: 'free' | 'busy' | 'offline'): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

  const api = createDriverAPIInstance();
  const response = await api.put('/status', { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating driver status:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update status');
      }
      throw new Error('Network error');
    }
  },

  // Earnings
  async getEarnings(params?: { year?: number; month?: number; page?: number; limit?: number }): Promise<{ earnings: Earnings[]; summary: EarningsSummary }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.get('/earnings', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      console.log('Earnings fetched successfully:', JSON.stringify(response.data));
      return response.data.data;
    } catch (error) {
      console.error('Error fetching earnings:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch earnings');
      }
      throw new Error('Network error');
    }
  },

  // Settings
  async getSettings(): Promise<DriverSettings> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.get('/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch settings');
      }
      throw new Error('Network error');
    }
  },

  async updateSettings(settings: DriverSettings): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.put('/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error updating settings:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update settings');
      }
      throw new Error('Network error');
    }
  },

  // Support
  async getFAQs(): Promise<FAQ[]> {
    try {
  const api = createDriverAPIInstance();
  const response = await api.get('/support/faqs');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch FAQs');
      }
      throw new Error('Network error');
    }
  },

  async createSupportTicket(ticket: SupportTicket): Promise<{ success: boolean; message: string; ticketId?: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

  const api = createDriverAPIInstance();
  const response = await api.post('/support/tickets', ticket, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to create support ticket');
      }
      throw new Error('Network error');
    }
  },

  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Authentication required');

      const api = createDriverAPIInstance();
      const response = await api.delete('/account', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting account:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to delete account');
      }
      throw new Error('Network error');
    }
  },
};