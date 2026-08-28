import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, Zap, Check } from 'lucide-react-native';
import { ScreenHeader, Card, Button, Badge } from '@/app/components/ui';
import AddressSelectionModal from '@/app/components/AddressSelectionModal';
import CustomAlert from '@/app/components/CustomAlert';
import { orderAPI } from '@/utils/orderAPI';
import { storage } from '@/utils/auth';
import { Product } from '@/types/order';
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

interface ScheduleSlot {
  label: string;
  date: Date;
}

function getScheduleSlots(): ScheduleSlot[] {
  const now = new Date();
  const slots: ScheduleSlot[] = [];

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

const PRODUCT_META: Record<string, { eta: string }> = {
  large_tanker: { eta: '45-60 min' },
  small_tanker: { eta: '30-45 min' },
  water_bottles: { eta: '15-30 min' },
};

export default function OrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { productType } = useLocalSearchParams<{ productType?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(productType ?? null);
  const [timing, setTiming] = useState<'standard' | 'schedule'>('standard');
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultAlert, setResultAlert] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');

  useEffect(() => {
    (async () => {
      try {
        const data = await orderAPI.getProducts();
        setProducts(data);
        if (!selectedType && data.length > 0) setSelectedType(data[0].type);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    })();
    storage.getPaymentPreference().then((pref) => {
      if (pref === 'card') setPaymentMethod('card');
      else if (pref === 'wallet') setPaymentMethod('online');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = products.find((p) => p.type === selectedType) || null;
  const total = selectedProduct?.unitPrice ?? 0;
  const canConfirm = !!selectedProduct && !!selectedAddress && (timing === 'standard' || !!selectedSlot);

  const handleConfirm = async () => {
    if (!selectedProduct || !selectedAddress) return;
    setSubmitting(true);
    try {
      const orderData = {
        items: [{ type: selectedProduct.type, quantity: 1 }],
        deliveryAddress: {
          fullName: selectedAddress.fullName,
          houseNumber: selectedAddress.houseNumber,
          portion: selectedAddress.portion,
          address: selectedAddress.address,
          phoneNumber: selectedAddress.phoneNumber,
          specialInstructions: selectedAddress.landmark
            ? `Landmark: ${selectedAddress.landmark}`
            : 'Please deliver to the address provided',
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        },
        paymentMethod,
        notes: `Direct order for ${selectedProduct.name}`,
        ...(timing === 'schedule' && selectedSlot
          ? { deliveryType: 'scheduled' as const, scheduledFor: selectedSlot.date.toISOString() }
          : { deliveryType: 'immediate' as const }),
      };

      const order = await orderAPI.createOrder(orderData);
      const whenText = timing === 'schedule' && selectedSlot ? ` for ${selectedSlot.label}` : '';

      setResultAlert({
        title: 'Order placed',
        message: `Your order #${order.orderNumber} has been placed${whenText}. Total: Rs. ${order.totalAmount.toLocaleString()}`,
        onClose: () => router.replace('/(main)/(tabs)/tracking'),
      });
    } catch (error) {
      console.error('Order error:', error);
      setResultAlert({
        title: 'Order failed',
        message: error instanceof Error ? error.message : 'Failed to place order. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Order a tanker" tone="gradient" onBack={() => router.back()} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Choose size</Text>
            <View style={styles.sizeRow}>
              {products.map((p) => {
                const selected = p.type === selectedType;
                return (
                  <Card
                    key={p.type}
                    onPress={() => setSelectedType(p.type)}
                    padded={false}
                    style={[styles.sizeCard, selected && styles.sizeCardSelected]}
                  >
                    <Text style={[styles.sizeTitle, selected && styles.sizeTitleSelected]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.sizeVolume} numberOfLines={1}>{p.size}</Text>
                    <Text style={styles.sizePrice}>Rs {p.unitPrice.toLocaleString()}</Text>
                  </Card>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>When</Text>
            <View style={styles.timingRow}>
              <Card
                onPress={() => setTiming('standard')}
                padded={false}
                style={[styles.timingCard, timing === 'standard' && styles.timingCardSelected]}
              >
                <Clock size={16} color={timing === 'standard' ? colors.primary[600] : colors.neutral[400]} />
                <Text style={[styles.timingTitle, timing === 'standard' && styles.timingTitleSelected]}>Standard</Text>
                <Text style={styles.timingSub}>{selectedProduct ? PRODUCT_META[selectedProduct.type]?.eta : ''}</Text>
              </Card>
              <Card
                onPress={() => setTiming('schedule')}
                padded={false}
                style={[styles.timingCard, timing === 'schedule' && styles.timingCardSelected]}
              >
                <Calendar size={16} color={timing === 'schedule' ? colors.primary[600] : colors.neutral[400]} />
                <Text style={[styles.timingTitle, timing === 'schedule' && styles.timingTitleSelected]}>Schedule</Text>
                <Text style={styles.timingSub}>Pick a time</Text>
              </Card>
              <View style={[styles.timingCard, styles.timingCardDisabled]}>
                <Zap size={16} color={colors.neutral[400]} />
                <Text style={styles.timingTitleDisabled}>Express</Text>
                <Badge label="Soon" tone="warning" />
              </View>
            </View>

            {timing === 'schedule' && (
              <View style={styles.scheduleList}>
                {getScheduleSlots().map((slot) => {
                  const selected = selectedSlot?.label === slot.label;
                  return (
                    <Card
                      key={slot.label}
                      onPress={() => setSelectedSlot(slot)}
                      style={[styles.scheduleSlot, selected && styles.scheduleSlotSelected]}
                    >
                      <View style={styles.scheduleSlotRow}>
                        <Text style={styles.scheduleSlotText}>{slot.label}</Text>
                        {selected && <Check size={16} color={colors.primary[600]} strokeWidth={3} />}
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}

            <Text style={styles.sectionLabel}>Delivery address</Text>
            <Card onPress={() => setShowAddressModal(true)} style={styles.addressCard}>
              <View style={styles.addressRow}>
                <MapPin size={16} color={colors.primary[500]} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {selectedAddress ? selectedAddress.address : 'Select delivery address'}
                </Text>
              </View>
            </Card>
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.bottomBarRow}>
              <Text style={styles.bottomBarNote} numberOfLines={1}>
                {timing === 'schedule' && selectedSlot ? selectedSlot.label : 'Standard delivery'}
              </Text>
              <Text style={styles.bottomBarPrice}>Rs {total.toLocaleString()}</Text>
            </View>
            <Button
              label={submitting ? 'Placing order…' : 'Confirm order'}
              onPress={handleConfirm}
              disabled={!canConfirm || submitting}
              loading={submitting}
              size="lg"
              style={styles.confirmButton}
            />
          </View>
        </>
      )}

      <AddressSelectionModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelectAddress={(address: SelectedAddress) => {
          setSelectedAddress(address);
          setShowAddressModal(false);
        }}
      />

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
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12.5,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  sizeRow: { flexDirection: 'row', gap: spacing.sm },
  sizeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
    borderColor: colors.neutral[200],
  },
  sizeCardSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  sizeTitle: { fontFamily: typography.h3.fontFamily, fontSize: 13, color: colors.neutral[900] },
  sizeTitleSelected: { color: colors.primary[700] },
  sizeVolume: { fontFamily: typography.caption.fontFamily, fontSize: 11, color: colors.neutral[500], marginTop: 2 },
  sizePrice: { fontFamily: typography.numeric.fontFamily, fontSize: 12, color: colors.primary[600], marginTop: spacing.sm },
  timingRow: { flexDirection: 'row', gap: spacing.sm },
  timingCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderColor: colors.neutral[200],
    gap: 4,
  },
  timingCardSelected: { borderColor: colors.primary[300], backgroundColor: colors.primary[100] },
  timingCardDisabled: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.lg,
    backgroundColor: colors.neutral[50],
    gap: 4,
    opacity: 0.7,
  },
  timingTitle: { fontFamily: typography.h3.fontFamily, fontSize: 12.5, color: colors.neutral[900] },
  timingTitleSelected: { color: colors.primary[700] },
  timingTitleDisabled: { fontFamily: typography.h3.fontFamily, fontSize: 12.5, color: colors.neutral[400] },
  timingSub: { fontFamily: typography.caption.fontFamily, fontSize: 10.5, color: colors.neutral[500] },
  scheduleList: { gap: spacing.sm, marginTop: spacing.sm },
  scheduleSlot: { borderColor: colors.neutral[200] },
  scheduleSlotSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  scheduleSlotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleSlotText: { fontFamily: typography.bodyMed.fontFamily, fontSize: 14, color: colors.neutral[900] },
  addressCard: { borderColor: colors.neutral[200] },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressText: { flex: 1, fontFamily: typography.bodyMed.fontFamily, fontSize: 14, color: colors.neutral[900] },
  bottomBar: {
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  bottomBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: spacing.md },
  bottomBarNote: { flex: 1, fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[500] },
  bottomBarPrice: { fontFamily: typography.h1.fontFamily, fontSize: 20, color: colors.neutral[900] },
  confirmButton: { width: '100%' },
});
