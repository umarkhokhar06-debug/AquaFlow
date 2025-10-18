import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Clock, CircleCheck as CheckCircle, Truck, Droplets, Calendar, MapPin, Filter, Menu, Bell } from 'lucide-react-native';
import { router, useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { globalstyles } from '@/app/commans/style';
import HeaderComponent from '@/app/components/Header';

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('active');
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const activeOrders = [
    {
      id: '1',
      type: 'Large Tanker',
      volume: '6000L',
      status: 'In Progress',
      estimatedTime: '2 hrs',
      driver: 'Ahmad Khan',
      price: '₨ 2,500',
      date: '2024-12-25',
      location: 'House 123, Upper Portion',
    },
    {
      id: '2',
      type: 'Small Tanker',
      volume: '3500L',
      status: 'Dispatched',
      estimatedTime: '45 mins',
      driver: 'Ali Hassan',
      price: '₨ 1,800',
      date: '2024-12-25',
      location: 'House 123, Upper Portion',
    },
  ];

  const completedOrders = [
    {
      id: '3',
      type: 'Large Tanker',
      volume: '6000L',
      status: 'Completed',
      completedTime: '2 hours ago',
      driver: 'Muhammad Tariq',
      price: '₨ 2,500',
      date: '2024-12-23',
      location: 'House 123, Upper Portion',
    },
    {
      id: '4',
      type: 'Water Bottles',
      volume: '20L x 5',
      status: 'Completed',
      completedTime: '1 day ago',
      driver: 'Saqib Ahmed',
      price: '₨ 750',
      date: '2024-12-22',
      location: 'House 123, Upper Portion',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return '#007AFF';
      case 'Dispatched':
        return '#FF6B35';
      case 'Completed':
        return '#28A745';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'In Progress':
        return <Clock size={16} color="#007AFF" />;
      case 'Dispatched':
        return <Truck size={16} color="#FF6B35" />;
      case 'Completed':
        return <CheckCircle size={16} color="#28A745" />;
      default:
        return <Clock size={16} color="#6B7280" />;
    }
  };

  const OrderCard = ({ order }: { order: any }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderType}>
          <Droplets size={20} color="#007AFF" />
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>{order.type}</Text>
            <Text style={styles.orderVolume}>{order.volume}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          {getStatusIcon(order.status)}
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {order.status}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.orderRow}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.orderDetailText}>{order.location}</Text>
        </View>
        <View style={styles.orderRow}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.orderDetailText}>{order.date}</Text>
        </View>
        <View style={styles.orderRow}>
          <Truck size={14} color="#6B7280" />
          <Text style={styles.orderDetailText}>Driver: {order.driver}</Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderPrice}>{order.price}</Text>
        {order.status === 'Completed' ? (
          <Text style={styles.completedTime}>{order.completedTime}</Text>
        ) : (
          <Text style={styles.estimatedTime}>ETA: {order.estimatedTime}</Text>
        )}
      </View>
    </View>
  );

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
      >
        {activeTab === 'active' ? (
          <>
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
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
              <OrderCard key={order.id} order={order} />
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
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
});