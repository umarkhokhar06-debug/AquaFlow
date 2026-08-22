import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Home, Building2, MapPin, X, Plus, CheckCircle } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

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

interface AddressSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAddress: (address: Address) => void;
}

export default function AddressSelectionModal({ 
  visible, 
  onClose, 
  onSelectAddress 
}: AddressSelectionModalProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      loadAddresses();
    }
  }, [visible]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const savedAddresses = await AsyncStorage.getItem('saved_addresses');
      if (savedAddresses) {
        const parsedAddresses: Address[] = JSON.parse(savedAddresses);
        setAddresses(parsedAddresses);
        
        // Auto-select default address
        const defaultAddress = parsedAddresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedId(defaultAddress.id);
        }
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
      Alert.alert('Error', 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAddress = (address: Address) => {
    setSelectedId(address.id);
  };

  const handleConfirm = () => {
    const selected = addresses.find(addr => addr.id === selectedId);
    if (selected) {
      onSelectAddress(selected);
      onClose();
    } else {
      Alert.alert('No Address Selected', 'Please select an address to continue');
    }
  };

  const handleAddNewAddress = () => {
    onClose();
    router.push('/(main)/add-edit-address');
  };

  const AddressCard = ({ address }: { address: Address }) => {
    const isSelected = selectedId === address.id;

    return (
      <TouchableOpacity 
        style={[
          styles.addressCard,
          isSelected && styles.selectedCard
        ]}
        onPress={() => handleSelectAddress(address)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* Icon */}
          <View style={[
            styles.addressIcon,
            address.type === 'Home' 
              ? styles.homeIcon 
              : address.type === 'Office' 
                ? styles.officeIcon 
                : styles.otherIcon
          ]}>
            {address.type === 'Home' ? (
              <Home size={20} color="#087EA4" />
            ) : address.type === 'Office' ? (
              <Building2 size={20} color="#10B981" />
            ) : (
              <MapPin size={20} color="#F59E0B" />
            )}
          </View>

          {/* Address Details */}
          <View style={styles.addressInfo}>
            <Text style={styles.addressType}>{address.type}</Text>
            <Text style={styles.addressName}>{address.fullName}</Text>
            <Text style={styles.addressText}>
              {address.houseNumber}, {address.portion} portion
            </Text>
            <Text style={styles.addressText} numberOfLines={2}>
              {address.address}
            </Text>
            {address.landmark && (
              <Text style={styles.landmarkText}>📍 {address.landmark}</Text>
            )}
            <Text style={styles.phoneText}>📞 {address.phoneNumber}</Text>
          </View>

          {/* Selection Indicator */}
          <View style={styles.selectionIndicator}>
            {isSelected ? (
              <View style={styles.selectedCircle}>
                <CheckCircle size={24} color="#087EA4" fill="#087EA4" />
              </View>
            ) : (
              <View style={styles.unselectedCircle} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Delivery Address</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
            >
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#087EA4" />
                <Text style={styles.loadingText}>Loading addresses...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyState}>
                <Home size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Saved Addresses</Text>
                <Text style={styles.emptyText}>
                  Add your first delivery address to continue
                </Text>
              </View>
            ) : (
              addresses.map((address) => (
                <AddressCard key={address.id} address={address} />
              ))
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddNewAddress}
            >
              <Plus size={20} color="#087EA4" />
              <Text style={styles.addButtonText}>Add New Address</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.confirmButton,
                (!selectedId || loading) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selectedId || loading}
            >
              <Text style={styles.confirmButtonText}>
                Confirm & Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  selectedCard: {
    borderColor: '#087EA4',
    backgroundColor: '#F0F8FF',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  homeIcon: {
    backgroundColor: '#E6F2FF',
  },
  officeIcon: {
    backgroundColor: '#F0FDF4',
  },
  otherIcon: {
    backgroundColor: '#FEF3C7',
  },
  addressInfo: {
    flex: 1,
  },
  addressType: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  addressName: {
    fontSize: 14,
    fontFamily: 'Sora-Medium',
    color: '#374151',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Sora-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  landmarkText: {
    fontSize: 12,
    fontFamily: 'Sora-Regular',
    color: '#087EA4',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 12,
    fontFamily: 'Sora-Regular',
    color: '#374151',
    marginTop: 4,
  },
  selectionIndicator: {
    marginLeft: 12,
  },
  selectedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unselectedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: 'Sora-SemiBold',
    color: '#087EA4',
    marginLeft: 8,
  },
  confirmButton: {
    backgroundColor: '#087EA4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Sora-SemiBold',
    color: '#FFFFFF',
  },
});
