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
  Truck,
  Zap,
  AlertTriangle,
  Check,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import HeaderComponent from '@/app/components/Header';
import CustomAlert from '@/app/components/CustomAlert';
import { Card, Badge, Button } from '@/app/components/ui';
import CircularGauge from '@/app/components/graphics/CircularGauge';
import { storage, User } from '@/utils/auth';
import { orderAPI } from '@/utils/orderAPI';
import { getLatestIoTData, getMyDevices } from '@/utils/iotAPI';
import { Order, QueueStatus, getOrderId, ORDER_STATUS_LABEL } from '@/types/order';
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
        onPress={() => router.push('/(main)/tracking')}
      />
    </Card>
  );
}

export default function OrdersScreen() {
  const [tankLevel, setTankLevel] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
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

        await fetchOrders();
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

  const openDrawer = () => router.push('/(main)/account');
  const openNotifications = () => router.push('/(main)/notifications');

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
          <Card onPress={() => router.push('/(main)/tank-monitoring')} padded={false} style={styles.tankCardWrap}>
            <LinearGradient colors={[colors.primary[700], colors.primary[600]]} style={styles.tankCard}>
              <CircularGauge level={tankLevel ?? 0} size={72} strokeWidth={7} />
              <View style={styles.tankInfo}>
                <Text style={styles.tankLabel}>Your Tank Level</Text>
                <Text style={styles.tankSub}>
                  {tankLevel !== null ? 'Live reading from your sensor' : 'Connect a device to see live level'}
                </Text>
                {tankLevel !== null && (
                  <View style={[styles.tankBadge, tankLevel <= 30 && styles.tankBadgeLow]}>
                    {tankLevel <= 30 ? (
                      <AlertTriangle size={11} color={colors.accent[500]} />
                    ) : (
                      <Check size={11} color={colors.primary[300]} strokeWidth={3} />
                    )}
                    <Text style={[styles.tankBadgeText, tankLevel <= 30 && styles.tankBadgeTextLow]}>
                      {tankLevel <= 30 ? 'Getting low' : 'Healthy level'}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
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
  tankCardWrap: { marginBottom: spacing.xl, overflow: 'hidden', borderWidth: 0 },
  tankCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  tankInfo: { flex: 1 },
  tankLabel: { fontFamily: typography.h3.fontFamily, fontSize: 14, color: colors.neutral[0], marginBottom: 4 },
  tankSub: { fontFamily: typography.caption.fontFamily, fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: spacing.sm, lineHeight: 15 },
  tankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(111,214,201,0.16)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  tankBadgeLow: { backgroundColor: 'rgba(240,167,59,0.16)' },
  tankBadgeText: { fontFamily: typography.label.fontFamily, fontSize: 10, color: colors.primary[300] },
  tankBadgeTextLow: { color: colors.accent[500] },
  alertCard: { backgroundColor: colors.warning[50], borderColor: colors.warning[100], borderLeftWidth: 4, borderLeftColor: colors.warning[500], marginBottom: spacing.xxl },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
  alertIconCircle: { width: 40, height: 40, borderRadius: radius.xl, backgroundColor: colors.warning[100], justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  alertContent: { flex: 1 },
  alertTitle: { fontFamily: typography.h3.fontFamily, fontSize: 14, color: colors.warning[700], marginBottom: 2 },
  alertText: { fontFamily: typography.body.fontFamily, fontSize: 12, color: colors.warning[700] },
  sectionTitle: { fontFamily: typography.h2.fontFamily, fontSize: typography.h2.fontSize, color: colors.neutral[900], marginBottom: spacing.lg },
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

});
