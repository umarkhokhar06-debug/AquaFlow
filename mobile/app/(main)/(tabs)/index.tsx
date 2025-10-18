import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
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

export default function DashboardScreen() {
  const [tankLevel, setTankLevel] = useState(25);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleServiceSelect = (service: string, price: string) => {
    Alert.alert(
      'Order Confirmation',
      `You selected ${service} for ${price}. Would you like to proceed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Order Now', onPress: () => router.push('/(main)/(tabs)/orders') }
      ]
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };

  const ServiceCard = ({ 
    title, 
    volume, 
    price, 
    time, 
    available, 
    icon, 
    color,
    onPress 
  }: any) => (
    <TouchableOpacity 
      style={[styles.serviceCard, !available && styles.serviceCardDisabled]} 
      onPress={available ? onPress : undefined}
      disabled={!available}
    >
      <View style={styles.serviceContent}>
        <View style={[styles.serviceIcon, { backgroundColor: color + '20' }]}>
          {icon}
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle}>{title}</Text>
          <Text style={styles.serviceVolume}>{volume}</Text>
          <View style={styles.serviceDetails}>
            <Text style={styles.servicePrice}>{price}</Text>
            <Text style={styles.serviceTime}>• {time}</Text>
          </View>
        </View>
        <View style={styles.serviceRight}>
          <View style={[
            styles.availabilityBadge, 
            { backgroundColor: available ? '#10B981' : '#EF4444' }
          ]}>
            <Text style={styles.availabilityText}>
              {available ? 'Available' : 'Unavailable'}
            </Text>
          </View>
          {available && <ArrowRight size={20} color="#6B7280" />}
        </View>
      </View>
    </TouchableOpacity>
  );

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
          <Text style={styles.welcomeTitle}>Welcome back, John!</Text>
          <Text style={styles.welcomeSubtitle}>Your water tank is at {tankLevel}% capacity</Text>
        </View>

        {/* Low Water Alert */}
        {tankLevel <= 30 && (
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
            <TouchableOpacity style={styles.orderNowButton}>
              <Text style={styles.orderNowButtonText}>Order Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Choose Your Service */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>Choose Your Service</Text>
          
          <ServiceCard
            title="Large Tanker"
            volume="6000L"
            price="Rs. 2,500"
            time="45-60 min"
            available={true}
            icon={<Truck size={24} color="#007AFF" />}
            color="#007AFF"
            onPress={() => handleServiceSelect('Large Tanker (6000L)', 'Rs. 2,500')}
          />

          <ServiceCard
            title="Small Tanker"
            volume="3500L"
            price="Rs. 1,800"
            time="30-45 min"
            available={true}
            icon={<Truck size={20} color="#10B981" />}
            color="#10B981"
            onPress={() => handleServiceSelect('Small Tanker (3500L)', 'Rs. 1,800')}
          />

          <ServiceCard
            title="Water Bottles"
            volume="20L x 10"
            price="Rs. 500"
            time="15-30 min"
            available={false}
            icon={<Droplets size={20} color="#8B5CF6" />}
            color="#8B5CF6"
            onPress={() => handleServiceSelect('Water Bottles (20L x 10)', 'Rs. 500')}
          />
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
});