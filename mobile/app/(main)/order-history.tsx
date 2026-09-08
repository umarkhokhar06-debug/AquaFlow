import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Calendar, Droplets, CircleCheck as CheckCircle } from 'lucide-react-native';
import { ScreenHeader, Card, Badge } from '@/app/components/ui';
import { orderStatusTone } from '@/app/components/ui/Badge';
import { orderAPI } from '@/utils/orderAPI';
import { Order, parseDate, getOrderId, ORDER_STATUS_LABEL } from '@/types/order';
import { colors, radius, spacing, typography } from '@/theme';

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
        <Badge label={ORDER_STATUS_LABEL[order.status] || order.status} tone={orderStatusTone(order.status)} />
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

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await orderAPI.getMyOrders();
        setOrders(data);
      } catch (error) {
        console.error('Error fetching order history:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const historyOrders = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Order History" tone="gradient" onBack={() => router.back()} />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {historyOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={40} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>Your completed orders will appear here</Text>
            </View>
          ) : (
            historyOrders.map((order) => <HistoryOrderCard key={getOrderId(order)} order={order} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
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
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.neutral[500], textAlign: 'center' },
});
