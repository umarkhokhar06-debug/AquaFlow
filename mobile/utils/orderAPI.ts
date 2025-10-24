import axios from 'axios';
import { config } from '../config';
import { 
  Product, 
  Order, 
  CreateOrderRequest, 
  OrderResponse, 
  OrdersResponse, 
  ProductsResponse,
  OrderStatusUpdate,
  OrderStatistics
} from '../types/order';

// Get auth token from storage
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { storage } = await import('./auth');
    const userData = await storage.getUserData();
    return userData?.token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  };
};

// Order API functions
export const orderAPI = {
  // Get available products
  async getProducts(): Promise<Product[]> {
    try {
      const response = await axios.get<ProductsResponse>(`${config.apiUrl}/orders/products`);
      return response.data.products;
    } catch (error) {
      console.error('Error fetching products:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch products');
      }
      throw new Error('Network error');
    }
  },

  // Create a new order
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.post<OrderResponse>(`${config.apiUrl}/orders`, orderData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.success || !response.data.order) {
        throw new Error(response.data.message || 'Failed to create order');
      }

      return response.data.order;
    } catch (error) {
      console.error('Error creating order:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to create order');
      }
      throw new Error('Network error');
    }
  },

  // Get order by ID
  async getOrderById(orderId: string): Promise<Order> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get<OrderResponse>(`${config.apiUrl}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.success || !response.data.order) {
        throw new Error(response.data.message || 'Order not found');
      }

      return response.data.order;
    } catch (error) {
      console.error('Error fetching order:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch order');
      }
      throw new Error('Network error');
    }
  },

  // Get customer orders
  async getMyOrders(): Promise<Order[]> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get<OrdersResponse>(`${config.apiUrl}/orders/my-orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.orders;
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch orders');
      }
      throw new Error('Network error');
    }
  },

  // Get all orders (for drivers and admins)
  async getAllOrders(status?: string, driverId?: string): Promise<Order[]> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (driverId) params.append('driver', driverId);

      const response = await axios.get<OrdersResponse>(`${config.apiUrl}/orders?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.orders;
    } catch (error) {
      console.error('Error fetching all orders:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch orders');
      }
      throw new Error('Network error');
    }
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: OrderStatusUpdate['status']): Promise<Order> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.put<OrderResponse>(`${config.apiUrl}/orders/${orderId}/status`, {
        status
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.success || !response.data.order) {
        throw new Error(response.data.message || 'Failed to update order status');
      }

      return response.data.order;
    } catch (error) {
      console.error('Error updating order status:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to update order status');
      }
      throw new Error('Network error');
    }
  },

  // Assign driver to order
  async assignDriver(orderId: string, driverId: string): Promise<Order> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.put<OrderResponse>(`${config.apiUrl}/orders/${orderId}/assign-driver`, {
        driverId
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.success || !response.data.order) {
        throw new Error(response.data.message || 'Failed to assign driver');
      }

      return response.data.order;
    } catch (error) {
      console.error('Error assigning driver:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to assign driver');
      }
      throw new Error('Network error');
    }
  },

  // Cancel order
  async cancelOrder(orderId: string): Promise<Order> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.put<OrderResponse>(`${config.apiUrl}/orders/${orderId}/cancel`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.data.success || !response.data.order) {
        throw new Error(response.data.message || 'Failed to cancel order');
      }

      return response.data.order;
    } catch (error) {
      console.error('Error cancelling order:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to cancel order');
      }
      throw new Error('Network error');
    }
  },

  // Get order statistics (admin only)
  async getOrderStatistics(): Promise<OrderStatistics> {
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await axios.get<{ success: boolean; statistics: OrderStatistics }>(`${config.apiUrl}/orders/admin/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.statistics;
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
      }
      throw new Error('Network error');
    }
  },
};
