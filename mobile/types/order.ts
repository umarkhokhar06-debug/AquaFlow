// Order Management Types

export interface Product {
  type: 'large_tanker' | 'small_tanker' | 'water_bottles';
  name: string;
  size: string;
  unitPrice: number;
  availability: boolean;
  description: string;
}

export interface OrderItem {
  type: 'large_tanker' | 'small_tanker' | 'water_bottles';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DeliveryAddress {
  fullName: string;
  houseNumber: string;
  portion: 'upper' | 'lower';
  address: string;
  phoneNumber: string;
  specialInstructions?: string;
  latitude?: number;
  longitude?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  fullName: string;
  houseNumber: string;
  portion: 'upper' | 'lower';
  address: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  location?: {
    latitude: number;
    longitude: number;
    lastUpdated?: string;
  };
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: string | Customer; // Can be either ID string or populated customer object
  items: OrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'card' | 'online';
  deliveryType?: 'immediate' | 'scheduled' | 'recurring';
  scheduledFor?: string | { $date: string } | null;
  orderDate: string | { $date: string };
  deliveryDate?: string | { $date: string } | null;
  deliveredAt?: string | { $date: string } | null;
  driver?: Driver | null;
  notes?: string;
  createdAt: string | { $date: string };
  updatedAt: string | { $date: string };
  __v?: number;
}

export interface CreateOrderRequest {
  items: Array<{
    type: 'large_tanker' | 'small_tanker' | 'water_bottles';
    quantity: number;
  }>;
  deliveryAddress: DeliveryAddress;
  paymentMethod: 'cash' | 'card' | 'online';
  notes?: string;
  deliveryType?: 'immediate' | 'scheduled';
  scheduledFor?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  order?: Order;
}

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
}

export interface ProductsResponse {
  success: boolean;
  products: Product[];
}

export interface OrderStatusUpdate {
  status: 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
}

export interface QueueStatus {
  status: Order['status'];
  terminal: boolean;
  position: number | null;
  etaMinutes: number | null;
}

export interface QueueStatusResponse extends QueueStatus {
  success: boolean;
  message?: string;
}

export interface OrderStatistics {
  totalOrders: number;
  totalRevenue: number;
  statusBreakdown: Array<{
    _id: string;
    count: number;
    totalAmount: number;
  }>;
}

// Utility function to parse MongoDB date objects
export const parseDate = (date: string | { $date: string }): Date => {
  if (typeof date === 'string') {
    return new Date(date);
  }
  return new Date(date.$date);
};

// Utility function to get order ID (handle both _id and id)
export const getOrderId = (order: Order): string => {
  return order._id || (order as any).id || '';
};
