import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import {
  Droplets,
  Truck,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import AddressSelectionModal from '@/app/components/AddressSelectionModal';
import CustomAlert from '@/app/components/CustomAlert';
import { Card, Badge, Button } from '@/app/components/ui';
import { storage, User } from '@/utils/auth';
import { orderAPI } from '@/utils/orderAPI';
import { getLatestIoTData, getMyDevices } from '@/utils/iotAPI';
import { Product } from '@/types/order';
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

export default function DashboardScreen() {
  const [tankLevel, setTankLevel] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showTimingModal, setShowTimingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DeliverySlot | null>(null);
  const [resultAlert, setResultAlert] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isConnected, connect, onSystemNotification } = useSocket();

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
      const whenText = slot?.date ? ` for ${slot.label}` : '';

      setResultAlert({
        title: 'Order placed',
        message: `Your order #${order.orderNumber} has been placed${whenText}. Total: Rs. ${order.totalAmount.toLocaleString()}`,
        onClose: () => router.push('/(main)/(tabs)/orders'),
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

        const productsData = await orderAPI.getProducts();
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
        setResultAlert({ title: 'Something went wrong', message: 'Failed to load data. Please try again.' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    connect().catch((error) => {
      console.error('Failed to connect to socket:', error);
    });
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    const handleSystemNotification = (data: any) => {
      notificationService.handleSocketNotification(data);
    };

    onSystemNotification(handleSystemNotification);

    return () => {
      // Note: the useSocket hook doesn't expose a remove-listener for
      // system notifications yet -- unchanged from prior behavior.
    };
  }, [isConnected, onSystemNotification]);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };

  const ServiceCard = ({
    product,
    time,
    icon,
    color,
    onPress,
  }: {
    product: Product;
    time: string;
    icon: React.ReactNode;
    color: string;
    onPress: (product: Product) => void;
  }) => {
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

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {user?.name || 'Guest'}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Your water tank is at{' '}
            <Text style={styles.welcomeNumeric}>{tankLevel !== null ? `${tankLevel}%` : 'N/A'}</Text> capacity
          </Text>
        </View>

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

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : (
            products.map((product) => {
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
            })
          )}
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

        <TouchableOpacity onPress={() => router.push('/(main)/schedule')} activeOpacity={0.8}>
          <Card style={styles.scheduleCard}>
            <View style={styles.scheduleRow}>
              <View style={styles.scheduleIcon}>
                <Clock size={24} color={colors.success[500]} />
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>Auto-Order Schedule</Text>
                <Text style={styles.scheduleSubtitle}>Automatically order when tank level drops</Text>
              </View>
              <ArrowRight size={20} color={colors.success[500]} />
            </View>
          </Card>
        </TouchableOpacity>

        <View style={styles.recommendedSection}>
          <View style={styles.recommendedHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TrendingUp size={20} color={colors.primary[500]} />
          </View>

          <Card style={styles.recommendedCard}>
            <View style={styles.recommendedRow}>
              <View style={styles.recommendedContent}>
                <Text style={styles.recommendedTitle}>Weekly Large Tanker</Text>
                <Text style={styles.recommendedSubtitle}>Based on your usage pattern</Text>
              </View>
              <Button label="Schedule" variant="primary" size="sm" onPress={() => router.push('/(main)/schedule')} />
            </View>
          </Card>
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
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl - spacing.sm,
  },
  welcomeSection: {
    paddingVertical: spacing.xxl,
  },
  welcomeTitle: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    color: colors.neutral[500],
  },
  welcomeNumeric: {
    fontFamily: typography.h3.fontFamily,
    color: colors.primary[600],
  },
  alertCard: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[100],
    borderLeftWidth: 4,
    borderLeftColor: colors.warning[500],
    marginBottom: spacing.xxl,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.warning[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 14,
    color: colors.warning[700],
    marginBottom: 2,
  },
  alertText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.warning[700],
  },
  servicesSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.neutral[900],
    marginBottom: spacing.lg,
  },
  serviceCard: {
    marginBottom: spacing.md,
  },
  serviceCardDisabled: {
    opacity: 0.6,
  },
  serviceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  serviceVolume: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontFamily: typography.numeric.fontFamily,
    fontSize: 16,
    color: colors.primary[600],
  },
  serviceTime: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.neutral[500],
    marginLeft: spacing.sm,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  expressCard: {
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[100],
    marginBottom: spacing.xxl,
  },
  expressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expressIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.warning[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  expressContent: {
    flex: 1,
  },
  expressTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    color: colors.warning[700],
    marginBottom: 4,
  },
  expressSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.warning[700],
  },
  expressPricing: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  expressPriceText: {
    fontFamily: typography.numeric.fontFamily,
    fontSize: 14,
    color: colors.warning[700],
  },
  scheduleCard: {
    backgroundColor: colors.success[50],
    borderColor: colors.success[100],
    marginBottom: spacing.xxl,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.neutral[0],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    color: colors.success[700],
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.success[700],
  },
  recommendedSection: {
    marginBottom: spacing.xxl,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  recommendedCard: {
    backgroundColor: colors.neutral[50],
    borderColor: colors.neutral[200],
  },
  recommendedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendedContent: {
    flex: 1,
  },
  recommendedTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  recommendedSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.neutral[500],
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl + spacing.sm,
  },
  loadingText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: spacing.md,
  },
  timingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  timingModalCard: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xxl,
    paddingBottom: spacing.xxxl + spacing.sm,
  },
  timingModalTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.neutral[900],
    marginBottom: 4,
  },
  timingModalSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: spacing.xl,
  },
  timingSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: radius.md,
    paddingVertical: spacing.lg - 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm + 2,
  },
  timingSlotText: {
    fontFamily: typography.body.fontFamily,
    fontSize: 15,
    color: colors.neutral[900],
  },
  timingCancelButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  timingCancelText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    color: colors.neutral[500],
  },
});
