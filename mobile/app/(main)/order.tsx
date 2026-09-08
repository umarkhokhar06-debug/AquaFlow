import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, Zap, Check, Banknote, CreditCard, Smartphone } from 'lucide-react-native';
import { ScreenHeader, Card, Button } from '@/app/components/ui';
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

// Fixed hourly slots, 9am-7pm with a 1-2pm break -- mirrors the server-side
// source of truth in backend/src/constants/scheduleSlots.js. Kept as a
// separate local copy (no shared package between mobile and backend); the
// backend re-validates on submit regardless.
const BOOKABLE_START_HOURS = [9, 10, 11, 12, 14, 15, 16, 17, 18];
const SCHEDULING_WINDOW_DAYS = 30;
const MIN_LEAD_TIME_MS = 30 * 60 * 1000;

function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

function getBookableDates(): Date[] {
  const now = new Date();
  const dates: Date[] = [];
  for (let i = 0; i < SCHEDULING_WINDOW_DAYS; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    dates.push(d);
  }
  return dates;
}

function formatDateLabel(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getBookableSlotsForDate(date: Date): ScheduleSlot[] {
  const now = new Date();
  return BOOKABLE_START_HOURS.map((hour) => {
    const slotDate = new Date(date);
    slotDate.setHours(hour, 0, 0, 0);
    return { label: `${formatHourLabel(hour)} – ${formatHourLabel(hour + 1)}`, date: slotDate };
  }).filter((slot) => slot.date.getTime() - now.getTime() > MIN_LEAD_TIME_MS);
}

const PRODUCT_META: Record<string, { eta: string }> = {
  large_tanker: { eta: '45-60 min' },
  small_tanker: { eta: '30-45 min' },
  water_bottles: { eta: '15-30 min' },
};

export default function OrderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { productType, timing: initialTiming } = useLocalSearchParams<{ productType?: string; timing?: string }>();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(productType ?? null);
  const [timing, setTiming] = useState<'standard' | 'schedule' | 'express'>(
    initialTiming === 'express' ? 'express' : 'standard'
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [expressFee, setExpressFee] = useState(300);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultAlert, setResultAlert] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  const [orderNotes, setOrderNotes] = useState('');

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
    orderAPI.getExpressFee().then(setExpressFee);
    storage.getPaymentPreference().then((pref) => {
      if (pref === 'card') setPaymentMethod('card');
      else if (pref === 'wallet') setPaymentMethod('online');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = products.find((p) => p.type === selectedType) || null;
  const total = (selectedProduct?.unitPrice ?? 0) + (timing === 'express' ? expressFee : 0);
  const canConfirm = !!selectedProduct && !!selectedAddress && (timing !== 'schedule' || !!selectedSlot);

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
        notes: orderNotes.trim() || `Direct order for ${selectedProduct.name}`,
        ...(timing === 'schedule' && selectedSlot
          ? { deliveryType: 'scheduled' as const, scheduledFor: selectedSlot.date.toISOString() }
          : timing === 'express'
          ? { deliveryType: 'immediate' as const, isExpress: true }
          : { deliveryType: 'immediate' as const }),
      };

      const order = await orderAPI.createOrder(orderData);
      const whenText =
        timing === 'schedule' && selectedSlot
          ? ` for ${formatDateLabel(selectedDate ?? selectedSlot.date)}, ${selectedSlot.label}`
          : timing === 'express'
          ? ' (express delivery)'
          : '';

      setResultAlert({
        title: 'Order placed',
        message: `Your order #${order.orderNumber} has been placed${whenText}. Total: Rs. ${order.totalAmount.toLocaleString()}`,
        onClose: () => router.replace('/(main)/tracking'),
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
              <Card
                onPress={() => setTiming('express')}
                padded={false}
                style={[styles.timingCard, timing === 'express' && styles.timingCardSelectedExpress]}
              >
                <Zap size={16} color={timing === 'express' ? colors.warning[700] : colors.neutral[400]} />
                <Text style={[styles.timingTitle, timing === 'express' && styles.timingTitleSelectedExpress]}>Express</Text>
                <Text style={styles.timingSub}>+Rs {expressFee}</Text>
              </Card>
            </View>

            {timing === 'express' && (
              <View style={styles.expressNote}>
                <Zap size={14} color={colors.warning[700]} />
                <Text style={styles.expressNoteText}>
                  Priority delivery. We'll assign the nearest available driver right away.
                </Text>
              </View>
            )}

            {timing === 'schedule' && (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateRow} contentContainerStyle={styles.dateRowContent}>
                  {getBookableDates().map((date) => {
                    const selected = selectedDate?.toDateString() === date.toDateString();
                    return (
                      <Card
                        key={date.toISOString()}
                        onPress={() => {
                          setSelectedDate(date);
                          setSelectedSlot(null);
                        }}
                        padded={false}
                        style={[styles.dateChip, selected && styles.dateChipSelected]}
                      >
                        <Text style={[styles.dateChipText, selected && styles.dateChipTextSelected]}>
                          {formatDateLabel(date)}
                        </Text>
                      </Card>
                    );
                  })}
                </ScrollView>

                {selectedDate && (
                  <View style={styles.scheduleList}>
                    {getBookableSlotsForDate(selectedDate).map((slot) => {
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
                    {getBookableSlotsForDate(selectedDate).length === 0 && (
                      <Text style={styles.noSlotsText}>No more slots available for this date.</Text>
                    )}
                  </View>
                )}
              </>
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

            <Text style={styles.sectionLabel}>Payment method</Text>
            <View style={styles.paymentRow}>
              <Card
                onPress={() => setPaymentMethod('cash')}
                padded={false}
                style={[styles.paymentCard, paymentMethod === 'cash' && styles.paymentCardSelected]}
              >
                <Banknote size={16} color={paymentMethod === 'cash' ? colors.primary[600] : colors.neutral[400]} />
                <Text style={[styles.paymentTitle, paymentMethod === 'cash' && styles.paymentTitleSelected]}>Cash</Text>
                <Text style={styles.paymentSub}>On delivery</Text>
              </Card>
              <Card
                onPress={() => setPaymentMethod('card')}
                padded={false}
                style={[styles.paymentCard, paymentMethod === 'card' && styles.paymentCardSelected]}
              >
                <CreditCard size={16} color={paymentMethod === 'card' ? colors.primary[600] : colors.neutral[400]} />
                <Text style={[styles.paymentTitle, paymentMethod === 'card' && styles.paymentTitleSelected]}>Card</Text>
                <Text style={styles.paymentSub}>Coming soon</Text>
              </Card>
              <Card
                onPress={() => setPaymentMethod('online')}
                padded={false}
                style={[styles.paymentCard, paymentMethod === 'online' && styles.paymentCardSelected]}
              >
                <Smartphone size={16} color={paymentMethod === 'online' ? colors.primary[600] : colors.neutral[400]} />
                <Text style={[styles.paymentTitle, paymentMethod === 'online' && styles.paymentTitleSelected]}>Wallet</Text>
                <Text style={styles.paymentSub}>Coming soon</Text>
              </Card>
            </View>
            {paymentMethod !== 'cash' && (
              <View style={styles.expressNote}>
                <Text style={styles.expressNoteText}>
                  Online payments aren't active yet -- your order will still be placed, but pay the driver in cash on delivery for now.
                </Text>
              </View>
            )}

            <Text style={styles.sectionLabel}>Order notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Anything the driver should know -- gate code, preferred time, etc."
              placeholderTextColor={colors.neutral[400]}
              value={orderNotes}
              onChangeText={setOrderNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.bottomBarRow}>
              <Text style={styles.bottomBarNote} numberOfLines={1}>
                {timing === 'schedule' && selectedSlot
                  ? `${formatDateLabel(selectedDate ?? selectedSlot.date)}, ${selectedSlot.label}`
                  : timing === 'express'
                  ? `Express · +Rs ${expressFee}`
                  : 'Standard delivery'}
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
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sizeCard: {
    flexGrow: 1,
    flexBasis: '30%',
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
  timingCardSelectedExpress: { borderColor: colors.warning[500], backgroundColor: colors.warning[100] },
  timingTitle: { fontFamily: typography.h3.fontFamily, fontSize: 12.5, color: colors.neutral[900] },
  timingTitleSelected: { color: colors.primary[700] },
  timingTitleSelectedExpress: { color: colors.warning[700] },
  timingSub: { fontFamily: typography.caption.fontFamily, fontSize: 10.5, color: colors.neutral[500] },
  expressNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warning[50],
  },
  expressNoteText: { flex: 1, fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.warning[700] },
  dateRow: { marginTop: spacing.sm },
  dateRowContent: { gap: spacing.sm, paddingRight: spacing.lg },
  dateChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderColor: colors.neutral[200],
  },
  dateChipSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  dateChipText: { fontFamily: typography.bodyMed.fontFamily, fontSize: 13, color: colors.neutral[900] },
  dateChipTextSelected: { color: colors.primary[700] },
  scheduleList: { gap: spacing.sm, marginTop: spacing.sm },
  scheduleSlot: { borderColor: colors.neutral[200] },
  scheduleSlotSelected: { borderColor: colors.primary[500], backgroundColor: colors.primary[50] },
  scheduleSlotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scheduleSlotText: { fontFamily: typography.bodyMed.fontFamily, fontSize: 14, color: colors.neutral[900] },
  noSlotsText: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[400], textAlign: 'center', paddingVertical: spacing.md },
  addressCard: { borderColor: colors.neutral[200] },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addressText: { flex: 1, fontFamily: typography.bodyMed.fontFamily, fontSize: 14, color: colors.neutral[900] },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  paymentCard: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderColor: colors.neutral[200],
    gap: 4,
  },
  paymentCardSelected: { borderColor: colors.primary[300], backgroundColor: colors.primary[100] },
  paymentTitle: { fontFamily: typography.h3.fontFamily, fontSize: 12.5, color: colors.neutral[900] },
  paymentTitleSelected: { color: colors.primary[700] },
  paymentSub: { fontFamily: typography.caption.fontFamily, fontSize: 10.5, color: colors.neutral[500] },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 72,
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
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
