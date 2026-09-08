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
import type MapView from 'react-native-maps';
import TrackingMap from '@/components/TrackingMap';
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
import { router } from 'expo-router';
import { socketService, DriverLocationData } from '@/utils/socketService';
import { orderAPI } from '@/utils/orderAPI';
import { Order, QueueStatus, getOrderId, ORDER_STATUSES, ORDER_STATUS_LABEL, OrderStatus } from '@/types/order';
import { Badge, orderStatusTone } from '@/app/components/ui';
import StepStepper, { Step } from '@/app/components/StepStepper';
import { colors, spacing, typography } from '@/theme';

const STATUS_LABEL = ORDER_STATUS_LABEL;

// ORDER_STATUSES is already in lifecycle order, so a status's index doubles
// as its progress rank -- used below to derive each milestone's done /
// active / pending state without hand-maintaining a parallel boolean set.
function statusRank(status: OrderStatus | undefined): number {
  if (!status) return -1;
  return ORDER_STATUSES.indexOf(status);
}

function milestoneState(order: Order | null, atLeast: OrderStatus, activeWhile: OrderStatus[]): Step['state'] {
  if (!order) return 'pending';
  if (order.status === 'cancelled') return 'pending';
  const rank = statusRank(order.status);
  if (activeWhile.includes(order.status)) return 'active';
  return rank >= statusRank(atLeast) ? 'done' : 'pending';
}

function buildTrackSteps(order: Order | null, queueStatus: QueueStatus | null): Step[] {
  const hasDriver = !!order?.driver;

  return [
    { key: 'confirmed', label: 'Order confirmed', state: 'done' },
    {
      key: 'driver',
      label: 'Driver assigned',
      state: milestoneState(order, 'driver_assigned', []),
      sublabel: !hasDriver
        ? queueStatus?.position != null
          ? `You're #${queueStatus.position} in line${queueStatus.etaMinutes != null ? ` · ~${queueStatus.etaMinutes} min` : ''}`
          : 'Waiting to be assigned'
        : undefined,
    },
    {
      key: 'filling',
      label: 'Filling tanker',
      state: milestoneState(order, 'water_filled', ['going_to_filling_station', 'water_filled']),
    },
    {
      key: 'onway',
      label: 'On the way',
      state: milestoneState(order, 'arrived', ['on_the_way', 'arrived']),
    },
    { key: 'delivered', label: 'Delivered', state: order?.status === 'delivered' ? 'done' : 'pending' },
  ];
}

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
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const insets = useSafeAreaInsets();
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

  // Before a driver is assigned there's nothing to show on the map --
  // poll the queue position/ETA instead.
  useEffect(() => {
    if (!selectedOrder || selectedOrder.driver) {
      setQueueStatus(null);
      return;
    }

    let cancelled = false;
    const fetchQueueStatus = async () => {
      try {
        const status = await orderAPI.getQueueStatus(getOrderId(selectedOrder));
        if (!cancelled) setQueueStatus(status);
      } catch (error) {
        console.error('[TrackingScreen] Error fetching queue status:', error);
      }
    };
    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedOrder?._id, selectedOrder?.driver]);

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

      // Filter for active orders -- including order_created/queued (not yet
      // assigned a driver) so a just-placed order shows up here immediately
      // with its queue position, not only once a driver is assigned.
      const activeOrders = allOrders.filter((order: Order) =>
        (['order_created', 'queued', 'driver_assigned', 'going_to_filling_station', 'water_filled', 'on_the_way', 'arrived'] as const).includes(order.status as any)
      );
      console.log(`[TrackingScreen] Filtered ${activeOrders.length} active orders:`,
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
    router.push('/(main)/account');
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
            <Badge label={STATUS_LABEL[order.status] || order.status} tone={orderStatusTone(order.status)} />
          </View>
          <ChevronRight size={18} color={isSelected ? colors.primary[500] : colors.neutral[400]} />
        </View>

        {isSelected && (
          <View style={styles.orderCardBody}>
            <View style={styles.orderDetail}>
              <Package size={14} color={colors.neutral[500]} />
              <Text style={styles.orderDetailText} numberOfLines={1}>
                {order.items?.map(item => `${item.quantity}x ${item.type}`).join(', ')}
              </Text>
            </View>

            <View style={styles.orderDetail}>
              <MapPin size={14} color={colors.neutral[500]} />
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
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Package size={64} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>No Active Orders</Text>
          <Text style={styles.emptyText}>
            You don&apos;t have any active deliveries to track
          </Text>
        </View>
      ) : (
        <>
          {selectedOrder && !selectedOrder.driver ? (
            /* No driver assigned yet -- nothing to show on a map, show
               the step stepper with queue position/ETA instead. */
            <View style={styles.queueContainer}>
              <StepStepper steps={buildTrackSteps(selectedOrder, queueStatus)} />
              <Text style={styles.queueHint}>We&apos;ll show live tracking here once a driver is on the way.</Text>
            </View>
          ) : (
            /* Map View - Takes Maximum Space */
            <View style={styles.mapContainer}>
              <TrackingMap
                ref={mapRef}
                style={styles.map}
                driverLocation={driverLocation}
                customerLocation={customerLocation}
                isDriverOnline={isDriverOnline}
                pulseAnim={pulseAnim}
                latitudeDelta={LATITUDE_DELTA}
                longitudeDelta={LONGITUDE_DELTA}
              />

              {/* Compact progress strip */}
              <View style={styles.progressStrip}>
                {buildTrackSteps(selectedOrder, null).map((step) => (
                  <View
                    key={step.key}
                    style={[
                      styles.progressSegment,
                      step.state !== 'pending' && styles.progressSegmentFilled,
                    ]}
                  />
                ))}
              </View>

              {/* Center Map Button */}
              <TouchableOpacity style={styles.centerButton} onPress={handleCenterMap}>
                <Navigation size={18} color={colors.primary[500]} />
              </TouchableOpacity>

              {/* Driver Status Badge */}
              <View style={styles.statusBadgeContainer}>
                <View style={[styles.driverStatusBadge, { backgroundColor: isDriverOnline ? colors.success[500] : colors.neutral[500] }]}>
                  <View style={styles.statusDot} />
                  <Text style={styles.driverStatusText}>
                    {isDriverOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
          )}

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
                  {selectedOrder?.orderNumber} • {(selectedOrder?.status && STATUS_LABEL[selectedOrder.status]) || selectedOrder?.status}
                </Text>
                <Text style={styles.panelSubtitle}>Active Orders ({orders.length})</Text>
              </View>
              <TouchableOpacity onPress={togglePanel}>
                {panelExpanded ? (
                  <ChevronDown size={20} color={colors.neutral[500]} />
                ) : (
                  <ChevronUp size={20} color={colors.neutral[500]} />
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
                  <Phone size={16} color={colors.neutral[0]} />
                  <Text style={styles.actionButtonText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButtonSmall, styles.actionButtonSecondary]} 
                  onPress={handleMessageDriver}
                >
                  <MessageCircle size={16} color={colors.primary[500]} />
                  <Text style={styles.actionButtonTextSecondary}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButtonSmall}
                  onPress={() => setShowDriverInfo(true)}
                >
                  <User size={16} color={colors.neutral[0]} />
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
                    <X size={24} color={colors.neutral[900]} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalContent}>
                  <View style={styles.driverInfoRow}>
                    <View style={styles.driverAvatar}>
                      <Truck size={24} color={colors.primary[500]} />
                    </View>
                    <View style={styles.driverDetailBlock}>
                      <Text style={styles.driverName}>{selectedOrder?.driver?.name}</Text>
                      <Text style={styles.driverSubtitle}>{selectedOrder?.driver?.email}</Text>
                    </View>
                  </View>

                  {selectedOrder && selectedOrder.driver && (selectedOrder.driver as any).phone && (
                    <View style={styles.infoItem}>
                      <Phone size={18} color={colors.primary[500]} />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Phone</Text>
                        <Text style={styles.infoValue}>{(selectedOrder.driver as any).phone}</Text>
                      </View>
                    </View>
                  )}

                  {isDriverOnline && (
                    <View style={styles.infoItem}>
                      <Clock size={18} color={colors.success[500]} />
                      <View style={styles.infoContent}>
                        <Text style={styles.infoLabel}>Last Active</Text>
                        <Text style={styles.infoValue}>{getLastActiveTime()}</Text>
                      </View>
                    </View>
                  )}

                  {selectedOrder && selectedOrder.driver && (selectedOrder.driver as any)?.location && (
                    <View style={styles.infoItem}>
                      <MapPin size={18} color={colors.warning[500]} />
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
                      <Phone size={18} color={colors.neutral[0]} />
                      <Text style={styles.actionButtonFullText}>Call Driver</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButtonFull, styles.actionButtonFullSecondary]}
                      onPress={() => {
                        handleMessageDriver();
                        setShowDriverInfo(false);
                      }}
                    >
                      <MessageCircle size={18} color={colors.primary[500]} />
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
    backgroundColor: colors.neutral[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
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
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  queueContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  queueHint: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
    marginTop: spacing.sm,
  },
  map: {
    flex: 1,
  },
  progressStrip: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 90,
    flexDirection: 'row',
    gap: 4,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  progressSegmentFilled: {
    backgroundColor: colors.primary[500],
  },
  centerButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[0],
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
    backgroundColor: colors.neutral[0],
  },
  driverStatusText: {
    fontSize: 11,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[0],
  },
  bottomPanel: {
    backgroundColor: colors.neutral[0],
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
    backgroundColor: colors.neutral[300],
    borderRadius: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  panelTitle: {
    fontSize: 14,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  panelSubtitle: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
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
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
  },
  orderCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
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
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
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
    fontFamily: typography.h3.fontFamily,
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
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    flex: 1,
  },
  driverActionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  actionButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primary[500],
    gap: 5,
  },
  actionButtonSecondary: {
    backgroundColor: colors.primary[50],
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[0],
  },
  actionButtonTextSecondary: {
    fontSize: 12,
    fontFamily: typography.h3.fontFamily,
    color: colors.primary[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  driverInfoModal: {
    backgroundColor: colors.neutral[0],
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
    borderBottomColor: colors.neutral[100],
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
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
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverDetailBlock: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  driverSubtitle: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    marginTop: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
  },
  infoValue: {
    fontSize: 13,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
    marginTop: 2,
  },
  infoSubtext: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[400],
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
    backgroundColor: colors.primary[500],
    gap: 8,
  },
  actionButtonFullSecondary: {
    backgroundColor: colors.primary[50],
  },
  actionButtonFullText: {
    fontSize: 13,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[0],
  },
  actionButtonFullTextSecondary: {
    fontSize: 13,
    fontFamily: typography.h3.fontFamily,
    color: colors.primary[500],
  },
});
