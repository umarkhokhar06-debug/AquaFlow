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
  PanResponder,
} from 'react-native';
import type MapView from 'react-native-maps';
import DriverTrackingMap from '@/components/DriverTrackingMap';
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
  ChevronUp,
} from 'lucide-react-native';
import { socketService } from '@/utils/socketService';
import { driverAPI, DriverOrder } from '@/utils/driverAPI';

const { width, height } = Dimensions.get('window');

const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export default function DriverMapScreen() {
  // Listen for live order status updates
  useEffect(() => {
    // Handler for order status update event from socket
    const handleOrderStatusUpdate = (data: { orderId: string; status: string }) => {
      // Only allow valid statuses for DriverOrder
      const validStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'delivered'] as const;
      if (!validStatuses.includes(data.status as any)) return;
      setOrders(prevOrders => {
        const found = prevOrders.find(o => o.id === data.orderId);
        if (!found) return prevOrders;
        // Update the order in the list
        return prevOrders.map(o =>
          o.id === data.orderId ? { ...o, status: data.status as typeof validStatuses[number] } : o
        );
      });
      // If the selected order is updated, update its status as well
      setSelectedOrder(prev => {
        if (prev && prev.id === data.orderId) {
          return { ...prev, status: data.status as typeof validStatuses[number] };
        }
        return prev;
      });
    };

    socketService.onOrderStatusUpdate(handleOrderStatusUpdate);
    return () => {
      socketService.removeOrderStatusUpdateListener(handleOrderStatusUpdate);
    };
  }, []);
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<DriverOrder | null>(null);
  const [driverLocation, setDriverLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [drawerHeight] = useState(new Animated.Value(120)); // Starting height for collapsed state
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

  // Update customer location when selected order or driver location changes
  useEffect(() => {
    if (!driverLocation) return;
    if (
      selectedOrder &&
      selectedOrder.deliveryLocation &&
      selectedOrder.deliveryLocation.latitude &&
      selectedOrder.deliveryLocation.longitude &&
      selectedOrder.deliveryLocation.latitude !== 0 &&
      selectedOrder.deliveryLocation.longitude !== 0
    ) {
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
      // Fetch route coordinates from Google Maps
      fetchRouteCoordinates(driverLocation, customerLoc);
      // Center map on both locations
      if (mapRef.current && driverLocation) {
        mapRef.current.fitToCoordinates([driverLocation, customerLoc], {
          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
          animated: true,
        });
      }
    } else {
      setIsNavigating(false);
      setRouteCoordinates([]);
    }
  }, [selectedOrder, driverLocation]);

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
          setDriverLocation(newLocation);
          setCurrentSpeed(location.coords.speed ? Math.round(location.coords.speed * 3.6) : 0); // Convert m/s to km/h
          // Emit location update to backend via socket (only if connected)
          if (socketService.isSocketConnected()) {
            socketService.emitDriverLocation(newLocation);
          }
          // Update map view
          if (mapRef.current) {
            mapRef.current.animateCamera({
              center: newLocation,
              heading: location.coords.heading || 0,
            });
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

  const fetchRouteCoordinates = async (start: { latitude: number; longitude: number }, end: { latitude: number; longitude: number }) => {
    try {
      const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // TODO: Add your API key
      
      // If no API key is set, use straight line as fallback
      if (GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
        console.log('[DriverMapScreen] Using straight line path (no API key configured)');
        setRouteCoordinates([start, end]);
        return;
      }

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&mode=driving&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoordinates(points);
        console.log('[DriverMapScreen] Route fetched with', points.length, 'points');
      } else {
        console.warn('[DriverMapScreen] No routes found, using straight line');
        setRouteCoordinates([start, end]);
      }
    } catch (error) {
      console.error('[DriverMapScreen] Error fetching route:', error);
      // Fallback to straight line
      setRouteCoordinates([start, end]);
    }
  };

  const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
    const poly: Array<{ latitude: number; longitude: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let b;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      result = 0;
      shift = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return poly;
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
    
    // Ensure driverLocation is available before calling fitToCoordinates to satisfy TypeScript
    if (mapRef.current && driverLocation) {
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
    
    if (!driverLocation) {
      Alert.alert('Location not ready', 'Waiting for your location...');
      return;
    }
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
          <ChevronRight size={20} color={isSelected ? '#087EA4' : '#9CA3AF'} />
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

  const DrawerSheet = ({
    selectedOrder,
    orders,
    onOrderSelect,
    onCallCustomer,
    onMessageCustomer,
    onMarkDelivered,
    onReportIssue,
    onOpenMaps,
  }: any) => {
  const windowHeight = Dimensions.get('window').height;
  const SNAP_TOP = windowHeight * 0.30;
  const SNAP_BOTTOM = windowHeight * 0.70;
  const animatedY = useRef(new Animated.Value(SNAP_BOTTOM)).current;
    const [isExpanded, setIsExpanded] = useState(false);

    // Animate to snap point
    const animateTo = (toValue: number) => {
      Animated.spring(animatedY, {
        toValue,
        useNativeDriver: false,
        tension: 80,
        friction: 12,
      }).start();
    };

    // Open/close helpers
    const open = () => {
      setIsExpanded(true);
      animateTo(SNAP_TOP);
    };
    const close = () => {
      setIsExpanded(false);
      animateTo(SNAP_BOTTOM);
    };

    // PanResponder for drag
    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
        onPanResponderMove: (_, gestureState) => {
          let newY = (isExpanded ? SNAP_TOP : SNAP_BOTTOM) + gestureState.dy;
          if (newY < SNAP_TOP) newY = SNAP_TOP;
          if (newY > SNAP_BOTTOM) newY = SNAP_BOTTOM;
          animatedY.setValue(newY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldOpen = gestureState.vy < -0.3 || (isExpanded ? gestureState.dy < 60 : gestureState.dy < -60);
          const shouldClose = gestureState.vy > 0.3 || (isExpanded ? gestureState.dy > 60 : gestureState.dy > -60);
          if (shouldOpen) open();
          else if (shouldClose) close();
          else animateTo(isExpanded ? SNAP_TOP : SNAP_BOTTOM);
        },
      })
    ).current;

    // Snap to correct position on expand/collapse
    useEffect(() => {
      animateTo(isExpanded ? SNAP_TOP : SNAP_BOTTOM);
    }, [isExpanded]);

    return (
      <Animated.View
        style={[
          styles.drawerContainer,
          {
            top: animatedY,
            position: 'absolute',
            left: 0,
            right: 0,
            zIndex: 10,
            overflow: 'hidden',
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle Bar */}
        <View style={styles.drawerHandle}>
          <View style={styles.handleBar} />
        </View>

        {/* Main Header (always visible) */}
        <TouchableOpacity
          style={styles.drawerHeader}
          onPress={isExpanded ? close : open}
          activeOpacity={0.7}
        >
          <View style={styles.drawerHeaderLeft}>
            <View style={styles.drawerCustomerIcon}>
              <Package size={20} color="#087EA4" />
            </View>
            <View>
              <Text style={styles.drawerCustomerName}>{selectedOrder.customerName}</Text>
              <Text style={styles.drawerOrderNumber}>
                Order {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-6)}`}
              </Text>
            </View>
          </View>
          <ChevronUp size={20} color="#6B7280" style={{ transform: [{ rotate: isExpanded ? '0deg' : '180deg' }] }} />
        </TouchableOpacity>

        {/* Quick Actions (always visible) */}
        <View style={styles.drawerQuickActions}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={onCallCustomer}
          >
            <Phone size={18} color="#087EA4" />
            <Text style={styles.quickActionText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={onMessageCustomer}
          >
            <MessageCircle size={18} color="#087EA4" />
            <Text style={styles.quickActionText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={onOpenMaps}
          >
            <Navigation size={18} color="#087EA4" />
            <Text style={styles.quickActionText}>Navigate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionPrimary]}
            onPress={() => {
              onMarkDelivered();
            }}
          >
            <CheckCircle size={18} color="#FFFFFF" />
            <Text style={[styles.quickActionText, { color: '#FFFFFF' }]}>Delivered</Text>
          </TouchableOpacity>
        </View>

        {/* Extra Details (only visible when expanded) */}
        {isExpanded && (
          <ScrollView
            style={styles.drawerContent}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Orders List */}
            <View style={styles.expandedOrdersList}>
              <Text style={styles.expandedOrdersTitle}>Active Orders ({orders.length})</Text>
              {orders.map((order: DriverOrder, idx: number) => (
                <TouchableOpacity
                  key={order.id || `order-${idx}`}
                  style={[
                    styles.expandedOrderItem,
                    selectedOrder?.id === order.id && styles.expandedOrderItemSelected,
                  ]}
                  onPress={() => onOrderSelect(order)}
                  activeOpacity={0.6}
                >
                  <View style={styles.expandedOrderItemLeft}>
                    <Text style={styles.expandedOrderNumber}>
                      {order.orderNumber || `#${order.id.slice(-6)}`}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20', marginTop: 6 }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(order.status), fontSize: 11 }]}>
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.expandedOrderItemRight}>
                    <Text style={styles.expandedOrderAmount}>Rs. {order.totalAmount?.toLocaleString()}</Text>
                    <Text style={styles.expandedOrderCustomer}>{order.customerName}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Current Order Details */}
            <View style={styles.currentOrderDetails}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>

              <View style={styles.detailCard}>
                <View style={styles.detailCardRow}>
                  <MapPin size={16} color="#087EA4" />
                  <View style={styles.detailCardText}>
                    <Text style={styles.detailCardLabel}>Location</Text>
                    <Text style={styles.detailCardValue}>
                      {selectedOrder.deliveryLocation?.address || 'No address'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCardRow}>
                  <Package size={16} color="#087EA4" />
                  <View style={styles.detailCardText}>
                    <Text style={styles.detailCardLabel}>Items</Text>
                    <Text style={styles.detailCardValue}>
                      {selectedOrder.items?.map((item: any) => `${item.quantity}x ${item.productName}`).join(', ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailCardRow}>
                  <Clock size={16} color="#F59E0B" />
                  <View style={styles.detailCardText}>
                    <Text style={styles.detailCardLabel}>ETA</Text>
                    <Text style={styles.detailCardValue}>{estimatedTime} mins</Text>
                  </View>
                </View>

                <View style={styles.detailCardRow}>
                  <Gauge size={16} color="#10B981" />
                  <View style={styles.detailCardText}>
                    <Text style={styles.detailCardLabel}>Distance</Text>
                    <Text style={styles.detailCardValue}>{distanceRemaining.toFixed(1)} km</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.drawerActions}>
                <TouchableOpacity
                  style={styles.drawerPrimaryButton}
                  onPress={() => {
                    onMarkDelivered();
                    close();
                  }}
                >
                  <CheckCircle size={18} color="#FFFFFF" />
                  <Text style={styles.drawerPrimaryButtonText}>Mark Delivered</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerSecondaryButton}
                  onPress={onOpenMaps}
                >
                  <Navigation size={18} color="#087EA4" />
                  <Text style={styles.drawerSecondaryButtonText}>Open Maps</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerOutlineButton}
                  onPress={onCallCustomer}
                >
                  <Phone size={16} color="#087EA4" />
                  <Text style={styles.drawerOutlineButtonText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerOutlineButton}
                  onPress={onMessageCustomer}
                >
                  <MessageCircle size={16} color="#087EA4" />
                  <Text style={styles.drawerOutlineButtonText}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.drawerDangerButton}
                  onPress={onReportIssue}
                >
                  <AlertCircle size={16} color="#EF4444" />
                  <Text style={styles.drawerDangerButtonText}>Report Issue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
  {loading || !driverLocation ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#087EA4" />
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
          {selectedOrder && selectedOrder.deliveryLocation && 
           selectedOrder.deliveryLocation.latitude && 
           selectedOrder.deliveryLocation.longitude &&
           selectedOrder.deliveryLocation.latitude !== 0 &&
           selectedOrder.deliveryLocation.longitude !== 0 ? (
            <>
              {/* Full Map Container */}
              <View style={styles.mapContainer}>
                <DriverTrackingMap
                  ref={mapRef}
                  style={styles.map}
                  driverLocation={driverLocation}
                  deliveryLocation={{
                    latitude: selectedOrder.deliveryLocation.latitude,
                    longitude: selectedOrder.deliveryLocation.longitude,
                  }}
                  routeCoordinates={routeCoordinates}
                  pulseAnim={pulseAnim}
                  latitudeDelta={LATITUDE_DELTA}
                  longitudeDelta={LONGITUDE_DELTA}
                />

                {/* Top Status Bar */}
                <View style={styles.topStatusBar}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(selectedOrder.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                      {getStatusText(selectedOrder.status)}
                    </Text>
                  </View>
                  
                  <View style={[styles.socketBadge, { backgroundColor: socketConnected ? '#10B98120' : '#EF444420' }]}>
                    <View style={[styles.socketDot, { backgroundColor: socketConnected ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.socketText, { color: socketConnected ? '#10B981' : '#EF4444' }]}>
                      {socketConnected ? 'Live' : 'Offline'}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.centerButton} 
                    onPress={() => {
                      const customerLoc = {
                        latitude: selectedOrder.deliveryLocation.latitude,
                        longitude: selectedOrder.deliveryLocation.longitude,
                      };
                      if (mapRef.current) {
                        mapRef.current.fitToCoordinates([driverLocation, customerLoc], {
                          edgePadding: { top: 100, right: 50, bottom: 200, left: 50 },
                          animated: true,
                        });
                      }
                    }}
                  >
                    <Navigation size={20} color="#087EA4" />
                  </TouchableOpacity>
                </View>

                {/* Mini Metrics */}
                <View style={styles.miniMetricsContainer}>
                  <View style={styles.miniMetricCard}>
                    <Gauge size={14} color="#087EA4" />
                    <Text style={styles.miniMetricValue}>{currentSpeed} km/h</Text>
                  </View>
                  <View style={styles.miniMetricCard}>
                    <MapPin size={14} color="#EF4444" />
                    <Text style={styles.miniMetricValue}>{distanceRemaining.toFixed(1)} km</Text>
                  </View>
                  <View style={styles.miniMetricCard}>
                    <Clock size={14} color="#F59E0B" />
                    <Text style={styles.miniMetricValue}>{estimatedTime} min</Text>
                  </View>
                </View>
              </View>

              {/* Draggable Bottom Drawer */}
              <DrawerSheet
                selectedOrder={selectedOrder}
                orders={orders}
                onOrderSelect={setSelectedOrder}
                onCallCustomer={handleCallCustomer}
                onMessageCustomer={handleMessageCustomer}
                onMarkDelivered={handleMarkDelivered}
                onReportIssue={handleReportIssue}
                onOpenMaps={() => openGoogleMaps()}
              />
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
                    <Package size={20} color="#087EA4" />
                  </View>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{selectedOrder.customerName}</Text>
                    <Text style={styles.orderNumberSmall}>Order {selectedOrder.orderNumber || `#${selectedOrder.id.slice(-6)}`}</Text>
                  </View>
                  <View style={styles.customerActions}>
                    <TouchableOpacity style={styles.iconButton} onPress={handleCallCustomer}>
                      <Phone size={18} color="#087EA4" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleMessageCustomer}>
                      <MessageCircle size={18} color="#087EA4" />
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
          ) : (
            <View style={styles.selectOrderContainer}>
              <Package size={48} color="#D1D5DB" />
              <Text style={styles.selectOrderTitle}>Select an Order</Text>
              <Text style={styles.selectOrderText}>
                Choose an order from the list below to view it on the map
              </Text>
              
              <ScrollView 
                style={styles.ordersListContainer}
                contentContainerStyle={styles.ordersListContent}
                showsVerticalScrollIndicator={false}
              >
                {orders.map((order: DriverOrder, idx: number) => (
                  <OrderCard key={order.id || `order-${idx}`} order={order} />
                ))}
              </ScrollView>
            </View>
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
  selectOrderContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  selectOrderTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
  },
  selectOrderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  ordersListContainer: {
    width: '100%',
  },
  ordersListContent: {
    gap: 12,
    paddingBottom: 20,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  topStatusBar: {
    position: 'absolute',
    top: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  miniMetricsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  miniMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  miniMetricValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  /* Drawer Styles */
  drawerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  drawerHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  drawerCustomerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  drawerCustomerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  drawerOrderNumber: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  drawerCloseButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerCloseText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#087EA4',
  },
  drawerContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  expandedOrdersList: {
    marginTop: 16,
    marginBottom: 20,
  },
  expandedOrdersTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  expandedOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expandedOrderItemSelected: {
    borderColor: '#087EA4',
    backgroundColor: '#F0F8FF',
  },
  expandedOrderItemLeft: {
    flex: 1,
  },
  expandedOrderNumber: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  expandedOrderItemRight: {
    alignItems: 'flex-end',
  },
  expandedOrderAmount: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  expandedOrderCustomer: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  currentOrderDetails: {
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  detailCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailCardText: {
    flex: 1,
  },
  detailCardLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  detailCardValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  drawerActions: {
    gap: 10,
    marginBottom: 10,
  },
  drawerPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  drawerPrimaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  drawerSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#087EA4',
  },
  drawerSecondaryButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#087EA4',
  },
  drawerOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  drawerOutlineButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#087EA4',
  },
  drawerDangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  drawerDangerButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  drawerQuickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionPrimary: {
    backgroundColor: '#087EA4',
    borderColor: '#087EA4',
  },
  quickActionText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#087EA4',
    marginTop: 6,
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  orderCardSelected: {
    borderColor: '#087EA4',
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
