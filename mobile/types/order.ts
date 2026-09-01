// Order Management Types

// Single source of truth for the order status lifecycle -- other files
// (driverAPI.ts, order screens, tracking) import this instead of
// re-declaring the union, which is what let the driver app and customer
// app drift out of sync with the backend before this rework.
export const ORDER_STATUSES = [
  'order_created',
  'queued',
  'driver_assigned',
  'going_to_filling_station',
  'water_filled',
  'on_the_way',
  'arrived',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

// Human-readable label per status, for any screen that just needs to
// display the current stage without a full step-by-step timeline.
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  order_created: 'Order Placed',
  queued: 'In Queue',
  driver_assigned: 'Driver Assigned',
  going_to_filling_station: 'Going to Filling Station',
  water_filled: 'Water Filled',
  on_the_way: 'On the Way',
  arrived: 'Arrived',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

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
  status: OrderStatus;
  statusHistory?: Array<{ status: OrderStatus; changedAt: string | { $date: string } }>;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'cash' | 'card' | 'online';
  deliveryType?: 'immediate' | 'scheduled' | 'recurring';
  scheduledFor?: string | { $date: string } | null;
  isExpress?: boolean;
  expressFee?: number;
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
  isExpress?: boolean;
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
  status: OrderStatus;
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
