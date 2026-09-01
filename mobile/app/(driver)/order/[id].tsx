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
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverAPI, DriverOrder } from '../../../utils/driverAPI';
import { OrderStatus, ORDER_STATUS_LABEL } from '@/types/order';
import { ArrowLeft, Navigation, Phone, MessageCircle, Clock, MapPin, Package, User, CheckCircle, AlertTriangle, Truck, DollarSign, Calendar } from 'lucide-react-native';

// The order lifecycle a driver personally advances through, in order.
// 'driver_assigned' is set automatically on assignment (not driver-tapped),
// so it's the starting point here but never a "next status" target itself.
const DRIVER_STEP_ORDER: OrderStatus[] = [
  'driver_assigned',
  'going_to_filling_station',
  'water_filled',
  'on_the_way',
  'arrived',
  'delivered',
];

const STATUS_COLORS: Partial<Record<OrderStatus, string>> = {
  driver_assigned: '#FF6B35',
  going_to_filling_station: '#F59E0B',
  water_filled: '#F59E0B',
  on_the_way: '#087EA4',
  arrived: '#087EA4',
  delivered: '#28A745',
};

const { width, height } = Dimensions.get('window');

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpInput, setOtpInput] = useState('');

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

  const updateOrderStatus = async (newStatus: OrderStatus, otp?: string) => {
    if (!order) return;

    try {
      setUpdating(true);
      await driverAPI.updateOrderStatus(order.id, newStatus, undefined, otp);

      // Update local state
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      Alert.alert('Success', `Order status updated to ${ORDER_STATUS_LABEL[newStatus]}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  // 'delivered' requires the OTP the customer reads out -- collect it via a
  // small modal rather than calling updateOrderStatus directly.
  const handleAdvance = (newStatus: OrderStatus) => {
    if (newStatus === 'delivered') {
      setOtpInput('');
      setOtpModalVisible(true);
      return;
    }
    updateOrderStatus(newStatus);
  };

  const confirmDelivery = async () => {
    if (!otpInput.trim()) {
      Alert.alert('OTP required', "Enter the code the customer read out to confirm delivery.");
      return;
    }
    setOtpModalVisible(false);
    await updateOrderStatus('delivered', otpInput.trim());
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

  const getStatusColor = (status: OrderStatus) => STATUS_COLORS[status] || '#6B7280';

  const getStatusText = (status: OrderStatus) => ORDER_STATUS_LABEL[status] || 'Unknown Status';

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const index = DRIVER_STEP_ORDER.indexOf(currentStatus);
    if (index === -1 || index === DRIVER_STEP_ORDER.length - 1) return null;
    return DRIVER_STEP_ORDER[index + 1];
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#087EA4" />
        <Text style={styles.loadingText}>Loading order details...</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Order not found or failed to load.</Text>
        <TouchableOpacity style={{marginTop: 24, backgroundColor: '#087EA4', padding: 12, borderRadius: 8}} onPress={() => router.back()}>
          <Text style={{color: '#fff', fontWeight: 'bold'}}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const nextStatus = getNextStatus(order.status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor="#087EA4" />
      
      {/* Header */}
      <LinearGradient
        colors={['#087EA4', '#063B5C']}
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
              Order is currently {ORDER_STATUS_LABEL[order.status]?.toLowerCase() || order.status}
            </Text>
            
            {nextStatus && order.status !== 'delivered' && (
              <TouchableOpacity
                style={[styles.updateStatusButton, updating && styles.disabledButton]}
                onPress={() => handleAdvance(nextStatus)}
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
                <User size={24} color="#087EA4" />
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
                <Navigation size={16} color="#087EA4" />
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
                  <Package size={16} color="#087EA4" />
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

      <Modal visible={otpModalVisible} transparent animationType="fade" onRequestClose={() => setOtpModalVisible(false)}>
        <View style={styles.otpOverlay}>
          <View style={styles.otpCard}>
            <Text style={styles.otpTitle}>Confirm delivery</Text>
            <Text style={styles.otpSubtitle}>Ask the customer for their delivery code and enter it below.</Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="4-digit code"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            <View style={styles.otpActions}>
              <TouchableOpacity style={styles.otpCancelButton} onPress={() => setOtpModalVisible(false)}>
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.otpConfirmButton} onPress={confirmDelivery}>
                <Text style={styles.otpConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#087EA4',
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
    color: '#087EA4',
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
    color: '#087EA4',
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
    color: '#087EA4',
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
  otpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otpCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
  },
  otpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  otpSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  otpActions: {
    flexDirection: 'row',
    gap: 12,
  },
  otpCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  otpCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  otpConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#087EA4',
  },
  otpConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
