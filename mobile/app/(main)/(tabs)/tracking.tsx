import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Navigation, 
  Phone, 
  MessageCircle,
  Clock,
  MapPin,
  Truck,
  User
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import { DrawerActions } from '@react-navigation/native';
import { router, useNavigation } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function TrackingScreen() {
  const [estimatedTime, setEstimatedTime] = useState(45);
  const [driverLocation, setDriverLocation] = useState({
    latitude: 24.8607,
    longitude: 67.0011,
  });
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setEstimatedTime(prev => Math.max(0, prev - 1));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const orderDetails = {
    id: 'ORD-001',
    type: 'Large Tanker',
    volume: '6000L',
    driver: {
      name: 'Ahmad Khan',
      phone: '+92 300 1234567',
      rating: 4.8,
      vehicle: 'TK-7890',
    },
    status: 'On the way',
    queuePosition: 2,
  };

  const handleCallDriver = () => {
    Alert.alert(
      'Call Driver',
      `Call ${orderDetails.driver.name} at ${orderDetails.driver.phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Call', onPress: () => console.log('Calling driver...') }
      ]
    );
  };

  const handleMessageDriver = () => {
    Alert.alert(
      'Message Driver',
      `Send a message to ${orderDetails.driver.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Message', onPress: () => console.log('Opening messages...') }
      ]
    );
  };

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openNotifications = () => {
    router.push('/(main)/notifications');
  };
  

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom , paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <HeaderComponent openDrawer={openDrawer} openNotifications={openNotifications} />

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Navigation size={48} color="#007AFF" />
          <Text style={styles.mapText}>Map View</Text>
          <Text style={styles.mapSubtext}>Driver location will be shown here</Text>
        </View>
        
        {/* Driver Location Marker */}
        <View style={styles.driverMarker}>
          <Truck size={20} color="#FFFFFF" />
        </View>
        
        {/* User Location Marker */}
        <View style={styles.userMarker}>
          <MapPin size={16} color="#FFFFFF" />
        </View>
      </View>

      {/* Tracking Info */}
      <View style={styles.trackingInfo}>
        {/* ETA Card */}
        <View style={styles.etaCard}>
          <LinearGradient
            colors={['#28A745', '#1E7E34']}
            style={styles.etaGradient}
          >
            <View style={styles.etaContent}>
              <Clock size={24} color="#FFFFFF" />
              <View style={styles.etaText}>
                <Text style={styles.etaTime}>{estimatedTime} mins</Text>
                <Text style={styles.etaLabel}>Estimated arrival</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Queue Position */}
        <View style={styles.queueCard}>
          <View style={styles.queueIcon}>
            <Text style={styles.queueNumber}>{orderDetails.queuePosition}</Text>
          </View>
          <View style={styles.queueInfo}>
            <Text style={styles.queueTitle}>Queue Position</Text>
            <Text style={styles.queueText}>You're {orderDetails.queuePosition} in line</Text>
          </View>
        </View>

        {/* Driver Info */}
        <View style={styles.driverCard}>
          <View style={styles.driverInfo}>
            <View style={styles.driverAvatar}>
              <User size={24} color="#007AFF" />
            </View>
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{orderDetails.driver.name}</Text>
              <Text style={styles.driverVehicle}>Vehicle: {orderDetails.driver.vehicle}</Text>
              <View style={styles.driverRating}>
                <Text style={styles.ratingText}>⭐ {orderDetails.driver.rating}</Text>
                <Text style={styles.statusText}>{orderDetails.status}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.driverActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCallDriver}>
              <Phone size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleMessageDriver}>
              <MessageCircle size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Progress */}
        <View style={styles.progressCard}>
          <Text style={styles.progressTitle}>Order Progress</Text>
          <View style={styles.progressSteps}>
            <View style={[styles.progressStep, styles.progressStepCompleted]}>
              <View style={[styles.progressDot, styles.progressDotCompleted]} />
              <Text style={styles.progressText}>Order Confirmed</Text>
            </View>
            <View style={[styles.progressStep, styles.progressStepActive]}>
              <View style={[styles.progressDot, styles.progressDotActive]} />
              <Text style={styles.progressText}>Driver Dispatched</Text>
            </View>
            <View style={styles.progressStep}>
              <View style={styles.progressDot} />
              <Text style={styles.progressText}>Delivery Complete</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  orderInfo: {
    alignItems: 'center',
  },
  orderId: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  orderType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  mapContainer: {
    height: height * 0.35,
    backgroundColor: '#E5E7EB',
    margin: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapPlaceholder: {
    alignItems: 'center',
  },
  mapText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 16,
  },
  mapSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  driverMarker: {
    position: 'absolute',
    top: 60,
    right: 80,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userMarker: {
    position: 'absolute',
    bottom: 60,
    left: 80,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  trackingInfo: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  etaCard: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  etaGradient: {
    borderRadius: 16,
    padding: 20,
  },
  etaContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  etaText: {
    marginLeft: 16,
  },
  etaTime: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  etaLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  queueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  queueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  queueNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  queueInfo: {
    flex: 1,
  },
  queueTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  queueText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  driverCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#28A745',
  },
  driverActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  progressSteps: {
    gap: 16,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressStepCompleted: {
    opacity: 0.6,
  },
  progressStepActive: {
    opacity: 1,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D1D5DB',
    marginRight: 12,
  },
  progressDotCompleted: {
    backgroundColor: '#28A745',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
});