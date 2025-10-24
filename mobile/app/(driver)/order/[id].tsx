import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverAPI, DriverOrder } from '../../../utils/driverAPI';
import { ArrowLeft, Navigation, Phone, MessageCircle, Clock, MapPin, Package, User, CheckCircle, AlertTriangle, Truck, DollarSign, Calendar } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<DriverOrder | null>(null);

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const orderData = await driverAPI.getOrderById(id!);
      console.log('Order data received:', JSON.stringify(orderData, null, 2));
      setOrder(orderData);
    } catch (error) {
      console.error('Error loading order details:', error);
      Alert.alert('Error', 'Failed to load order details. Please try again.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus: string) => {
    if (!order) return;

    try {
      setUpdating(true);
      await driverAPI.updateOrderStatus(order.id, newStatus);
      
      // Update local state
      setOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
      Alert.alert('Success', `Order status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleCall = () => {
    if (order?.customerPhone) {
      Linking.openURL(`tel:${order.customerPhone}`);
    }
  };

  const handleNavigate = () => {
    if (order?.deliveryLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLocation.latitude},${order.deliveryLocation.longitude}`;
      Linking.openURL(url);
    }
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Order Confirmed';
      case 'preparing':
        return 'Preparing Order';
      case 'out_for_delivery':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Unknown Status';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'confirmed':
        return 'preparing';
      case 'preparing':
        return 'out_for_delivery';
      case 'out_for_delivery':
        return 'delivered';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Order not found or failed to load.</Text>
        <TouchableOpacity style={{marginTop: 24, backgroundColor: '#007AFF', padding: 12, borderRadius: 8}} onPress={() => router.back()}>
          <Text style={{color: '#fff', fontWeight: 'bold'}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextStatus = getNextStatus(order.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{order.orderNumber ? order.orderNumber : 'Order Details'}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCall} style={styles.headerActionButton}>
              <Phone size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNavigate} style={styles.headerActionButton}>
              <Navigation size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Section */}
        <View style={styles.statusSection}>
          <View style={[styles.statusCard, { borderLeftColor: getStatusColor(order.status) }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(order.status) }]}>
                <CheckCircle size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>
            </View>
            <Text style={styles.statusDescription}>
              Order is currently {order.status.replace('_', ' ')}
            </Text>
            
            {nextStatus && order.status !== 'delivered' && (
              <TouchableOpacity
                style={[styles.updateStatusButton, updating && styles.disabledButton]}
                onPress={() => updateOrderStatus(nextStatus)}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.updateStatusText}>
                    Mark as {getStatusText(nextStatus)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerHeader}>
              <View style={styles.customerAvatar}>
                <User size={24} color="#007AFF" />
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{order.customerName}</Text>
                <Text style={styles.customerPhone}>{order.customerPhone}</Text>
              </View>
              <View style={styles.customerActions}>
                <TouchableOpacity onPress={handleCall} style={styles.customerActionButton}>
                  <Phone size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.addressSection}>
              <View style={styles.addressHeader}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.addressTitle}>Delivery Address</Text>
              </View>
              <Text style={styles.addressText}>{order.customerAddress}</Text>
              <TouchableOpacity onPress={handleNavigate} style={styles.navigateButton}>
                <Navigation size={16} color="#007AFF" />
                <Text style={styles.navigateText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsCard}>
            {order.items.map((item, index) => (
              <View key={index} style={[styles.itemRow, index !== order.items.length - 1 && styles.itemBorder]}>
                <View style={styles.itemIcon}>
                  <Package size={16} color="#007AFF" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemQuantity}>Quantity: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>${item.price}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${order.totalAmount}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>${order.deliveryFee}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>${order.totalAmount + order.deliveryFee}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>
          <View style={styles.deliveryCard}>
            <View style={styles.deliveryRow}>
              <Clock size={16} color="#6B7280" />
              <Text style={styles.deliveryLabel}>Estimated Delivery</Text>
              <Text style={styles.deliveryValue}>
                {new Date(order.estimatedDeliveryTime).toLocaleString()}
              </Text>
            </View>
            <View style={styles.deliveryRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.deliveryLabel}>Order Date</Text>
              <Text style={styles.deliveryValue}>
                {new Date(order.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={styles.notesCard}>
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    color: '#EF4444',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statusSection: {
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  updateStatusButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  updateStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  customerActions: {
    flexDirection: 'row',
  },
  customerActionButton: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  addressSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  navigateText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  itemsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#6B7280',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  deliveryLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  deliveryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});
