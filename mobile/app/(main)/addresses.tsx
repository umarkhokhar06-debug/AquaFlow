import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  Plus, 
  Home, 
  Building2, 
  MapPin, 
  Edit3, 
  Trash2, 
  Star,
  Navigation
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

interface Address {
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

export default function AddressesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const savedAddresses = await AsyncStorage.getItem('saved_addresses');
      if (savedAddresses) {
        setAddresses(JSON.parse(savedAddresses));
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  // Reload addresses when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [])
  );

  const handleEditAddress = (addressId: string) => {
    router.push(`/(main)/add-edit-address?id=${addressId}`);
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedAddresses = addresses.filter(addr => addr.id !== addressId);
              await AsyncStorage.setItem('saved_addresses', JSON.stringify(updatedAddresses));
              setAddresses(updatedAddresses);
            } catch (error) {
              console.error('Error deleting address:', error);
              Alert.alert('Error', 'Failed to delete address');
            }
          }
        }
      ]
    );
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === addressId
      }));
      await AsyncStorage.setItem('saved_addresses', JSON.stringify(updatedAddresses));
      setAddresses(updatedAddresses);
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert('Error', 'Failed to set default address');
    }
  };

  const handleViewOnMap = (address: Address) => {
    Alert.alert('View on Map', `Opening map for ${address.houseNumber}`);
  };

  const handleAddAddress = () => {
    router.push('/(main)/add-edit-address');
  };

  const AddressCard = ({ address }: { address: Address }) => (
    <View style={styles.addressCard}>
      <View style={styles.addressHeader}>
        <View style={styles.addressTypeContainer}>
          <View style={[styles.addressIcon, address.type === 'Home' ? styles.homeIcon : styles.officeIcon]}>
            {address.type === 'Home' ? (
              <Home size={20} color="#007AFF" />
            ) : address.type === 'Office' ? (
              <Building2 size={20} color="#10B981" />
            ) : (
              <MapPin size={20} color="#F59E0B" />
            )}
          </View>
          <View style={styles.addressInfo}>
            <View style={styles.addressTitleRow}>
              <Text style={styles.addressType}>{address.type}</Text>
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
            </View>
            <Text style={styles.addressTitle}>{address.houseNumber}, {address.portion}</Text>
            <Text style={styles.addressName}>{address.fullName}</Text>
          </View>
        </View>
        <View style={styles.addressActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditAddress(address.id)}
          >
            <Edit3 size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteAddress(address.id)}
          >
            <Trash2 size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.addressDetails}>
        <Text style={styles.addressText}>{address.address}</Text>
        {address.landmark && (
          <View style={styles.landmarkRow}>
            <MapPin size={14} color="#007AFF" />
            <Text style={styles.landmarkText}>{address.landmark}</Text>
          </View>
        )}
        <View style={styles.landmarkRow}>
          <Text style={styles.phoneText}>📞 {address.phoneNumber}</Text>
        </View>
      </View>

      <View style={styles.addressFooter}>
        {!address.isDefault && (
          <TouchableOpacity 
            style={styles.setDefaultButton}
            onPress={() => handleSetDefault(address.id)}
          >
            <Star size={16} color="#6B7280" />
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.viewMapButton}
          onPress={() => handleViewOnMap(address)}
        >
          <Navigation size={16} color="#007AFF" />
          <Text style={styles.viewMapText}>View on Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddAddress}
        >
          <Plus size={24} color="#007AFF" />
          <Text style={styles.addButtonText}>Add Address</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading addresses...</Text>
          </View>
        ) : (
          <>
            {addresses.map((address) => (
              <AddressCard key={address.id} address={address} />
            ))}

            {addresses.length === 0 && (
              <View style={styles.emptyState}>
                <Home size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Saved Addresses</Text>
                <Text style={styles.emptyText}>
                  Add your delivery addresses to make ordering faster
                </Text>
                <TouchableOpacity style={styles.emptyAddButton} onPress={handleAddAddress}>
                  <Plus size={20} color="#FFFFFF" />
                  <Text style={styles.emptyAddButtonText}>Add Your First Address</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  backButton: {
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
  addressCard: {
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
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  homeIcon: {
    backgroundColor: '#F0F8FF',
  },
  officeIcon: {
    backgroundColor: '#F0FDF4',
  },
  addressInfo: {
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressType: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginRight: 8,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  defaultText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginLeft: 4,
  },
  addressTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  addressName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  addressDetails: {
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  landmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  landmarkText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#007AFF',
    marginLeft: 4,
  },
  phoneText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#374151',
  },
  addressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  setDefaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setDefaultText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 4,
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewMapText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});