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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  Clock, 
  CircleCheck as CheckCircle, 
  Truck, 
  Droplets, 
  Calendar, 
  MapPin, 
  User,
  Phone,
  CreditCard,
  FileText,
  X
} from 'lucide-react-native';
import { globalstyles } from '@/app/commans/style';
import { orderAPI } from '@/utils/orderAPI';
import { Order, parseDate, getOrderId } from '@/types/order';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const orderData = await orderAPI.getOrderById(id as string);
      setOrder(orderData);
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await orderAPI.cancelOrder(getOrderId(order));
              Alert.alert('Success', 'Order cancelled successfully');
              router.back();
            } catch (error) {
              console.error('Error cancelling order:', error);
              Alert.alert('Error', 'Failed to cancel order. Please try again.');
            } finally {
              setCancelling(false);
            }
          }
        }
      ]
    );
  };

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
        return <Clock size={20} color="#F59E0B" />;
      case 'confirmed':
        return <CheckCircle size={20} color="#087EA4" />;
      case 'preparing':
        return <Clock size={20} color="#8B5CF6" />;
      case 'out_for_delivery':
        return <Truck size={20} color="#FF6B35" />;
      case 'delivered':
        return <CheckCircle size={20} color="#28A745" />;
      case 'cancelled':
        return <X size={20} color="#EF4444" />;
      default:
        return <Clock size={20} color="#6B7280" />;
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  const canCancelOrder = (status: string) => {
    return ['pending', 'confirmed', 'preparing'].includes(status);
  };

  if (loading) {
    return (
      <View style={[globalstyles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#087EA4" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[globalstyles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[globalstyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              {getStatusIcon(order.status)}
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{getStatusText(order.status)}</Text>
              <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
            </View>
          </View>
          <Text style={styles.statusDescription}>
            {order.status === 'pending' && 'Your order is being processed'}
            {order.status === 'confirmed' && 'Your order has been confirmed and is being prepared'}
            {order.status === 'preparing' && 'Your order is being prepared for delivery'}
            {order.status === 'out_for_delivery' && 'Your order is on its way to you'}
            {order.status === 'delivered' && 'Your order has been delivered successfully'}
            {order.status === 'cancelled' && 'Your order has been cancelled'}
          </Text>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Droplets size={20} color="#087EA4" />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{getProductName(item.type)}</Text>
                  <Text style={styles.itemSize}>{getProductSize(item.type)}</Text>
                </View>
                <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>Rs. {item.totalPrice.toLocaleString()}</Text>
                <Text style={styles.itemUnitPrice}>Rs. {item.unitPrice.toLocaleString()} each</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <View style={styles.addressRow}>
              <MapPin size={16} color="#6B7280" />
              <Text style={styles.addressText}>{order.deliveryAddress?.address || 'Address not available'}</Text>
            </View>
            <View style={styles.addressRow}>
              <User size={16} color="#6B7280" />
              <Text style={styles.addressText}>{order.deliveryAddress?.fullName || 'Name not available'}</Text>
            </View>
            <View style={styles.addressRow}>
              <Phone size={16} color="#6B7280" />
              <Text style={styles.addressText}>{order.deliveryAddress?.phoneNumber || 'Phone not available'}</Text>
            </View>
            {order.deliveryAddress?.specialInstructions && (
              <View style={styles.addressRow}>
                <FileText size={16} color="#6B7280" />
                <Text style={styles.addressText}>{order.deliveryAddress.specialInstructions}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Driver Info */}
        {order.driver && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            <View style={styles.driverCard}>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{order.driver.name}</Text>
                <Text style={styles.driverEmail}>{order.driver.email}</Text>
              </View>
              <Truck size={20} color="#087EA4" />
            </View>
          </View>
        )}

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>Rs. {order.subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax</Text>
              <Text style={styles.summaryValue}>Rs. {order.tax.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>Rs. {order.totalAmount.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Calendar size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Order Date</Text>
              <Text style={styles.detailValue}>{formatDate(order.orderDate)}</Text>
            </View>
            {order.deliveryDate && (
              <View style={styles.detailRow}>
                <Truck size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Delivery Date</Text>
                <Text style={styles.detailValue}>{formatDate(order.deliveryDate)}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <CreditCard size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{order.paymentMethod.toUpperCase()}</Text>
            </View>
            <View style={styles.detailRow}>
              <CheckCircle size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Payment Status</Text>
              <Text style={[styles.detailValue, { color: order.paymentStatus === 'paid' ? '#28A745' : '#F59E0B' }]}>
                {order.paymentStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancel Order Button */}
        {canCancelOrder(order.status) && (
          <View style={styles.cancelSection}>
            <TouchableOpacity 
              style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]} 
              onPress={handleCancelOrder}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <X size={20} color="#FFFFFF" />
              )}
              <Text style={styles.cancelButtonText}>
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    fontFamily: 'Sora-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
  },
  itemSize: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  itemQuantity: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 16,
    fontFamily: 'Sora-Bold',
    color: '#1F2937',
  },
  itemUnitPrice: {
    fontSize: 12,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverEmail: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontFamily: 'Sora-Bold',
    color: '#1F2937',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontFamily: 'Sora-Bold',
    color: '#1F2937',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    marginLeft: 12,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'right',
  },
  cancelSection: {
    marginTop: 24,
    marginBottom: 30,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
