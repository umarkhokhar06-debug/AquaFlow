import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Filter,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  ArrowRight,
} from 'lucide-react-native';

export default function DriverDeliveriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const deliveries = [
    {
      id: 'ORD-127',
      customer: 'Ahmed Hassan',
      phone: '+92 300 1234567',
      address: 'House 123, Upper Portion, Gulshan-e-Iqbal',
      type: 'Large Tanker',
      volume: '6000L',
      status: 'Pending',
      priority: 'high',
      estimatedTime: '30 mins',
      amount: 'Rs. 2,500',
      distance: '2.5 km',
      orderTime: '10:30 AM',
    },
    {
      id: 'ORD-126',
      customer: 'Fatima Ali',
      phone: '+92 301 2345678',
      address: 'House 456, Ground Floor, Defence Phase 2',
      type: 'Small Tanker',
      volume: '3500L',
      status: 'In Progress',
      priority: 'medium',
      estimatedTime: '45 mins',
      amount: 'Rs. 1,800',
      distance: '4.2 km',
      orderTime: '11:15 AM',
    },
    {
      id: 'ORD-125',
      customer: 'Muhammad Tariq',
      phone: '+92 302 3456789',
      address: 'House 789, Lower Portion, Clifton Block 5',
      type: 'Water Bottles',
      volume: '20L x 10',
      status: 'Completed',
      priority: 'low',
      estimatedTime: 'Completed',
      amount: 'Rs. 750',
      distance: '6.8 km',
      orderTime: '9:45 AM',
    },
    {
      id: 'ORD-124',
      customer: 'Sarah Khan',
      phone: '+92 303 4567890',
      address: 'House 321, Upper Portion, Nazimabad Block 3',
      type: 'Large Tanker',
      volume: '6000L',
      status: 'Cancelled',
      priority: 'medium',
      estimatedTime: 'Cancelled',
      amount: 'Rs. 2,500',
      distance: '3.1 km',
      orderTime: '8:20 AM',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#FF6B35';
      case 'In Progress':
        return '#007AFF';
      case 'Completed':
        return '#28A745';
      case 'Cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Clock size={16} color="#FF6B35" />;
      case 'In Progress':
        return <Package size={16} color="#007AFF" />;
      case 'Completed':
        return <CheckCircle size={16} color="#28A745" />;
      case 'Cancelled':
        return <AlertCircle size={16} color="#EF4444" />;
      default:
        return <Clock size={16} color="#6B7280" />;
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

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterStatus === 'all' ||
      delivery.status.toLowerCase().replace(' ', '') === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const DeliveryCard = ({ delivery }: { delivery: any }) => (
    <TouchableOpacity
      style={styles.deliveryCard}
      onPress={() => router.push(`/(driver)/order/${delivery.id}`)}
    >
      <View style={styles.deliveryHeader}>
        <View style={styles.deliveryInfo}>
          <Text style={styles.deliveryId}>#{delivery.id}</Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(delivery.priority) },
            ]}
          >
            <Text style={styles.priorityText}>
              {delivery.priority.toUpperCase()}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(delivery.status) + '20' },
          ]}
        >
          {getStatusIcon(delivery.status)}
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(delivery.status) },
            ]}
          >
            {delivery.status}
          </Text>
        </View>
      </View>

      <View style={styles.customerSection}>
        <View style={styles.customerInfo}>
          <User size={16} color="#6B7280" />
          <Text style={styles.customerName}>{delivery.customer}</Text>
        </View>
        <TouchableOpacity style={styles.phoneButton}>
          <Phone size={14} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.deliveryDetails}>
        <View style={styles.detailRow}>
          <MapPin size={14} color="#6B7280" />
          <Text style={styles.detailText}>{delivery.address}</Text>
        </View>
        <View style={styles.detailRow}>
          <Package size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {delivery.type} - {delivery.volume}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            {delivery.orderTime} • {delivery.distance} •{' '}
            {delivery.estimatedTime}
          </Text>
        </View>
      </View>

      <View style={styles.deliveryFooter}>
        <Text style={styles.deliveryAmount}>{delivery.amount}</Text>
        <ArrowRight size={16} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Deliveries</Text>
          <Text style={styles.headerSubtitle}>
            {filteredDeliveries.length} orders
          </Text>
        </View>
      </LinearGradient>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders or customers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.header}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabs}
        >
          {['all', 'pending', 'inprogress', 'completed', 'cancelled'].map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterTab,
                  filterStatus === status && styles.activeFilterTab,
                ]}
                onPress={() => setFilterStatus(status)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filterStatus === status && styles.activeFilterTabText,
                  ]}
                >
                  {status === 'all'
                    ? 'All'
                    : status === 'inprogress'
                    ? 'In Progress'
                    : status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Deliveries List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredDeliveries.map((delivery) => (
          <DeliveryCard key={delivery.id} delivery={delivery} />
        ))}
        {filteredDeliveries.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Deliveries Found</Text>
            <Text style={styles.emptyText}>
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'No deliveries match the selected filter'}
            </Text>
          </View>
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
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -10,
    marginBottom: 16,
    gap: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    marginLeft: 12,
  },
  filterButton: {
    width: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTabs: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    height: 34,
  },
  activeFilterTab: {
    backgroundColor: '#007AFF',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeFilterTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  deliveryCard: {
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
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryId: {
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
  customerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
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
  deliveryDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  deliveryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  deliveryAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#28A745',
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
