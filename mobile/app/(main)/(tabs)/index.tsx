import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { 
  Menu, 
  Bell, 
  Droplets, 
  Truck, 
  Clock, 
  TrendingUp, 
  Zap, 
  CircleCheck as CheckCircle, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react-native';
import { globalstyles } from '@/app/commans/style';
import HeaderComponent from '@/app/components/Header';
import AddressSelectionModal from '@/app/components/AddressSelectionModal';
import { storage, User } from '@/utils/auth';
import { orderAPI } from '@/utils/orderAPI';
import { getLatestIoTData, getMyDevices } from '@/utils/iotAPI';
import { Product } from '@/types/order';
import { useSocket } from '@/hooks/useSocket';
import { notificationService } from '@/utils/notificationService';

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

export default function DashboardScreen() {
  const [tankLevel, setTankLevel] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isConnected, connect, onSystemNotification } = useSocket();

  const handleServiceSelect = async (product: Product) => {
    if (!user) {
      Alert.alert('Error', 'Please login to place an order');
      return;
    }

    if (!product.availability) {
      Alert.alert('Unavailable', 'This service is currently unavailable');
      return;
    }

    const price = `Rs. ${product.unitPrice.toLocaleString()}`;
    
    Alert.alert(
      'Order Confirmation',
      `You selected ${product.name} (${product.size}) for ${price}. Would you like to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Order Now', 
          onPress: () => {
            setSelectedProduct(product);
            setShowAddressModal(true);
          } 
        }
      ]
    );
  };

  const handleAddressSelected = (address: SelectedAddress) => {
    setSelectedAddress(address);
    setShowAddressModal(false);
    
    // Proceed with order after address is selected
    if (selectedProduct) {
      handleDirectOrder(selectedProduct, address);
    }
  };

  const handleDirectOrder = async (product: Product, address: SelectedAddress) => {
    if (!user) return;

    setOrdering(product.type);
    
    try {
      // Create order with selected address
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
          longitude: address.longitude
        },
        paymentMethod: 'cash' as const,
        notes: `Direct order for ${product.name}`
      };

      const order = await orderAPI.createOrder(orderData);
      
      Alert.alert(
        'Order Placed Successfully!',
        `Your order #${order.orderNumber} has been placed. Total: Rs. ${order.totalAmount.toLocaleString()}`,
        [
          { text: 'View Orders', onPress: () => router.push('/(main)/(tabs)/orders') },
          { text: 'Continue Shopping', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Order error:', error);
      Alert.alert(
        'Order Failed',
        error instanceof Error ? error.message : 'Failed to place order. Please try again.'
      );
    } finally {
      setOrdering(null);
      setSelectedProduct(null);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user data
        const userData = await storage.getUserData();
        setUser(userData?.user || null);
        
        // Fetch products
        const productsData = await orderAPI.getProducts();
        setProducts(productsData);
        
        // Fetch tank level for the user's first accessible device
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
        Alert.alert('Error', 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Connect to socket
    connect().catch(error => {
      console.error('Failed to connect to socket:', error);
    });
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    if (!isConnected) return;

    // Handle system notifications
    const handleSystemNotification = (data: any) => {
      console.log('System notification received:', data);
      notificationService.handleSocketNotification(data);
    };

    // Register listener
    onSystemNotification(handleSystemNotification);

    // Cleanup listener on unmount
    return () => {
      // Note: We don't have removeSystemNotificationListener in the current hook
      // This would need to be added to the hook if we want proper cleanup
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
    onPress 
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
        style={[styles.serviceCard, !product.availability && styles.serviceCardDisabled]} 
        onPress={product.availability ? () => onPress(product) : undefined}
        disabled={!product.availability || isOrdering}
      >
        <View style={styles.serviceContent}>
          <View style={[styles.serviceIcon, { backgroundColor: color + '20' }]}>
            {icon}
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{product.name}</Text>
            <Text style={styles.serviceVolume}>{product.size}</Text>
            <View style={styles.serviceDetails}>
              <Text style={styles.servicePrice}>{price}</Text>
              <Text style={styles.serviceTime}>• {time}</Text>
            </View>
          </View>
          <View style={styles.serviceRight}>
            <View style={[
              styles.availabilityBadge, 
              { backgroundColor: product.availability ? '#10B981' : '#EF4444' }
            ]}>
              <Text style={styles.availabilityText}>
                {isOrdering ? 'Ordering...' : product.availability ? 'Available' : 'Unavailable'}
              </Text>
            </View>
            {product.availability && !isOrdering && <ArrowRight size={20} color="#6B7280" />}
            {isOrdering && <ActivityIndicator size="small" color="#007AFF" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[globalstyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {user?.name || 'Guest'}!</Text>
          <Text style={styles.welcomeSubtitle}>Your water tank is at {tankLevel !== null ? tankLevel : 'N/A'}% capacity</Text>
        </View>

        {/* Low Water Alert */}
        {tankLevel !== null && tankLevel <= 30 && (
          <View style={styles.alertCard}>
            <View style={styles.alertIcon}>
              <AlertTriangle size={20} color="#F59E0B" />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Low Water Level</Text>
              <Text style={styles.alertText}>
                Your tank is running low. Consider ordering a refill.
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.orderNowButton}
              onPress={() => {
                // Trigger auto-order flow
                if (products.length > 0) {
                  const smallTanker = products.find(p => p.type === 'small_tanker') || products[0];
                  handleServiceSelect(smallTanker);
                }
              }}
            >
              <Text style={styles.orderNowButtonText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Choose Your Service */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Choose Your Service</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : (
            products.map((product) => {
              let time = '15-30 min';
              let icon = <Droplets size={20} color="#8B5CF6" />;
              let color = '#8B5CF6';
              
              if (product.type === 'large_tanker') {
                time = '45-60 min';
                icon = <Truck size={24} color="#007AFF" />;
                color = '#007AFF';
              } else if (product.type === 'small_tanker') {
                time = '30-45 min';
                icon = <Truck size={20} color="#10B981" />;
                color = '#10B981';
              }
              
              return (
                <ServiceCard
                  key={product.type}
                  product={product}
                  time={time}
                  icon={icon}
                  color={color}
                  onPress={handleServiceSelect}
                />
              );
            })
          )}
        </View>

        {/* Express Delivery */}
        <View style={styles.expressSection}>
          <TouchableOpacity style={styles.expressCard}>
            <View style={styles.expressIcon}>
              <Zap size={24} color="#F59E0B" />
            </View>
            <View style={styles.expressContent}>
              <Text style={styles.expressTitle}>Express Delivery</Text>
              <Text style={styles.expressSubtitle}>Get water delivered within 1 hour</Text>
            </View>
            <View style={styles.expressPricing}>
              <Text style={styles.expressPriceText}>+Rs. 300</Text>
              <Text style={styles.expressBadge}>Premium</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Auto-Order Schedule */}
        <View style={styles.scheduleSection}>
          <TouchableOpacity 
            style={styles.scheduleCard}
            onPress={() => router.push('/(main)/schedule')}
          >
            <View style={styles.scheduleIcon}>
              <Clock size={24} color="#10B981" />
            </View>
            <View style={styles.scheduleContent}>
              <Text style={styles.scheduleTitle}>Auto-Order Schedule</Text>
              <Text style={styles.scheduleSubtitle}>Automatically order when tank level drops</Text>
            </View>
            <ArrowRight size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Recommended for You */}
        <View style={styles.recommendedSection}>
          <View style={styles.recommendedHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TrendingUp size={20} color="#007AFF" />
          </View>
          
          <View style={styles.recommendedCard}>
            <View style={styles.recommendedContent}>
              <Text style={styles.recommendedTitle}>Weekly Large Tanker</Text>
              <Text style={styles.recommendedSubtitle}>Based on your usage pattern</Text>
            </View>
            <TouchableOpacity style={styles.scheduleButton}>
              <Text style={styles.scheduleButtonText}>Schedule</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Address Selection Modal */}
      <AddressSelectionModal 
        visible={showAddressModal}
        onClose={() => {
          setShowAddressModal(false);
          setSelectedProduct(null);
        }}
        onSelectAddress={handleAddressSelected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  welcomeSection: {
    paddingVertical: 24,
  },
  welcomeTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 2,
  },
  alertText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
  },
  orderNowButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  orderNowButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  servicesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceVolume: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servicePrice: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#007AFF',
  },
  serviceTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  expressSection: {
    marginBottom: 24,
  },
  expressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  expressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  expressContent: {
    flex: 1,
  },
  expressTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  expressSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
  },
  scheduleSection: {
    marginBottom: 24,
  },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  scheduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
  },
  expressPricing: {
    alignItems: 'flex-end',
  },
  expressPriceText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#92400E',
    marginBottom: 4,
  },
  expressBadge: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedSection: {
    marginBottom: 24,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  recommendedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendedContent: {
    flex: 1,
  },
  recommendedTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  recommendedSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  scheduleButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scheduleButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
});