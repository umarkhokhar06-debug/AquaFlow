import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { driverAPI, DashboardStats, DriverOrder } from '../../../utils/driverAPI';
import { useSocket } from '../../../hooks/useSocket';
import { 
  Menu, 
  Bell, 
  Package, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  MapPin, 
  Truck,
  DollarSign,
  ArrowRight,
  User,
  Phone
} from 'lucide-react-native';

export default function DriverDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [driverStats, setDriverStats] = useState<DashboardStats>({
    pendingOrders: 0,
    todayEarnings: 0,
    todayOrders: 0,
    monthEarnings: 0,
    monthOrders: 0,
    rating: 0,
    totalRatings: 0,
  });
  const [todayOrders, setTodayOrders] = useState<DriverOrder[]>([]);

  const { connect, onNewOrder, onOrderStatusUpdate, onOrderUpdate } = useSocket();

  // Refetch dashboard data
  const refetchDashboard = useCallback(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    connect();
    loadDashboardData();

    // Listen for new orders, status updates, and order updates
    onNewOrder(refetchDashboard);
    onOrderStatusUpdate(refetchDashboard);
    onOrderUpdate(refetchDashboard);

    // No cleanup needed since listeners are managed by useSocket
    // If you want to remove listeners, you can use remove*Listener from useSocket
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, ordersRes] = await Promise.all([
        driverAPI.getDashboardStats(),
        driverAPI.getOrders({ limit: 5 }),
      ]);
      setDriverStats(stats);
      // Orders are already mapped in driverAPI.getOrders
      setTodayOrders(ordersRes.orders);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(driver)/notifications');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#FF6B35';
      case 'preparing':
        return '#F59E0B';
      case 'out_for_delivery':
        return '#007AFF';
      case 'delivered':
        return '#28A745';
      default:
        return '#6B7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const OrderCard = ({ order }: { order: DriverOrder }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push(`/(driver)/order/${order.id}`)}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>{order.orderNumber ? order.orderNumber : 'Order'}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: '#007AFF' }]}> 
            <Text style={styles.priorityText}>ORDER</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}> 
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}> 
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.customerInfo}>
        <User size={16} color="#6B7280" />
        <Text style={styles.customerName}>{order.customerName}</Text>
        <TouchableOpacity style={styles.phoneButton}>
          <Phone size={14} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderRow}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.orderDetailText}>{order.customerAddress}</Text>
        </View>
        <View style={styles.orderRow}>
          <Package size={14} color="#6B7280" />
          <Text style={styles.orderDetailText}>
            {order.items.length} item(s) - ${order.totalAmount}
          </Text>
        </View>
        <View style={styles.orderRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.orderDetailText}>
            {new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderAmount}>${order.totalAmount}</Text>
        <ArrowRight size={16} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Menu size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Dashboard</Text>
        <TouchableOpacity style={styles.notificationButton} onPress={openNotifications}>
          <Bell size={24} color="#1F2937" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>2</Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Good morning, Driver!</Text>
            <Text style={styles.welcomeSubtitle}>You have {driverStats.pendingOrders} pending deliveries today</Text>
          </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Pending Orders"
            value={driverStats.pendingOrders}
            icon={<Package size={20} color="#FF6B35" />}
            color="#FF6B35"
          />
          <StatCard
            title="Month's Orders"
            value={driverStats.monthOrders}
            icon={<CheckCircle size={20} color="#28A745" />}
            color="#28A745"
          />
          <StatCard
            title="Today's Earnings"
            value={`$${driverStats.todayEarnings?.toFixed(2)}`}
            icon={<DollarSign size={20} color="#007AFF" />}
            color="#007AFF"
          />
          <StatCard
            title="Rating"
            value={driverStats.rating?.toFixed(1)}
            subtitle={`${driverStats.totalRatings} ratings`}
            icon={<TrendingUp size={20} color="#9333EA" />}
            color="#9333EA"
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(driver)/(tabs)/deliveries')}
          >
            <Package size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View All Deliveries</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => router.push('/(driver)/(tabs)/map')}
          >
            <MapPin size={20} color="#007AFF" />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Open Map</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Orders */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(driver)/(tabs)/deliveries')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {todayOrders.map((order, idx) => (
            <OrderCard key={order.id || idx} order={order} />
          ))}
        </View>

        {/* Vehicle Status */}
        <View style={styles.vehicleSection}>
          <View style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}>
              <Truck size={24} color="#007AFF" />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleTitle}>Vehicle Status</Text>
              <Text style={styles.vehicleSubtitle}>TK-001 • Suzuki Carry</Text>
              <Text style={styles.vehicleStatus}>✅ Online • Fuel: 85%</Text>
            </View>
            <TouchableOpacity style={styles.vehicleButton}>
              <Text style={styles.vehicleButtonText}>Details</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
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
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  welcomeSection: {
    paddingVertical: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  statSubtitle: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  ordersSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginRight: 8,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginLeft: 8,
  },
  phoneButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderDetails: {
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderDetailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#28A745',
  },
  vehicleSection: {
    marginBottom: 24,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  vehicleStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  vehicleButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  vehicleButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});