import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Droplets,
  Truck,
  Zap,
  ArrowRight,
  AlertTriangle,
  MapPin,
  Calendar,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderComponent from '@/app/components/Header';
import CustomAlert from '@/app/components/CustomAlert';
import { Card, Badge, Button } from '@/app/components/ui';
import TankCapsule from '@/app/components/graphics/TankCapsule';
import { storage, User } from '@/utils/auth';
import { orderAPI } from '@/utils/orderAPI';
import { getLatestIoTData, getMyDevices } from '@/utils/iotAPI';
import { Order, Product, QueueStatus, parseDate, getOrderId, ORDER_STATUS_LABEL } from '@/types/order';
import { orderStatusTone } from '@/app/components/ui/Badge';
import { useSocket } from '@/hooks/useSocket';
import { notificationService } from '@/utils/notificationService';
import { colors, radius, spacing, typography } from '@/theme';

const STATUS_LABEL = ORDER_STATUS_LABEL;

function timeOfDayGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

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

  const isOutForDelivery = (['going_to_filling_station', 'water_filled', 'on_the_way', 'arrived'] as const).includes(order.status as any);

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
        <Badge label={STATUS_LABEL[order.status] || order.status} tone={orderStatusTone(order.status)} />
      </View>

      {isOutForDelivery ? (
        <View style={styles.queueRow}>
          <Text style={styles.queueHeadline}>Your tanker is on the way</Text>
        </View>
      ) : queue && queue.position !== null ? (
        <View style={styles.queueRow}>
          <Text style={styles.queueHeadline}>You&apos;re #{queue.position} in line</Text>
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
    <Card onPress={() => router.push(`/(main)/order-details/${getOrderId(order)}`)} style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderType}>
          <Droplets size={18} color={colors.primary[500]} />
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>{getProductName(order.items[0]?.type || '')}</Text>
            <Text style={styles.orderVolume}>Qty {order.items[0]?.quantity || 1}</Text>
          </View>
        </View>
        <Badge label={STATUS_LABEL[order.status] || order.status} tone={orderStatusTone(order.status)} />
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
    </Card>
  );
}

export default function OrdersScreen() {
  const [tankLevel, setTankLevel] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);
  const [expressFee, setExpressFee] = useState(300);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    isConnected, connect, onSystemNotification,
    onOrderUpdate, onOrderStatusUpdate, removeOrderUpdateListener, removeOrderStatusUpdateListener,
  } = useSocket();

  const activeOrders = orders.filter((o) =>
    (['order_created', 'queued', 'driver_assigned', 'going_to_filling_station', 'water_filled', 'on_the_way', 'arrived'] as const).includes(o.status as any)
  );
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

  const goToOrder = (productType?: string) => {
    if (!user) {
      setLoginRequired(true);
      return;
    }
    router.push({ pathname: '/(main)/order', params: productType ? { productType } : {} });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const userData = await storage.getUserData();
        setUser(userData?.user || null);

        const [productsData] = await Promise.all([orderAPI.getProducts(), fetchOrders()]);
        setProducts(productsData);
        orderAPI.getExpressFee().then(setExpressFee);

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
    product, time, icon, color,
  }: { product: Product; time: string; icon: React.ReactNode; color: string }) => {
    const price = `Rs. ${product.unitPrice.toLocaleString()}`;
    return (
      <Card
        onPress={product.availability ? () => goToOrder(product.type) : undefined}
        style={[styles.serviceCard, !product.availability && styles.serviceCardDisabled]}
      >
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
              label={product.availability ? 'Available' : 'Unavailable'}
              tone={product.availability ? 'success' : 'danger'}
            />
            {product.availability && <ArrowRight size={20} color={colors.neutral[500]} />}
          </View>
        </View>
      </Card>
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
        <View style={styles.greetingRow}>
          <Text style={styles.greeting}>Good {timeOfDayGreeting()}</Text>
          <Text style={styles.greetingName}>{user?.name || 'Guest'}</Text>
        </View>

        <Card
          onPress={() => goToOrder()}
          padded={false}
          style={styles.heroCardWrap}
        >
          <LinearGradient colors={[colors.primary[500], colors.primary[700]]} style={styles.heroCard}>
            <View style={styles.heroText}>
              <Text style={styles.heroEyebrow}>MOST USED</Text>
              <Text style={styles.heroTitle}>Order a tanker</Text>
              <Text style={styles.heroSubtitle}>Usually arrives in 40–60 min</Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Truck size={24} color="#fff" strokeWidth={1.8} />
            </View>
          </LinearGradient>
        </Card>

        {!loading && (
          <Card onPress={() => router.push('/(main)/(tabs)/tank-monitoring')} style={styles.tankCard}>
            <TankCapsule level={tankLevel ?? 0} size={64} showLabel={false} />
            <View style={styles.tankInfo}>
              <Text style={styles.tankLabel}>Main tank</Text>
              <Text style={styles.tankHeadline}>
                {tankLevel === null ? 'No sensor data' : tankLevel > 50 ? 'Comfortable level' : 'Getting low'}
              </Text>
              <Text style={styles.tankSub}>
                {tankLevel !== null ? `${tankLevel}% full` : 'Connect a device to see live level'}
              </Text>
            </View>
          </Card>
        )}

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
                    onPress={() => goToOrder('small_tanker')}
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
                  <ServiceCard key={product.type} product={product} time={time} icon={icon} color={color} />
                );
              })}
            </View>

            <Card
              style={styles.expressCard}
              onPress={() => router.push({ pathname: '/(main)/order', params: { timing: 'express' } })}
            >
              <View style={styles.expressRow}>
                <View style={styles.expressIcon}>
                  <Zap size={24} color={colors.warning[500]} />
                </View>
                <View style={styles.expressContent}>
                  <Text style={styles.expressTitle}>Express Delivery</Text>
                  <Text style={styles.expressSubtitle}>Priority delivery, nearest available driver</Text>
                </View>
                <View style={styles.expressPricing}>
                  <Text style={styles.expressPriceText}>+Rs. {expressFee}</Text>
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

      <CustomAlert
        visible={loginRequired}
        title="Please log in"
        message="You need to be logged in to place an order."
        onClose={() => setLoginRequired(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl - spacing.sm },
  greetingRow: { paddingTop: spacing.xxl, paddingBottom: spacing.md },
  greeting: { fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.neutral[500] },
  greetingName: { fontFamily: typography.h1.fontFamily, fontSize: typography.h1.fontSize, color: colors.neutral[900], marginTop: 2 },
  heroCardWrap: { marginBottom: spacing.md, overflow: 'hidden', borderWidth: 0 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.xl,
  },
  heroText: { flex: 1 },
  heroEyebrow: { fontFamily: typography.label.fontFamily, fontSize: 11, color: colors.primary[50], letterSpacing: 0.4, marginBottom: 6 },
  heroTitle: { fontFamily: typography.h2.fontFamily, fontSize: 19, color: '#fff', marginBottom: 4 },
  heroSubtitle: { fontFamily: typography.body.fontFamily, fontSize: 12.5, color: colors.primary[50] },
  heroIconCircle: {
    width: 52, height: 52, borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: spacing.md,
  },
  tankCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  tankInfo: { flex: 1 },
  tankLabel: { fontFamily: typography.label.fontFamily, fontSize: 12, color: colors.neutral[500], marginBottom: 4 },
  tankHeadline: { fontFamily: typography.h3.fontFamily, fontSize: 15, color: colors.neutral[900], marginBottom: 4 },
  tankSub: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[500] },
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
