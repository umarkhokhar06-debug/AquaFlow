import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  Navigation, 
  MapPin, 
  Truck,
  Clock,
  Package,
  Phone,
  MessageCircle,
  Route,
  Fuel,
  User
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function DriverMapScreen() {
  const insets = useSafeAreaInsets();
  const [currentOrder] = useState({
    id: 'ORD-127',
    customer: 'Ahmed Hassan',
    phone: '+92 300 1234567',
    address: 'House 123, Upper Portion, Gulshan-e-Iqbal',
    type: 'Large Tanker',
    volume: '6000L',
    estimatedTime: '25 mins',
    distance: '2.5 km',
    amount: 'Rs. 2,500',
  });

  const [driverLocation] = useState({
    latitude: 24.8607,
    longitude: 67.0011,
  });

  const [vehicleStatus] = useState({
    speed: '45 km/h',
    fuel: '85%',
    status: 'En Route',
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#007AFF', '#0056CC']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Live Navigation</Text>
          <Text style={styles.headerSubtitle}>Order #{currentOrder.id}</Text>
        </View>
      </LinearGradient>

      {/* Map Container */}
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <Navigation size={48} color="#007AFF" />
          <Text style={styles.mapText}>Live Map View</Text>
          <Text style={styles.mapSubtext}>Navigation to customer location</Text>
        </View>
        
        {/* Driver Location Marker */}
        <View style={styles.driverMarker}>
          <Truck size={20} color="#FFFFFF" />
        </View>
        
        {/* Customer Location Marker */}
        <View style={styles.customerMarker}>
          <MapPin size={16} color="#FFFFFF" />
        </View>

        {/* Route Line Indicator */}
        <View style={styles.routeLine} />
      </View>

      {/* Vehicle Status Bar */}
      <View style={styles.vehicleStatusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusValue}>{vehicleStatus.speed}</Text>
          <Text style={styles.statusLabel}>Speed</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={styles.statusValue}>{vehicleStatus.fuel}</Text>
          <Text style={styles.statusLabel}>Fuel</Text>
        </View>
        <View style={styles.statusItem}>
          <Text style={[styles.statusValue, { color: '#28A745' }]}>{vehicleStatus.status}</Text>
          <Text style={styles.statusLabel}>Status</Text>
        </View>
      </View>

      {/* Navigation Info */}
      <View style={styles.navigationInfo}>
        <View style={styles.etaCard}>
          <View style={styles.etaContent}>
            <Clock size={24} color="#007AFF" />
            <View style={styles.etaText}>
              <Text style={styles.etaTime}>{currentOrder.estimatedTime}</Text>
              <Text style={styles.etaLabel}>ETA • {currentOrder.distance}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.routeButton}>
            <Route size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Customer Info */}
        <View style={styles.customerCard}>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <User size={20} color="#007AFF" />
            </View>
            <View style={styles.customerDetails}>
              <Text style={styles.customerName}>{currentOrder.customer}</Text>
              <Text style={styles.customerAddress}>{currentOrder.address}</Text>
              <Text style={styles.orderDetails}>{currentOrder.type} - {currentOrder.volume}</Text>
            </View>
          </View>
          
          <View style={styles.customerActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Phone size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MessageCircle size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.primaryAction}>
            <Package size={20} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Mark as Delivered</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Report Issue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
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
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  mapContainer: {
    height: height * 0.4,
    backgroundColor: '#E5E7EB',
    margin: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
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
    top: 80,
    left: 60,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  customerMarker: {
    position: 'absolute',
    bottom: 60,
    right: 80,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  routeLine: {
    position: 'absolute',
    top: 100,
    left: 80,
    width: width * 0.4,
    height: 2,
    backgroundColor: '#007AFF',
    transform: [{ rotate: '45deg' }],
    opacity: 0.6,
  },
  vehicleStatusBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  navigationInfo: {
    flex: 1,
    paddingHorizontal: 20,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  etaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  etaText: {
    marginLeft: 16,
  },
  etaTime: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  etaLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  routeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  orderDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  customerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    gap: 12,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28A745',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryActionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryActionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});