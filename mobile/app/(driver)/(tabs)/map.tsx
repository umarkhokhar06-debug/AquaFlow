import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  Animated,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { 
  Navigation, 
  MapPin, 
  Truck,
  Clock,
  Package,
  Phone,
  MessageCircle,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Fuel,
  Gauge,
  ChevronRight,
} from 'lucide-react-native';
import { socketService } from '@/utils/socketService';
import { driverAPI, DriverOrder } from '@/utils/driverAPI';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState({
    latitude: 24.8607,
    longitude: 67.0011,
  });
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    console.log('[DriverMapScreen] Component mounted');
    
    // Socket connection listener
    const handleConnectionChange = (connected: boolean) => {
      console.log('[DriverMapScreen] Socket connection changed:', connected);
      setSocketConnected(connected);
    };
    
    // Initialize socket connection
    const initializeSocket = async () => {
      try {
        if (!socketService.isSocketConnected()) {
          console.log('[DriverMapScreen] Initializing socket connection...');
          await socketService.connect();
          console.log('[DriverMapScreen] Socket connected successfully');
        } else {
          console.log('[DriverMapScreen] Socket already connected');
        }
        setSocketConnected(socketService.isSocketConnected());
      } catch (error) {
        console.error('[DriverMapScreen] Socket connection error:', error);
        setSocketConnected(false);
      }
    };
    
    // Register connection listener
    socketService.onConnectionChange(handleConnectionChange);
    
    initializeSocket();
    
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

    // Fetch orders and start location tracking
    fetchActiveOrders();
    startLocationTracking();

    return () => {
      socketService.removeConnectionChangeListener(handleConnectionChange);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  // Update customer location when selected order changes
  useEffect(() => {
    console.log('[DriverMapScreen] Selected order:', selectedOrder);
    console.log('[DriverMapScreen] deliveryLocation:', selectedOrder?.deliveryLocation);
    console.log('[DriverMapScreen] latitude:', selectedOrder?.deliveryLocation?.latitude);
    console.log('[DriverMapScreen] longitude:', selectedOrder?.deliveryLocation?.longitude);
    
    if (selectedOrder && selectedOrder.deliveryLocation && 
        selectedOrder.deliveryLocation.latitude && 
        selectedOrder.deliveryLocation.longitude &&
        selectedOrder.deliveryLocation.latitude !== 0 &&
        selectedOrder.deliveryLocation.longitude !== 0) {
      console.log('[DriverMapScreen] Selected order changed:', selectedOrder.orderNumber);
      const customerLoc = {
        latitude: selectedOrder.deliveryLocation.latitude,
        longitude: selectedOrder.deliveryLocation.longitude,
      };
      
      // Calculate distance and time
      const distance = calculateDistance(driverLocation, customerLoc);
      setDistanceRemaining(distance);
      
      const avgSpeed = 40; // km/h
      const timeInMinutes = Math.round((distance / avgSpeed) * 60);
      setEstimatedTime(timeInMinutes);
      
      setIsNavigating(true);
      
      // Center map on both locations
      if (mapRef.current) {
        mapRef.current.fitToCoordinates([driverLocation, customerLoc], {
          edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
          animated: true,
        });
      }
    } else {
      console.log('[DriverMapScreen] Selected order has no valid delivery location');
      setIsNavigating(false);
    }
  }, [selectedOrder]);

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      console.log('[DriverMapScreen] Fetching orders from backend...');
      const response = await driverAPI.getOrders({ 
        status: 'preparing,out_for_delivery'
      });
      
      console.log('[DriverMapScreen] Received orders response:', JSON.stringify(response, null, 2));
      
      if (!response || !response.orders) {
        console.warn('[DriverMapScreen] No orders returned from backend');
        setOrders([]);
        setSelectedOrder(null);
        return;
      }

      const activeOrders = response.orders.filter((order: DriverOrder) => 
        ['preparing', 'out_for_delivery'].includes(order.status)
      );
      
      console.log(`[DriverMapScreen] Filtered ${activeOrders.length} active orders (preparing, out_for_delivery):`, 
        activeOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber, status: o.status })));
      
      setOrders(activeOrders);
      
      // Auto-select first order if available
      if (activeOrders.length > 0 && !selectedOrder) {
        console.log('[DriverMapScreen] Auto-selecting first order. Full order object:', JSON.stringify(activeOrders[0], null, 2));
        setSelectedOrder(activeOrders[0]);
        console.log('[DriverMapScreen] Auto-selected order:', activeOrders[0].orderNumber);
      }
    } catch (error) {
      console.error('[DriverMapScreen] Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('[DriverMapScreen] Requesting location permissions...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[DriverMapScreen] Location permission denied');
        Alert.alert('Permission Denied', 'Location permission is required for navigation');
        return;
      }

      console.log('[DriverMapScreen] Starting location tracking...');
      // Start tracking location
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000, // Update every 5 seconds
          distanceInterval: 10, // or every 10 meters
        },
        (location) => {
          const newLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          
          console.log('[DriverMapScreen] Location updated:', newLocation, `Speed: ${location.coords.speed} m/s`);
          
          setDriverLocation(newLocation);
          setCurrentSpeed(location.coords.speed ? Math.round(location.coords.speed * 3.6) : 0); // Convert m/s to km/h
          
          // Emit location update to backend via socket (only if connected)
          if (socketService.isSocketConnected()) {
            console.log('[DriverMapScreen] Emitting location to backend via socket');
            socketService.emitDriverLocation(newLocation);
          } else {
            console.warn('[DriverMapScreen] Socket not connected, cannot emit location');
          }

          // Update map view
          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: newLocation,
              heading: location.coords.heading || 0,
            });
          }

          // Calculate distance to customer if order is selected
          if (selectedOrder && selectedOrder.deliveryLocation &&
              selectedOrder.deliveryLocation.latitude &&
              selectedOrder.deliveryLocation.longitude &&
              selectedOrder.deliveryLocation.latitude !== 0 &&
              selectedOrder.deliveryLocation.longitude !== 0) {
            const customerLoc = {
              latitude: selectedOrder.deliveryLocation.latitude,
              longitude: selectedOrder.deliveryLocation.longitude,
            };
            const distance = calculateDistance(newLocation, customerLoc);
            setDistanceRemaining(distance);
            
            // Estimate time (simple calculation: distance / average speed)
            const avgSpeed = 40; // km/h
            const timeInMinutes = Math.round((distance / avgSpeed) * 60);
            setEstimatedTime(timeInMinutes);
          }
        }
      );
      console.log('[DriverMapScreen] Location tracking started successfully');
    } catch (error) {
      console.error('[DriverMapScreen] Error starting location tracking:', error);
      Alert.alert('Error', 'Failed to start location tracking');
    }
  };

  const calculateDistance = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.latitude - from.latitude) * (Math.PI / 180);
    const dLon = (to.longitude - from.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(from.latitude * (Math.PI / 180)) *
        Math.cos(to.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleCallCustomer = () => {
    if (!selectedOrder) {
      Alert.alert('No Order Selected', 'Please select an order first');
      return;
    }
    const customerPhone = selectedOrder.customerPhone;
    if (customerPhone) {
      Linking.openURL(`tel:${customerPhone}`);
    } else {
      Alert.alert('No Phone Number', 'Customer phone number not available');
    }
  };

  const handleMessageCustomer = () => {
    Alert.alert('Message Customer', 'Send a message to the customer?');
  };

  const handleMarkDelivered = () => {
    if (!selectedOrder) {
      Alert.alert('No Order Selected', 'Please select an order first');
      return;
    }
    
    Alert.alert(
      'Mark as Delivered',
      'Are you sure you want to mark this order as delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await driverAPI.updateOrderStatus(selectedOrder.id, 'delivered');
              Alert.alert('Success', 'Order marked as delivered!');
              setIsNavigating(false);
              // Refresh orders
              fetchActiveOrders();
            } catch (error) {
              console.error('[DriverMapScreen] Error marking order as delivered:', error);
              Alert.alert('Error', 'Failed to update order status');
            }
          },
        },
      ]
    );
  };

  const handleReportIssue = () => {
    Alert.alert('Report Issue', 'Describe the issue with this delivery');
  };

  const handleCenterMap = () => {
    if (!selectedOrder || !selectedOrder.deliveryLocation) {
      return;
    }
    
    const customerLoc = {
      latitude: selectedOrder.deliveryLocation.latitude,
      longitude: selectedOrder.deliveryLocation.longitude,
    };
    
    if (mapRef.current) {
      mapRef.current.fitToCoordinates([driverLocation, customerLoc], {
        edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
        animated: true,
      });
    }
  };

  const openGoogleMaps = () => {
    if (!selectedOrder || !selectedOrder.deliveryLocation) {
      Alert.alert('No Destination', 'Please select an order first');
      return;
    }
    
    const customerLoc = {
      latitude: selectedOrder.deliveryLocation.latitude,
      longitude: selectedOrder.deliveryLocation.longitude,
    };
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${driverLocation.latitude},${driverLocation.longitude}&destination=${customerLoc.latitude},${customerLoc.longitude}&travelmode=driving`;
    Linking.openURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'preparing': return '#9333EA';
      case 'out_for_delivery': return '#F97316';
      case 'delivered': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'preparing': return 'Preparing';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };

  const OrderCard = ({ order }: { order: DriverOrder }) => {
    const isSelected = selectedOrder?.id === order.id;
    
    return (
      <TouchableOpacity
        style={[styles.orderCard, isSelected && styles.orderCardSelected]}
        onPress={() => {
          console.log('[DriverMapScreen] Order selected:', order.orderNumber);
          setSelectedOrder(order);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderCardHeader}>
          <View style={styles.orderCardLeft}>
            <Text style={styles.orderNumber}>{order.orderNumber || `#${order.id.slice(-6)}`}</Text>
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
              {order.items?.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
            </Text>
          </View>
          
          <View style={styles.orderDetail}>
            <MapPin size={16} color="#6B7280" />
            <Text style={styles.orderDetailText} numberOfLines={1}>
              {order.deliveryLocation?.address || order.customerAddress || 'No address'}
            </Text>
          </View>
        </View>

        <View style={styles.orderCardFooter}>
          <Text style={styles.orderAmount}>Rs. {order.totalAmount?.toLocaleString()}</Text>
          <Text style={styles.orderCustomer}>{order.customerName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
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
            You don't have any active deliveries at the moment
          </Text>
        </View>
      ) : (
        <>
          {/* Orders List */}
          <View style={styles.ordersSection}>
            <View style={styles.ordersSectionHeader}>
              <Text style={styles.ordersSectionTitle}>Active Orders ({orders.length})</Text>
              <TouchableOpacity onPress={fetchActiveOrders}>
                <Package size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.ordersScroll}
              contentContainerStyle={styles.ordersScrollContent}
            >
              {orders.map((order, idx) => (
                <OrderCard key={order.id || `order-${idx}`} order={order} />
              ))}
            </ScrollView>
          </View>

          {selectedOrder && selectedOrder.deliveryLocation && 
           selectedOrder.deliveryLocation.latitude && 
           selectedOrder.deliveryLocation.longitude &&
           selectedOrder.deliveryLocation.latitude !== 0 &&
           selectedOrder.deliveryLocation.longitude !== 0 ? (
            <>
              {/* Map Container */}
              <View style={styles.mapContainer}>
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude: (driverLocation.latitude + selectedOrder.deliveryLocation.latitude) / 2,
                    longitude: (driverLocation.longitude + selectedOrder.deliveryLocation.longitude) / 2,
                    latitudeDelta: LATITUDE_DELTA,
                    longitudeDelta: LONGITUDE_DELTA,
                  }}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                >
                  {/* Route Polyline */}
                  <Polyline
                    coordinates={[
                      driverLocation,
                      {
                        latitude: selectedOrder.deliveryLocation.latitude,
                        longitude: selectedOrder.deliveryLocation.longitude,
                      }
                    ]}
                    strokeColor="#007AFF"
                    strokeWidth={4}
                  />

                  {/* Driver Marker */}
                  <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
                    <Animated.View style={[styles.driverMarkerContainer, { transform: [{ scale: pulseAnim }] }]}>
                      <View style={styles.driverMarkerPulse} />
                    </Animated.View>
                    <View style={styles.driverMarker}>
                      <Truck size={20} color="#FFFFFF" />
                    </View>
                  </Marker>

                  {/* Customer Marker */}
                  <Marker 
                    coordinate={{
                      latitude: selectedOrder.deliveryLocation.latitude,
                      longitude: selectedOrder.deliveryLocation.longitude,
                    }} 
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <View style={styles.customerMarker}>
                      <MapPin size={28} color="#EF4444" />
                    </View>
                  </Marker>
                </MapView>

                {/* Top Info Bar */}
                <View style={styles.topInfoBar}>
                  <View style={styles.topInfoLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedOrder.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                        {getStatusText(selectedOrder.status)}
                      </Text>
                    </View>
                    {/* Socket Connection Indicator */}
                    <View style={[styles.socketBadge, { backgroundColor: socketConnected ? '#10B98120' : '#EF444420' }]}>
                      <View style={[styles.socketDot, { backgroundColor: socketConnected ? '#10B981' : '#EF4444' }]} />
                      <Text style={[styles.socketText, { color: socketConnected ? '#10B981' : '#EF4444' }]}>
                        {socketConnected ? 'Live' : 'Offline'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
                    <Navigation size={20} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                {/* Speed and Distance Indicators */}
                <View style={styles.metricsContainer}>
                  <View style={styles.metricCard}>
                    <Gauge size={16} color="#007AFF" />
                    <Text style={styles.metricValue}>{currentSpeed}</Text>
                    <Text style={styles.metricLabel}>km/h</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <MapPin size={16} color="#EF4444" />
                    <Text style={styles.metricValue}>{distanceRemaining.toFixed(1)}</Text>
                    <Text style={styles.metricLabel}>km left</Text>
                  </View>
                </View>
              </View>

              {/* Bottom Card */}
              <View style={styles.bottomCard}>
                {/* ETA Section */}
                <View style={styles.etaSection}>
                  <View style={styles.etaContent}>
                    <Clock size={24} color="#007AFF" />
                    <View style={styles.etaTextContainer}>
                      <Text style={styles.etaValue}>{estimatedTime} mins</Text>
                      <Text style={styles.etaLabel}>Estimated Arrival</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.navigateButton} onPress={openGoogleMaps}>
                    <Navigation size={16} color="#FFFFFF" />
                    <Text style={styles.navigateButtonText}>Navigate</Text>
                  </TouchableOpacity>
                </View>

                {/* Customer Info */}
                <View style={styles.customerCard}>
                  <View style={styles.customerHeader}>
                    <View style={styles.customerIconContainer}>
                      <Package size={20} color="#007AFF" />
                    </View>
                    <View style={styles.customerInfo}>
                      <Text style={styles.customerName}>{selectedOrder.customerName}</Text>
                      <Text style={styles.orderNumberSmall}>Order {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-6)}`}</Text>
                    </View>
                    <View style={styles.customerActions}>
                      <TouchableOpacity style={styles.iconButton} onPress={handleCallCustomer}>
                        <Phone size={18} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconButton} onPress={handleMessageCustomer}>
                        <MessageCircle size={18} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.deliveryDetails}>
                    <View style={styles.detailRow}>
                      <MapPin size={14} color="#6B7280" />
                      <Text style={styles.detailText}>{selectedOrder.deliveryLocation.address}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Package size={14} color="#6B7280" />
                      <Text style={styles.detailText}>
                        {selectedOrder.items?.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleMarkDelivered}>
                    <CheckCircle size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Mark as Delivered</Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={handleReportIssue}>
                    <AlertCircle size={18} color="#EF4444" />
                    <Text style={styles.secondaryButtonText}>Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : selectedOrder ? (
            <View style={styles.noLocationContainer}>
              <AlertCircle size={48} color="#6B7280" />
              <Text style={styles.noLocationTitle}>No Delivery Location</Text>
              <Text style={styles.noLocationText}>
                This order doesn't have a valid delivery location set. Please contact the customer or support.
              </Text>
              <View style={styles.customerCard}>
                <View style={styles.customerHeader}>
                  <View style={styles.customerIconContainer}>
                    <Package size={20} color="#007AFF" />
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{selectedOrder.customerName}</Text>
                    <Text style={styles.orderNumberSmall}>Order {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-6)}`}</Text>
                  </View>
                  <View style={styles.customerActions}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleCallCustomer}>
                      <Phone size={18} color="#007AFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleMessageCustomer}>
                      <MessageCircle size={18} color="#007AFF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.deliveryDetails}>
                  <View style={styles.detailRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.detailText}>{selectedOrder.deliveryLocation?.address || selectedOrder.customerAddress || 'No address available'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Package size={14} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {selectedOrder.items?.map(item => `${item.quantity}x ${item.productName}`).join(', ')}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}
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
  orderCustomer: {
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    width: 32,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topInfoBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  socketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  socketDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  socketText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  centerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
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
  etaSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  etaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaTextContainer: {
    marginLeft: 12,
  },
  etaValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  etaLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  navigateButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  customerCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  orderNumberSmall: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  actionButtonsContainer: {
    gap: 10,
    marginBottom: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FF',
  },
  noLocationTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
});
