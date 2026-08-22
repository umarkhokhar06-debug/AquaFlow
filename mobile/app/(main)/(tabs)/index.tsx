import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Droplets,
  Truck,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
  AlertTriangle,
  MapPin,
  Calendar,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import AddressSelectionModal from '@/app/components/AddressSelectionModal';
import CustomAlert from '@/app/components/CustomAlert';
import { Card, Badge, Button } from '@/app/components/ui';
import { storage, User } from '@/utils/auth';
import { orderAPI } from '@/utils/orderAPI';
import { getLatestIoTData, getMyDevices } from '@/utils/iotAPI';
import { Order, Product, QueueStatus, parseDate, getOrderId } from '@/types/order';
import { useSocket } from '@/hooks/useSocket';
import { notificationService } from '@/utils/notificationService';
import { colors, radius, spacing, typography } from '@/theme';

interface SelectedAddress {
  id: string;
  type: 'Home' | 'Office' | 'Other';
  fullName: string;
  houseNumber: string;
  portion: 'upper' | 'lower';
  address: string;
  landmark: string;
  phoneNumber: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

interface DeliverySlot {
  label: string;
  date: Date | null; // null = as soon as possible
}

function getDeliverySlots(): DeliverySlot[] {
  const now = new Date();
  const slots: DeliverySlot[] = [{ label: 'As soon as possible', date: null }];

  const todayEvening = new Date(now);
  todayEvening.setHours(18, 0, 0, 0);
  if (todayEvening.getTime() - now.getTime() > 60 * 60 * 1000) {
    slots.push({ label: 'Today, 6–8 PM', date: todayEvening });
  }

  const tomorrowMorning = new Date(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);
  slots.push({ label: 'Tomorrow, 9–11 AM', date: tomorrowMorning });

  const tomorrowEvening = new Date(now);
  tomorrowEvening.setDate(tomorrowEvening.getDate() + 1);
  tomorrowEvening.setHours(18, 0, 0, 0);
  slots.push({ label: 'Tomorrow, 6–8 PM', date: tomorrowEvening });

  return slots;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return colors.warning[500];
    case 'confirmed': return colors.primary[500];
    case 'preparing': return colors.info[500];
    case 'out_for_delivery': return '#FF6B35';
    case 'delivered': return colors.success[500];
    case 'cancelled': return colors.danger[500];
    default: return colors.neutral[500];
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending';
    case 'confirmed': return 'Confirmed';
    case 'preparing': return 'Preparing';
    case 'out_for_delivery': return 'Out for Delivery';
    case 'delivered': return 'Delivered';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getProductName = (type: string) => {
  switch (type) {
    case 'large_tanker': return 'Large Tanker';
    case 'small_tanker': return 'Small Tanker';
    case 'water_bottles': return 'Water Bottles';
    default: return type;
  }
};

const formatDate = (date: string | { $date: string }) =>
  parseDate(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const formatTime = (date: string | { $date: string }) =>
  parseDate(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const QUEUE_POLL_MS = 20000;

function ActiveOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const status = await orderAPI.getQueueStatus(getOrderId(order));
        if (!cancelled) setQueue(status);
      } catch (error) {
        console.error('Error fetching queue status:', error);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, QUEUE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [getOrderId(order)]);

  const isOutForDelivery = order.status === 'out_for_delivery';

  return (
    <Card style={styles.activeCard}>
      <View style={styles.activeHeader}>
        <View style={styles.activeHeaderLeft}>
          <View style={styles.activeIconCircle}>
            <Truck size={20} color={colors.primary[500]} />
          </View>
          <View>
            <Text style={styles.activeTitle}>{getProductName(order.items[0]?.type || '')}</Text>
            <Text style={styles.activeOrderNumber}>#{order.orderNumber}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusText(order.status)}
          </Text>
        </View>
      </View>

      {isOutForDelivery ? (
        <View style={styles.queueRow}>
          <Text style={styles.queueHeadline}>Your tanker is on the way</Text>
        </View>
      ) : queue && queue.position !== null ? (
        <View style={styles.queueRow}>
          <Text style={styles.queueHeadline}>You're #{queue.position} in line</Text>
          {queue.etaMinutes !== null && (
            <Text style={styles.queueSubtext}>~{queue.etaMinutes} min estimated</Text>
          )}
        </View>
      ) : (
        <View style={styles.queueRow}>
          <Text style={styles.queueHeadline}>Your order is being prepared</Text>
        </View>
      )}

      <Button
        label="Track live"
        variant="primary"
        size="sm"
        onPress={() => router.push('/(main)/(tabs)/tracking')}
      />
    </Card>
  );
}

function HistoryOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.orderCard} onPress={() => router.push(`/(main)/order-details/${getOrderId(order)}`)}>
      <View style={styles.orderHeader}>
        <View style={styles.orderType}>
          <Droplets size={18} color={colors.primary[500]} />
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>{getProductName(order.items[0]?.type || '')}</Text>
            <Text style={styles.orderVolume}>Qty {order.items[0]?.quantity || 1}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusText(order.status)}
          </Text>
        </View>
      </View>
      <View style={styles.orderRow}>
        <MapPin size={13} color={colors.neutral[500]} />
        <Text style={styles.orderDetailText} numberOfLines={1}>
          {order.deliveryAddress?.address || 'Address not available'}
        </Text>
      </View>
      <View style={styles.orderRow}>
        <Calendar size={13} color={colors.neutral[500]} />
        <Text style={styles.orderDetailText}>
          {formatDate(order.orderDate)} at {formatTime(order.orderDate)}
        </Text>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.orderPrice}>Rs. {order.totalAmount.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OrdersScreen() {
  const [tankLevel, setTankLevel] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [resultAlert, setResultAlert] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isConnected, connect, onSystemNotification,
    onOrderUpdate, onOrderStatusUpdate, removeOrderUpdateListener, removeOrderStatusUpdateListener,
  } = useSocket();

  const activeOrders = orders.filter((o) => ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status));
  const historyOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));
  const hasActiveOrder = activeOrders.length > 0;

  const fetchOrders = async () => {
    try {
      const ordersData = await orderAPI.getMyOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleServiceSelect = async (product: Product) => {
    if (!user) {
      setResultAlert({ title: 'Please log in', message: 'You need to be logged in to place an order.' });
      return;
    }
    if (!product.availability) {
      setResultAlert({ title: 'Unavailable', message: 'This service is currently unavailable.' });
      return;
    }
    setSelectedProduct(product);
    setShowTimingModal(true);
  };

  const handleSlotSelected = (slot: DeliverySlot) => {
    setSelectedSlot(slot);
    setShowTimingModal(false);
    setShowAddressModal(true);
  };

  const handleAddressSelected = (address: SelectedAddress) => {
    setSelectedAddress(address);
    setShowAddressModal(false);
    if (selectedProduct) {
      handleDirectOrder(selectedProduct, address, selectedSlot);
    }
  };

  const handleDirectOrder = async (product: Product, address: SelectedAddress, slot: DeliverySlot | null) => {
    if (!user) return;
    setOrdering(product.type);
    try {
      const orderData = {
        items: [{ type: product.type, quantity: 1 }],
        deliveryAddress: {
          fullName: address.fullName,
          houseNumber: address.houseNumber,
          portion: address.portion,
          address: address.address,
          phoneNumber: address.phoneNumber,
          specialInstructions: address.landmark ? `Landmark: ${address.landmark}` : 'Please deliver to the address provided',
          latitude: address.latitude,
          longitude: address.longitude,
        },
        paymentMethod: 'cash' as const,
        notes: `Direct order for ${product.name}`,
        ...(slot?.date
          ? { deliveryType: 'scheduled' as const, scheduledFor: slot.date.toISOString() }
          : { deliveryType: 'immediate' as const }),
      };

      const order = await orderAPI.createOrder(orderData);
      await fetchOrders();
      const whenText = slot?.date ? ` for ${slot.label}` : '';

      setResultAlert({
        title: 'Order placed',
        message: `Your order #${order.orderNumber} has been placed${whenText}. Total: Rs. ${order.totalAmount.toLocaleString()}`,
        onClose: () => router.push('/(main)/(tabs)/tracking'),
      });
    } catch (error) {
      console.error('Order error:', error);
      setResultAlert({
        title: 'Order failed',
        message: error instanceof Error ? error.message : 'Failed to place order. Please try again.',
      });
    } finally {
      setOrdering(null);
      setSelectedProduct(null);
      setSelectedSlot(null);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userData = await storage.getUserData();
        setUser(userData?.user || null);

        const [productsData] = await Promise.all([orderAPI.getProducts(), fetchOrders()]);
        setProducts(productsData);

        try {
          const devicesRes = await getMyDevices();
          const firstDevice = devicesRes.success ? devicesRes.devices[0] : null;
          if (firstDevice) {
            const iotData = await getLatestIoTData(firstDevice.deviceId);
            if (iotData.success && iotData.data) {
              setTankLevel(iotData.data.tankLevel);
            }
          }
        } catch (iotError) {
          console.error('Error fetching IoT data:', iotError);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    connect().catch((error) => console.error('Failed to connect to socket:', error));
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const handleSystemNotification = (data: any) => {
      notificationService.handleSocketNotification(data);
    };
    onSystemNotification(handleSystemNotification);

    const handleOrderUpdate = (data: any) => {
      setOrders((prev) => prev.map((order) => {
        if (getOrderId(order) !== data.orderId) return order;
        const updated = { ...order };
        if (data.updateType === 'status-update' && data.data.status) {
          updated.status = data.data.status;
          notificationService.handleOrderNotification(order.orderNumber, data.data.status);
        }
        if (data.updateType === 'driver-assigned' && data.data.driver) {
          updated.driver = data.data.driver;
          notificationService.handleDriverAssignmentNotification(order.orderNumber, data.data.driver.name);
        }
        return updated;
      }));
    };

    const handleOrderStatusUpdate = (data: any) => {
      setOrders((prev) => prev.map((order) => {
        if (getOrderId(order) !== data.orderId) return order;
        notificationService.handleOrderNotification(order.orderNumber, data.status);
        return { ...order, status: data.status };
      }));
    };

    onOrderUpdate(handleOrderUpdate);
    onOrderStatusUpdate(handleOrderStatusUpdate);

    return () => {
      removeOrderUpdateListener(handleOrderUpdate);
      removeOrderStatusUpdateListener(handleOrderStatusUpdate);
    };
  }, [isConnected, onOrderUpdate, onOrderStatusUpdate, removeOrderUpdateListener, removeOrderStatusUpdateListener, onSystemNotification]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const openDrawer = () => router.push('/(main)/(tabs)/account');
  const openNotifications = () => router.push('/(main)/notifications');

  const ServiceCard = ({
    product, time, icon, color, onPress,
  }: { product: Product; time: string; icon: React.ReactNode; color: string; onPress: (product: Product) => void }) => {
    const isOrdering = ordering === product.type;
    const price = `Rs. ${product.unitPrice.toLocaleString()}`;
    return (
      <TouchableOpacity
        onPress={product.availability ? () => onPress(product) : undefined}
        disabled={!product.availability || isOrdering}
        activeOpacity={0.8}
      >
        <Card style={[styles.serviceCard, !product.availability && styles.serviceCardDisabled]}>
          <View style={styles.serviceContent}>
            <View style={[styles.serviceIcon, { backgroundColor: color + '1A' }]}>{icon}</View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceTitle}>{product.name}</Text>
              <Text style={styles.serviceVolume}>{product.size}</Text>
              <View style={styles.serviceDetails}>
                <Text style={styles.servicePrice}>{price}</Text>
                <Text style={styles.serviceTime}>• {time}</Text>
              </View>
            </View>
            <View style={styles.serviceRight}>
              <Badge
                label={isOrdering ? 'Ordering...' : product.availability ? 'Available' : 'Unavailable'}
                tone={product.availability ? 'success' : 'danger'}
              />
              {product.availability && !isOrdering && <ArrowRight size={20} color={colors.neutral[500]} />}
              {isOrdering && <ActivityIndicator size="small" color={colors.primary[500]} />}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral[0]} />
      <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {user?.name || 'Guest'}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Your water tank is at{' '}
            <Text style={styles.welcomeNumeric}>{tankLevel !== null ? `${tankLevel}%` : 'N/A'}</Text> capacity
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : hasActiveOrder ? (
          <View style={styles.activeSection}>
            <Text style={styles.sectionTitle}>Your Active Order</Text>
            {activeOrders.map((order) => (
              <ActiveOrderCard key={getOrderId(order)} order={order} />
            ))}
          </View>
        ) : (
          <>
            {tankLevel !== null && tankLevel <= 30 && (
              <Card style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <View style={styles.alertIconCircle}>
                    <AlertTriangle size={20} color={colors.warning[700]} />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertTitle}>Low Water Level</Text>
                    <Text style={styles.alertText}>Your tank is running low. Consider ordering a refill.</Text>
                  </View>
                  <Button
                    label="Order Now"
                    variant="warning"
                    size="sm"
                    onPress={() => {
                      if (products.length > 0) {
                        const smallTanker = products.find((p) => p.type === 'small_tanker') || products[0];
                        handleServiceSelect(smallTanker);
                      }
                    }}
                  />
                </View>
              </Card>
            )}

            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>Choose Your Service</Text>
              {products.map((product) => {
                let time = '15-30 min';
                let icon = <Droplets size={20} color={colors.info[500]} />;
                let color: string = colors.info[500];
                if (product.type === 'large_tanker') {
                  time = '45-60 min';
                  icon = <Truck size={24} color={colors.primary[500]} />;
                  color = colors.primary[500];
                } else if (product.type === 'small_tanker') {
                  time = '30-45 min';
                  icon = <Truck size={20} color={colors.success[500]} />;
                  color = colors.success[500];
                }
                return (
                  <ServiceCard key={product.type} product={product} time={time} icon={icon} color={color} onPress={handleServiceSelect} />
                );
              })}
            </View>

            <Card style={styles.expressCard}>
              <View style={styles.expressRow}>
                <View style={styles.expressIcon}>
                  <Zap size={24} color={colors.warning[500]} />
                </View>
                <View style={styles.expressContent}>
                  <Text style={styles.expressTitle}>Express Delivery</Text>
                  <Text style={styles.expressSubtitle}>Get water delivered within 1 hour</Text>
                </View>
                <View style={styles.expressPricing}>
                  <Text style={styles.expressPriceText}>+Rs. 300</Text>
                  <Badge label="Coming soon" tone="warning" />
                </View>
              </View>
            </Card>
          </>
        )}

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Order History</Text>
          {historyOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={40} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>Your completed orders will appear here</Text>
            </View>
          ) : (
            historyOrders.map((order) => <HistoryOrderCard key={getOrderId(order)} order={order} />)
          )}
        </View>
      </ScrollView>

      <AddressSelectionModal
        visible={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setSelectedProduct(null);
          setSelectedSlot(null);
        }}
        onSelectAddress={handleAddressSelected}
      />

      <Modal
        visible={showTimingModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowTimingModal(false);
          setSelectedProduct(null);
        }}
      >
        <View style={styles.timingModalOverlay}>
          <View style={styles.timingModalCard}>
            <Text style={styles.timingModalTitle}>When should we deliver?</Text>
            {selectedProduct && (
              <Text style={styles.timingModalSubtitle}>
                {selectedProduct.name} ({selectedProduct.size})
              </Text>
            )}
            {getDeliverySlots().map((slot) => (
              <TouchableOpacity key={slot.label} style={styles.timingSlot} onPress={() => handleSlotSelected(slot)}>
                <Clock size={18} color={colors.success[500]} />
                <Text style={styles.timingSlotText}>{slot.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.timingCancelButton}
              onPress={() => {
                setShowTimingModal(false);
                setSelectedProduct(null);
              }}
            >
              <Text style={styles.timingCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={!!resultAlert}
        title={resultAlert?.title || ''}
        message={resultAlert?.message || ''}
        onClose={() => {
          const onClose = resultAlert?.onClose;
          setResultAlert(null);
          onClose?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl - spacing.sm },
  welcomeSection: { paddingVertical: spacing.xxl },
  welcomeTitle: { fontFamily: typography.h1.fontFamily, fontSize: typography.h1.fontSize, color: colors.neutral[900], marginBottom: spacing.sm },
  welcomeSubtitle: { fontFamily: typography.body.fontFamily, fontSize: 16, color: colors.neutral[500] },
  welcomeNumeric: { fontFamily: typography.h3.fontFamily, color: colors.primary[600] },
  alertCard: { backgroundColor: colors.warning[50], borderColor: colors.warning[100], borderLeftWidth: 4, borderLeftColor: colors.warning[500], marginBottom: spacing.xxl },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
  alertIconCircle: { width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.warning[100], justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  alertContent: { flex: 1 },
  alertTitle: { fontFamily: typography.h3.fontFamily, fontSize: 14, color: colors.warning[700], marginBottom: 2 },
  alertText: { fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.warning[700] },
  servicesSection: { marginBottom: spacing.xxl },
  sectionTitle: { fontFamily: typography.h2.fontFamily, fontSize: typography.h2.fontSize, color: colors.neutral[900], marginBottom: spacing.lg },
  serviceCard: { marginBottom: spacing.md },
  serviceCardDisabled: { opacity: 0.6 },
  serviceContent: { flexDirection: 'row', alignItems: 'center' },
  serviceIcon: { width: 48, height: 48, borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center', marginRight: spacing.lg },
  serviceInfo: { flex: 1 },
  serviceTitle: { fontFamily: typography.h3.fontFamily, fontSize: typography.h3.fontSize, color: colors.neutral[900], marginBottom: 4 },
  serviceVolume: { fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.neutral[500], marginBottom: spacing.sm },
  serviceDetails: { flexDirection: 'row', alignItems: 'center' },
  servicePrice: { fontFamily: typography.numeric.fontFamily, fontSize: 16, color: colors.primary[600] },
  serviceTime: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[500], marginLeft: spacing.sm },
  serviceRight: { alignItems: 'flex-end', gap: spacing.sm },
  expressCard: { backgroundColor: colors.warning[50], borderColor: colors.warning[100], marginBottom: spacing.xxl },
  expressRow: { flexDirection: 'row', alignItems: 'center' },
  expressIcon: { width: 48, height: 48, borderRadius: radius.xl, backgroundColor: colors.warning[100], justifyContent: 'center', alignItems: 'center', marginRight: spacing.lg },
  expressContent: { flex: 1 },
  expressTitle: { fontFamily: typography.h3.fontFamily, fontSize: typography.h3.fontSize, color: colors.warning[700], marginBottom: 4 },
  expressSubtitle: { fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.warning[700] },
  expressPricing: { alignItems: 'flex-end', gap: spacing.xs },
  expressPriceText: { fontFamily: typography.numeric.fontFamily, fontSize: 14, color: colors.warning[700] },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl + spacing.sm },
  loadingText: { fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.neutral[500], marginTop: spacing.md },
  timingModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  timingModalCard: { backgroundColor: colors.neutral[0], borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, paddingBottom: spacing.xxxl + spacing.sm },
  timingModalTitle: { fontFamily: typography.h2.fontFamily, fontSize: typography.h2.fontSize, color: colors.neutral[900], marginBottom: 4 },
  timingModalSubtitle: { fontFamily: typography.body.fontFamily, fontSize: 14, color: colors.neutral[500], marginBottom: spacing.xl },
  timingSlot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.success[50], borderWidth: 1, borderColor: '#DCFCE7', borderRadius: radius.md, paddingVertical: spacing.lg - 2, paddingHorizontal: spacing.lg, marginBottom: spacing.sm + 2 },
  timingSlotText: { fontFamily: typography.body.fontFamily, fontSize: 15, color: colors.neutral[900] },
  timingCancelButton: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  timingCancelText: { fontFamily: typography.h3.fontFamily, fontSize: 15, color: colors.neutral[500] },

  activeSection: { marginBottom: spacing.xxl },
  activeCard: { gap: spacing.md },
  activeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  activeIconCircle: { width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  activeTitle: { fontFamily: typography.h3.fontFamily, fontSize: typography.h3.fontSize, color: colors.neutral[900] },
  activeOrderNumber: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  queueRow: { paddingVertical: spacing.sm },
  queueHeadline: { fontFamily: typography.h3.fontFamily, fontSize: 16, color: colors.neutral[900] },
  queueSubtext: { fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.neutral[500], marginTop: 2 },

  historySection: { marginTop: spacing.md },
  orderCard: { backgroundColor: colors.neutral[0], borderRadius: radius.lg, borderWidth: 1, borderColor: colors.neutral[200], padding: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderType: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderInfo: {},
  orderTitle: { fontFamily: typography.h3.fontFamily, fontSize: 14, color: colors.neutral[900] },
  orderVolume: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[500] },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderDetailText: { fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.neutral[500], flex: 1 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  orderPrice: { fontFamily: typography.numeric.fontFamily, fontSize: 15, color: colors.neutral[900] },

  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.sm },
  statusText: { fontFamily: typography.label.fontFamily, fontSize: 11 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.neutral[500], textAlign: 'center' },
});
