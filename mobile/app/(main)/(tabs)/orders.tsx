import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, CircleCheck as CheckCircle, Truck, Droplets, Calendar, MapPin, Filter, Menu, Bell } from 'lucide-react-native';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { globalstyles } from '@/app/commans/style';
import HeaderComponent from '@/app/components/Header';
import { orderAPI } from '@/utils/orderAPI';
import { Order, parseDate, getOrderId } from '@/types/order';
import { useSocket } from '@/hooks/useSocket';
import { notificationService } from '@/utils/notificationService';

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('active');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isConnected, connect, onOrderUpdate, onOrderStatusUpdate, removeOrderUpdateListener, removeOrderStatusUpdateListener } = useSocket();

  // Fetch orders from API
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const ordersData = await orderAPI.getMyOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh orders
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchOrders();
    
    // Connect to socket
    connect().catch(error => {
      console.error('Failed to connect to socket:', error);
    });
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!isConnected) return;

    // Handle order updates (for customers)
    const handleOrderUpdate = (data: any) => {
      console.log('Order update received:', data);
      
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (getOrderId(order) === data.orderId) {
            const updatedOrder = { ...order };
            
            if (data.updateType === 'status-update' && data.data.status) {
              updatedOrder.status = data.data.status;
              notificationService.handleOrderNotification(order.orderNumber, data.data.status);
            }
            
            if (data.updateType === 'driver-assigned' && data.data.driver) {
              updatedOrder.driver = data.data.driver;
              notificationService.handleDriverAssignmentNotification(order.orderNumber, data.data.driver.name);
            }
            
            return updatedOrder;
          }
          return order;
        });
      });
    };

    // Handle order status updates (for all users)
    const handleOrderStatusUpdate = (data: any) => {
      console.log('Order status update received:', data);
      
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (getOrderId(order) === data.orderId) {
            const updatedOrder = { ...order, status: data.status };
            notificationService.handleOrderNotification(order.orderNumber, data.status);
            return updatedOrder;
          }
          return order;
        });
      });
    };

    // Register listeners
    onOrderUpdate(handleOrderUpdate);
    onOrderStatusUpdate(handleOrderStatusUpdate);

    // Cleanup listeners on unmount
    return () => {
      removeOrderUpdateListener(handleOrderUpdate);
      removeOrderStatusUpdateListener(handleOrderStatusUpdate);
    };
  }, [isConnected, onOrderUpdate, onOrderStatusUpdate, removeOrderUpdateListener, removeOrderStatusUpdateListener]);

  // Filter orders based on active tab
  const activeOrders = orders.filter(order => 
    ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(order.status)
  );

  const completedOrders = orders.filter(order => 
    ['delivered', 'cancelled'].includes(order.status)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#F59E0B';
      case 'confirmed':
        return '#087EA4';
      case 'preparing':
        return '#8B5CF6';
      case 'out_for_delivery':
        return '#FF6B35';
      case 'delivered':
        return '#28A745';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} color="#F59E0B" />;
      case 'confirmed':
        return <CheckCircle size={16} color="#087EA4" />;
      case 'preparing':
        return <Clock size={16} color="#8B5CF6" />;
      case 'out_for_delivery':
        return <Truck size={16} color="#FF6B35" />;
      case 'delivered':
        return <CheckCircle size={16} color="#28A745" />;
      case 'cancelled':
        return <Clock size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'preparing':
        return 'Preparing';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (date: string | { $date: string }) => {
    const parsedDate = parseDate(date);
    return parsedDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: string | { $date: string }) => {
    const parsedDate = parseDate(date);
    return parsedDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const getProductName = (type: string) => {
      switch (type) {
        case 'large_tanker':
          return 'Large Tanker';
        case 'small_tanker':
          return 'Small Tanker';
        case 'water_bottles':
          return 'Water Bottles';
        default:
          return type;
      }
    };

    const getProductSize = (type: string) => {
      switch (type) {
        case 'large_tanker':
          return '6000L';
        case 'small_tanker':
          return '3500L';
        case 'water_bottles':
          return '20L';
        default:
          return '';
      }
    };

    const handleOrderPress = () => {
      // Navigate to order details
      router.push(`/(main)/order-details/${getOrderId(order)}`);
    };

    return (
      <TouchableOpacity style={styles.orderCard} onPress={handleOrderPress}>
        <View style={styles.orderHeader}>
          <View style={styles.orderType}>
            <Droplets size={20} color="#087EA4" />
            <View style={styles.orderInfo}>
              <Text style={styles.orderTitle}>{getProductName(order.items[0]?.type || '')}</Text>
              <Text style={styles.orderVolume}>
                {getProductSize(order.items[0]?.type || '')} x {order.items[0]?.quantity || 1}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
            {getStatusIcon(order.status)}
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderRow}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.orderDetailText}>
              {order.deliveryAddress?.address || 'Address not available'}
            </Text>
          </View>
          <View style={styles.orderRow}>
            <Calendar size={14} color="#6B7280" />
            <Text style={styles.orderDetailText}>
              {formatDate(order.orderDate)} at {formatTime(order.orderDate)}
            </Text>
          </View>
          {order.driver && (
            <View style={styles.orderRow}>
              <Truck size={14} color="#6B7280" />
              <Text style={styles.orderDetailText}>Driver: {order.driver.name}</Text>
            </View>
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderPrice}>Rs. {order.totalAmount.toLocaleString()}</Text>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };


  return (

    <View style={[globalstyles.container, { paddingBottom: insets.bottom , paddingTop: insets.top }]}>
      
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
        <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />
        
        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.connectionStatus}>
            <View style={styles.connectionIndicator} />
            <Text style={styles.connectionText}>Connecting to real-time updates...</Text>
          </View>
        )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Order History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#087EA4" />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : activeTab === 'active' ? (
          <>
            {activeOrders.map((order) => (
              <OrderCard key={getOrderId(order)} order={order} />
            ))}
            {activeOrders.length === 0 && (
              <View style={styles.emptyState}>
                <Droplets size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Active Orders</Text>
                <Text style={styles.emptyText}>You don't have any active orders right now</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {completedOrders.map((order) => (
              <OrderCard key={getOrderId(order)} order={order} />
            ))}
            {completedOrders.length === 0 && (
              <View style={styles.emptyState}>
                <CheckCircle size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Completed Orders</Text>
                <Text style={styles.emptyText}>Your completed orders will appear here</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#087EA4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#087EA4',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderInfo: {
    marginLeft: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  orderVolume: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  orderDetails: {
    marginBottom: 16,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDetailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderPrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  estimatedTime: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#087EA4',
  },
  completedTime: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
  orderNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginRight: 8,
  },
  connectionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#92400E',
  },
});