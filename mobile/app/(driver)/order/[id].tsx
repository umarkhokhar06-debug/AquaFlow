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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Navigation, Phone, MessageCircle, Clock, MapPin, Package, User, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Truck, DollarSign, Calendar } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function OrderDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [orderStatus, setOrderStatus] = useState('pending');

  // Mock order data - in real app, fetch based on ID
  const [orderData] = useState({
    id: id || 'ORD-127',
    customer: {
      name: 'Ahmed Hassan',
      phone: '+92 300 1234567',
      address: 'House 123, Upper Portion, Block A, Gulshan-e-Iqbal, Karachi',
      landmark: 'Near City School',
    },
    order: {
      type: 'Large Tanker',
      volume: '6000L',
      amount: 'Rs. 2,500',
      orderTime: '10:30 AM',
      estimatedDelivery: '11:30 AM',
      priority: 'high',
      specialInstructions: 'Please call before arrival. Ring the bell twice.',
    },
    delivery: {
      distance: '2.5 km',
      estimatedTime: '25 mins',
      route: 'Via Shahrah-e-Faisal',
    },
    payment: {
      method: 'Cash on Delivery',
      status: 'Pending',
    },
  });

  const handleCallCustomer = () => {
    Alert.alert(
      'Call Customer',
      `Call ${orderData.customer.name} at ${orderData.customer.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Calling customer...') }
      ]
    );
  };

  const handleMessageCustomer = () => {
    Alert.alert(
      'Message Customer',
      `Send a message to ${orderData.customer.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => console.log('Opening messages...') }
      ]
    );
  };

  const handleStartDelivery = () => {
    setOrderStatus('in-progress');
    Alert.alert('Delivery Started', 'You have started the delivery. Customer will be notified.');
  };

  const handleCompleteDelivery = () => {
    Alert.alert(
      'Complete Delivery',
      'Mark this order as delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: () => {
            setOrderStatus('completed');
            Alert.alert('Delivery Completed', 'Order has been marked as delivered successfully!');
          }
        }
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.alert('Report Issue', 'Issue reporting functionality would be implemented here.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF6B35';
      case 'in-progress':
        return '#007AFF';
      case 'completed':
        return '#28A745';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Pickup';
      case 'in-progress':
        return 'En Route';
      case 'completed':
        return 'Delivered';
      default:
        return 'Unknown';
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>Order Details</Text>
            <Text style={styles.subtitle}>#{orderData.id}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionButton} onPress={handleCallCustomer}>
              <Phone size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerActionButton} onPress={handleMessageCustomer}>
              <MessageCircle size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Navigation size={48} color="#007AFF" />
          <Text style={styles.mapText}>Route to Customer</Text>
          <Text style={styles.mapSubtext}>{orderData.delivery.distance} • {orderData.delivery.estimatedTime}</Text>
        </View>
        
        {/* Driver Location Marker */}
        <View style={styles.driverMarker}>
          <Truck size={20} color="#FFFFFF" />
        </View>
        
        {/* Customer Location Marker */}
        <View style={styles.customerMarker}>
          <MapPin size={16} color="#FFFFFF" />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(orderStatus) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(orderStatus) }]}>
                {getStatusText(orderStatus)}
              </Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(orderData.order.priority) }]}>
              <Text style={styles.priorityText}>{orderData.order.priority.toUpperCase()} PRIORITY</Text>
            </View>
          </View>
          <Text style={styles.statusDescription}>
            {orderStatus === 'pending' && 'Ready for pickup and delivery'}
            {orderStatus === 'in-progress' && 'Currently en route to customer'}
            {orderStatus === 'completed' && 'Successfully delivered to customer'}
          </Text>
        </View>

        {/* Customer Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Customer Information</Text>
          
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <User size={24} color="#007AFF" />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{orderData.customer.name}</Text>
              <Text style={styles.customerPhone}>{orderData.customer.phone}</Text>
            </View>
            <View style={styles.customerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCallCustomer}>
                <Phone size={16} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleMessageCustomer}>
                <MessageCircle size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.addressSection}>
            <View style={styles.infoRow}>
              <MapPin size={16} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Delivery Address</Text>
                <Text style={styles.infoValue}>{orderData.customer.address}</Text>
                <Text style={styles.landmark}>📍 {orderData.customer.landmark}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Order Details</Text>
          
          <View style={styles.infoRow}>
            <Package size={16} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Water Type & Volume</Text>
              <Text style={styles.infoValue}>{orderData.order.type} - {orderData.order.volume}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <DollarSign size={16} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Order Amount</Text>
              <Text style={[styles.infoValue, styles.amountText]}>{orderData.order.amount}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={16} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Order Time</Text>
              <Text style={styles.infoValue}>{orderData.order.orderTime}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Clock size={16} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Estimated Delivery</Text>
              <Text style={styles.infoValue}>{orderData.order.estimatedDelivery}</Text>
            </View>
          </View>

          {orderData.order.specialInstructions && (
            <View style={styles.instructionsSection}>
              <Text style={styles.instructionsTitle}>Special Instructions</Text>
              <Text style={styles.instructionsText}>{orderData.order.specialInstructions}</Text>
            </View>
          )}
        </View>

        {/* Payment Information */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Payment Information</Text>
          
          <View style={styles.paymentInfo}>
            <View style={styles.paymentMethod}>
              <Text style={styles.paymentLabel}>Payment Method</Text>
              <Text style={styles.paymentValue}>{orderData.payment.method}</Text>
            </View>
            <View style={styles.paymentStatus}>
              <Text style={styles.paymentLabel}>Status</Text>
              <Text style={[styles.paymentValue, { color: '#FF6B35' }]}>{orderData.payment.status}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          {orderStatus === 'pending' && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleStartDelivery}>
              <Truck size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Start Delivery</Text>
            </TouchableOpacity>
          )}
          
          {orderStatus === 'in-progress' && (
            <TouchableOpacity style={styles.primaryButton} onPress={handleCompleteDelivery}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Mark as Delivered</Text>
            </TouchableOpacity>
          )}

          {orderStatus === 'completed' && (
            <View style={styles.completedSection}>
              <CheckCircle size={24} color="#28A745" />
              <Text style={styles.completedText}>Order Completed Successfully!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.secondaryButton} onPress={handleReportIssue}>
            <AlertTriangle size={20} color="#EF4444" />
            <Text style={styles.secondaryButtonText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapContainer: {
    height: height * 0.25,
    backgroundColor: '#E5E7EB',
    margin: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPlaceholder: {
    alignItems: 'center',
  },
  mapText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  mapSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  driverMarker: {
    position: 'absolute',
    top: 40,
    left: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  customerMarker: {
    position: 'absolute',
    bottom: 40,
    right: 60,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  statusDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  customerInfo: {
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
    marginRight: 16,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
  },
  amountText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#28A745',
  },
  landmark: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#007AFF',
    marginTop: 4,
  },
  instructionsSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flex: 1,
  },
  paymentStatus: {
    flex: 1,
    alignItems: 'flex-end',
  },
  paymentLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  actionSection: {
    marginBottom: 30,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 8,
  },
  completedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  completedText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#28A745',
    marginLeft: 8,
  },
});