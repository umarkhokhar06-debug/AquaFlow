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
  Modal,
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
  ChevronUp,
  ChevronDown,
  X,
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
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [showDriverInfo, setShowDriverInfo] = useState(false);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const panelHeight = useRef(new Animated.Value(220)).current;

  // Update customer location when selected order changes
  useEffect(() => {
    if (selectedOrder && selectedOrder.deliveryAddress) {
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
      }
    }
  }, [selectedOrder]);

  // Use driver location from order data when available
  useEffect(() => {
    if (selectedOrder?.driver) {
      console.log('[TrackingScreen] Selected order driver:', JSON.stringify(selectedOrder.driver, null, 2));
      const driverData = selectedOrder.driver as any;
      if (driverData.location && driverData.location.latitude && driverData.location.longitude) {
        console.log('[TrackingScreen] Using driver location from order:', driverData.location);
        setDriverLocation({
          latitude: driverData.location.latitude,
          longitude: driverData.location.longitude,
        });
        setIsDriverOnline(true);
      } else {
        console.warn('[TrackingScreen] Driver location not available:', driverData);
        setIsDriverOnline(false);
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
            edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
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

  const getLastActiveTime = () => {
    if (!selectedOrder?.driver) {
      console.log('[getLastActiveTime] No driver in selectedOrder');
      return 'Unknown';
    }
    
    const driverData = selectedOrder.driver as any;
    if (!driverData.location?.lastUpdated) {
      console.log('[getLastActiveTime] No lastUpdated in driver location:', driverData.location);
      return 'Unknown';
    }
    
    try {
      const lastUpdated = new Date(driverData.location.lastUpdated);
      const now = new Date();
      
      // Check if date is valid
      if (isNaN(lastUpdated.getTime())) {
        console.warn('[getLastActiveTime] Invalid date:', driverData.location.lastUpdated);
        return 'Unknown';
      }
      
      const diffSeconds = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000);
      console.log('[getLastActiveTime] Difference in seconds:', diffSeconds, 'lastUpdated:', lastUpdated, 'now:', now);
      
      if (diffSeconds < 60) return 'Just now';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
      return lastUpdated.toLocaleDateString();
    } catch (error) {
      console.error('[getLastActiveTime] Error:', error);
      return 'Unknown';
    }
  };

  const getDriverLocationCoordinates = () => {
    if (!selectedOrder?.driver) return null;
    const driverData = selectedOrder.driver as any;
    if (driverData.location?.latitude && driverData.location?.longitude) {
      return {
        latitude: driverData.location.latitude,
        longitude: driverData.location.longitude,
        lastUpdated: driverData.location.lastUpdated
      };
    }
    return null;
  };

  const handleCallDriver = () => {
    const driverPhone = (selectedOrder?.driver as any)?.phone;
    if (driverPhone) {
      Linking.openURL(`tel:${driverPhone}`);
    } else {
      Alert.alert('No Contact', 'Driver phone number not available');
    }
  };

  const handleMessageDriver = () => {
    const driverId = (selectedOrder?.driver as any)?.id;
    if (driverId) {
      router.push({
        pathname: '/(main)/help',
        params: { driverId, driverName: selectedOrder?.driver?.name }
      });
    } else {
      Alert.alert('Error', 'Unable to message driver');
    }
  };

  const handleCenterMap = () => {
    if (mapRef.current && selectedOrder) {
      mapRef.current.fitToCoordinates(
        [driverLocation, customerLocation],
        {
          edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
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

  const togglePanel = () => {
    Animated.timing(panelHeight, {
      toValue: panelExpanded ? 120 : 240,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setPanelExpanded(!panelExpanded);
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
          <ChevronRight size={18} color={isSelected ? '#007AFF' : '#9CA3AF'} />
        </View>

        {isSelected && (
          <View style={styles.orderCardBody}>
            <View style={styles.orderDetail}>
              <Package size={14} color="#6B7280" />
              <Text style={styles.orderDetailText} numberOfLines={1}>
                {order.items?.map(item => `${item.quantity}x ${item.type}`).join(', ')}
              </Text>
            </View>
            
            <View style={styles.orderDetail}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.orderDetailText} numberOfLines={1}>
                {order.deliveryAddress?.address || 'No address'}
              </Text>
            </View>
          </View>
        )}
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
            You don't have any active deliveries to track
          </Text>
        </View>
      ) : (
        <>
          {/* Map View - Takes Maximum Space */}
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
                <Polyline
                  coordinates={[driverLocation, customerLocation]}
                  strokeColor="#007AFF"
                  strokeWidth={3}
                  lineDashPattern={[5, 5]}
                />
              )}

              {/* Driver Marker */}
              {isDriverOnline && (
                <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
                  <Animated.View style={[styles.driverMarkerContainer, { transform: [{ scale: pulseAnim }] }]}> 
                    <View style={styles.driverMarkerPulse} />
                  </Animated.View>
                  <View style={styles.driverMarker}>
                    <Truck size={18} color="#FFFFFF" />
                  </View>
                </Marker>
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
              <Navigation size={18} color="#007AFF" />
            </TouchableOpacity>

            {/* Driver Status Badge */}
            <View style={styles.statusBadgeContainer}>
              <View style={[styles.driverStatusBadge, { backgroundColor: isDriverOnline ? '#10B981' : '#6B7280' }]}>
                <View style={styles.statusDot} />
                <Text style={styles.driverStatusText}>
                  {isDriverOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>

          {/* Collapsible Bottom Panel */}
          <Animated.View style={[styles.bottomPanel, { height: panelHeight }]}>
            {/* Handle */}
            <TouchableOpacity style={styles.handleContainer} onPress={togglePanel}>
              <View style={styles.handle} />
            </TouchableOpacity>

            {/* Panel Header */}
            <View style={styles.panelHeader}>
              <View>
                <Text style={styles.panelTitle}>
                  {selectedOrder?.orderNumber} • {getStatusText(selectedOrder?.status || '')}
                </Text>
                <Text style={styles.panelSubtitle}>Active Orders ({orders.length})</Text>
              </View>
              <TouchableOpacity onPress={togglePanel}>
                {panelExpanded ? (
                  <ChevronDown size={20} color="#6B7280" />
                ) : (
                  <ChevronUp size={20} color="#6B7280" />
                )}
              </TouchableOpacity>
            </View>

            {/* Orders List - Only show when expanded */}
            {panelExpanded && (
              <View style={styles.ordersListContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  scrollEnabled={orders.length > 1}
                  contentContainerStyle={styles.ordersListContent}
                >
                  {orders.map((order, idx) => (
                    <OrderCard key={order._id || `${order.orderNumber}-${idx}`} order={order} />
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Driver Action Bar - Show when collapsed or expanded */}
            {selectedOrder?.driver && (
              <View style={styles.driverActionBar}>
                <TouchableOpacity 
                  style={styles.actionButtonSmall} 
                  onPress={handleCallDriver}
                >
                  <Phone size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButtonSmall, styles.actionButtonSecondary]} 
                  onPress={handleMessageDriver}
                >
                  <MessageCircle size={16} color="#007AFF" />
                  <Text style={styles.actionButtonTextSecondary}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButtonSmall}
                  onPress={() => setShowDriverInfo(true)}
                >
                  <User size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Driver</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Driver Info Modal */}
          <Modal
            visible={showDriverInfo && !!selectedOrder?.driver}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDriverInfo(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.driverInfoModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Driver Information</Text>
                  <TouchableOpacity onPress={() => setShowDriverInfo(false)}>
                    <X size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.driverInfoRow}>
                    <View style={styles.driverAvatar}>
                      <Truck size={24} color="#007AFF" />
                    </View>
                    <View style={styles.driverDetailBlock}>
                      <Text style={styles.driverName}>{selectedOrder?.driver?.name}</Text>
                      <Text style={styles.driverSubtitle}>{selectedOrder?.driver?.email}</Text>
                    </View>
                  </View>

                  {selectedOrder && selectedOrder.driver && (selectedOrder.driver as any).phone && (
                    <View style={styles.infoItem}>
                      <Phone size={18} color="#007AFF" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{(selectedOrder.driver as any).phone}</Text>
                      </View>
                    </View>
                  )}

                  {isDriverOnline && (
                    <View style={styles.infoItem}>
                      <Clock size={18} color="#10B981" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Last Active</Text>
                        <Text style={styles.infoValue}>{getLastActiveTime()}</Text>
                      </View>
                    </View>
                  )}

                  {selectedOrder && selectedOrder.driver && (selectedOrder.driver as any)?.location && (
                    <View style={styles.infoItem}>
                      <MapPin size={18} color="#F97316" />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Last Location</Text>
                        {(() => {
                          const coords = getDriverLocationCoordinates();
                          if (!coords) return <Text style={styles.infoValue}>Unknown</Text>;
                          return (
                            <View>
                              <Text style={styles.infoValue}>
                                {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                              </Text>
                              {coords.lastUpdated && (
                                <Text style={styles.infoSubtext}>
                                  Updated: {new Date(coords.lastUpdated).toLocaleTimeString()}
                                </Text>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  )}

                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity 
                      style={styles.actionButtonFull} 
                      onPress={() => {
                        handleCallDriver();
                        setShowDriverInfo(false);
                      }}
                    >
                      <Phone size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonFullText}>Call Driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButtonFull, styles.actionButtonFullSecondary]}
                      onPress={() => {
                        handleMessageDriver();
                        setShowDriverInfo(false);
                      }}
                    >
                      <MessageCircle size={18} color="#007AFF" />
                      <Text style={styles.actionButtonFullTextSecondary}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  customerMarker: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
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
  statusBadgeContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
  },
  driverStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
    backgroundColor: '#FFFFFF',
  },
  driverStatusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  panelTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  panelSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  ordersListContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 220,
  },
  ordersListContent: {
    gap: 8,
  },
  orderCard: {
    minWidth: 160,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
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
    marginBottom: 6,
  },
  orderCardLeft: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  orderCardBody: {
    gap: 4,
  },
  orderDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderDetailText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    flex: 1,
  },
  driverActionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    gap: 5,
  },
  actionButtonSecondary: {
    backgroundColor: '#EFF6FF',
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  driverInfoModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  modalContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  driverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetailBlock: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  driverSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 2,
  },
  infoSubtext: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  actionButtonFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    gap: 8,
  },
  actionButtonFullSecondary: {
    backgroundColor: '#EFF6FF',
  },
  actionButtonFullText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  actionButtonFullTextSecondary: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
});
