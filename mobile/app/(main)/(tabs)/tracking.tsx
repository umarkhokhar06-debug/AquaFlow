import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Linking,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Navigation, 
  Phone, 
  MessageCircle,
  Clock,
  MapPin,
  Truck,
  User,
  Star,
  Package,
  ChevronRight,
  RefreshCw,
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import { DrawerActions } from '@react-navigation/native';
import { router, useNavigation } from 'expo-router';
import { socketService, DriverLocationData } from '@/utils/socketService';
import { orderAPI } from '@/utils/orderAPI';
import { Order } from '@/types/order';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function TrackingScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [driverLocation, setDriverLocation] = useState({
    latitude: 24.8607,
    longitude: 67.0011,
  });
  const [customerLocation, setCustomerLocation] = useState({
    latitude: 24.8700,
    longitude: 67.0100,
  });
  const [isDriverOnline, setIsDriverOnline] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Update customer location when selected order changes
  useEffect(() => {
    if (selectedOrder && selectedOrder.deliveryAddress) {
      // Check if deliveryAddress has coordinates
      const addr = selectedOrder.deliveryAddress as any;
      if (addr.latitude && addr.longitude) {
        console.log('[TrackingScreen] Updating customer location from order:', {
          latitude: addr.latitude,
          longitude: addr.longitude,
        });
        setCustomerLocation({
          latitude: addr.latitude,
          longitude: addr.longitude,
        });
      } else {
        console.warn('[TrackingScreen] Selected order deliveryAddress missing coordinates:', selectedOrder.deliveryAddress);
      }
    }
  }, [selectedOrder]);

  useEffect(() => {
    fetchActiveOrders();
    
    // Pulse animation for driver marker
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Listen for driver location updates
    const handleDriverLocationUpdate = (data: DriverLocationData) => {
      console.log('[DriverLocationUpdate] Raw data:', data);
      if (!data || !data.location) {
        console.warn('[DriverLocationUpdate] Missing location data:', data);
        return;
      }
      const { latitude, longitude } = data.location;
      console.log(`[DriverLocationUpdate] Parsed lat/lng:`, latitude, longitude);
      setDriverLocation({ latitude, longitude });
      setIsDriverOnline(true);
      // Animate map to show both driver and customer
      if (mapRef.current && selectedOrder) {
        console.log('[DriverLocationUpdate] Fitting map to coordinates:', { latitude, longitude }, customerLocation);
        mapRef.current.fitToCoordinates(
          [
            { latitude, longitude },
            customerLocation,
          ],
          {
            edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
            animated: true,
          }
        );
      }
    };

    socketService.onDriverLocationUpdate(handleDriverLocationUpdate);

    return () => {
      socketService.removeDriverLocationListener(handleDriverLocationUpdate);
    };
  }, []);

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      console.log('[TrackingScreen] Fetching orders from backend...');
      const allOrders = await orderAPI.getMyOrders();
      console.log('[TrackingScreen] Received orders from backend:', JSON.stringify(allOrders, null, 2));
      
      if (!allOrders || allOrders.length === 0) {
        console.warn('[TrackingScreen] No orders returned from backend');
        setOrders([]);
        setSelectedOrder(null);
        return;
      }

      // Filter for active orders (preparing, out_for_delivery)
      const activeOrders = allOrders.filter((order: Order) => 
        ['preparing', 'out_for_delivery'].includes(order.status)
      );
      console.log(`[TrackingScreen] Filtered ${activeOrders.length} active orders (preparing, out_for_delivery):`, 
        activeOrders.map(o => ({ id: o._id, orderNumber: o.orderNumber, status: o.status })));
      
      setOrders(activeOrders);
      
      // Auto-select first order if available
      if (activeOrders.length > 0 && !selectedOrder) {
        setSelectedOrder(activeOrders[0]);
        console.log('[TrackingScreen] Auto-selected order:', activeOrders[0].orderNumber);
      }
    } catch (error) {
      console.error('[TrackingScreen] Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchActiveOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'preparing': return '#9333EA';
      case 'out_for_delivery': return '#F97316';
      case 'in_transit': return '#10B981';
      case 'delivered': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'confirmed': return 'Confirmed';
      case 'preparing': return 'Preparing';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleCallDriver = () => {
    // Try to get driver contact from order
    const driverContact = (selectedOrder?.driver as any)?.phone || (selectedOrder?.driver as any)?.contact;
    if (driverContact) {
      Linking.openURL(`tel:${driverContact}`);
    } else {
      Alert.alert('No Driver Assigned', 'This order does not have a driver assigned yet');
    }
  };

  const handleMessageDriver = () => {
    router.push('/(main)/help');
  };

  const handleCenterMap = () => {
    if (mapRef.current && selectedOrder) {
      mapRef.current.fitToCoordinates(
        [driverLocation, customerLocation],
        {
          edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
          animated: true,
        }
      );
    }
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const isSelected = selectedOrder?._id === order._id;
    
    return (
      <TouchableOpacity
        style={[styles.orderCard, isSelected && styles.orderCardSelected]}
        onPress={() => setSelectedOrder(order)}
        activeOpacity={0.7}
      >
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardLeft}>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                {getStatusText(order.status)}
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={isSelected ? '#007AFF' : '#9CA3AF'} />
        </View>

        <View style={styles.orderCardBody}>
          <View style={styles.orderDetail}>
            <Package size={16} color="#6B7280" />
            <Text style={styles.orderDetailText}>
              {order.items?.map(item => `${item.quantity}x ${item.type}`).join(', ')}
            </Text>
          </View>
          
          {order.driver && (
            <View style={styles.orderDetail}>
              <Truck size={16} color="#6B7280" />
              <Text style={styles.orderDetailText}>{order.driver.name}</Text>
            </View>
          )}
          
          <View style={styles.orderDetail}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.orderDetailText} numberOfLines={1}>
              {order.deliveryAddress?.address || 'No address'}
            </Text>
          </View>
        </View>

        <View style={styles.orderCardFooter}>
            <Text style={styles.orderAmount}>Rs. {order.totalAmount?.toLocaleString()}</Text>
            <Text style={styles.orderTime}>
              {(() => {
                try {
                  if (typeof order.createdAt === 'string') {
                    const date = new Date(order.createdAt);
                    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                  } else if (order.createdAt && (order.createdAt as any).$date) {
                    const date = new Date((order.createdAt as any).$date);
                    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
                  }
                } catch {
                  return 'N/A';
                }
                return 'N/A';
              })()}
            </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Active Orders</Text>
          <Text style={styles.emptyText}>
            You don't have any active deliveries to track at the moment
          </Text>
        </View>
      ) : (
        <>
          {/* Orders List */}
          <View style={styles.ordersSection}>
            <View style={styles.ordersSectionHeader}>
              <Text style={styles.ordersSectionTitle}>Active Orders ({orders.length})</Text>
              <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
                <RefreshCw 
                  size={20} 
                  color={refreshing ? '#9CA3AF' : '#007AFF'} 
                  style={refreshing ? { opacity: 0.5 } : {}}
                />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.ordersScroll}
              contentContainerStyle={styles.ordersScrollContent}
            >
              {orders.map((order, idx) => (
                <OrderCard key={order._id || `${order.orderNumber}-${idx}`} order={order} />
              ))}
            </ScrollView>
          </View>

          {selectedOrder && (
            <>
              {/* Map View */}
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: (driverLocation.latitude + customerLocation.latitude) / 2,
                    longitude: (driverLocation.longitude + customerLocation.longitude) / 2,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                  }}
                >
                  {/* Route Polyline */}
                  {isDriverOnline && (
                    <>
                      {(() => {
                        console.log('[Map] Rendering Polyline:', driverLocation, customerLocation);
                        return (
                          <Polyline
                            coordinates={[driverLocation, customerLocation]}
                            strokeColor="#007AFF"
                            strokeWidth={3}
                            lineDashPattern={[5, 5]}
                          />
                        );
                      })()}
                    </>
                  )}

                  {/* Driver Marker */}
                  {isDriverOnline && (
                    <>
                      {(() => {
                        console.log('[Map] Rendering Driver Marker:', driverLocation);
                        return (
                          <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
                            <Animated.View style={[styles.driverMarkerContainer, { transform: [{ scale: pulseAnim }] }]}> 
                              <View style={styles.driverMarkerPulse} />
                            </Animated.View>
                            <View style={styles.driverMarker}>
                              <Truck size={20} color="#FFFFFF" />
                            </View>
                          </Marker>
                        );
                      })()}
                    </>
                  )}

                  {/* Customer Marker */}
                  <Marker coordinate={customerLocation} anchor={{ x: 0.5, y: 1 }}>
                    <View style={styles.customerMarker}>
                      <MapPin size={24} color="#EF4444" />
                    </View>
                  </Marker>
                </MapView>

                {/* Center Map Button */}
                <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
                  <Navigation size={20} color="#007AFF" />
                </TouchableOpacity>

                {/* Driver Status Badge */}
                <View style={styles.statusBadgeContainer}>
                  <View style={[styles.driverStatusBadge, { backgroundColor: isDriverOnline ? '#10B981' : '#6B7280' }]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.driverStatusText}>
                      {isDriverOnline ? 'Driver Online' : 'Waiting for driver'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Driver Info Card */}
              {selectedOrder.driver && (
                <View style={styles.bottomCard}>
                  <View style={styles.driverInfo}>
                    <View style={styles.driverAvatar}>
                      <User size={24} color="#007AFF" />
                    </View>
                    <View style={styles.driverDetails}>
                      <Text style={styles.driverName}>{selectedOrder.driver.name}</Text>
                      <Text style={styles.driverPhone}>{selectedOrder.driver.email || 'No contact'}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver}>
                        <Phone size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionButton, styles.actionButtonSecondary]} 
                        onPress={handleMessageDriver}
                      >
                        <MessageCircle size={18} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  ordersSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ordersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  ordersSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  ordersScroll: {
    flexGrow: 0,
  },
  ordersScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  orderCard: {
    width: 280,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  orderCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    backgroundColor: '#FFFFFF',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  orderCardBody: {
    marginBottom: 12,
    gap: 8,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderDetailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  orderAmount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  orderTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  driverMarkerContainer: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    width: 30,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
  },
  driverStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverStatusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  bottomCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverPhone: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSecondary: {
    backgroundColor: '#EFF6FF',
  },
});
