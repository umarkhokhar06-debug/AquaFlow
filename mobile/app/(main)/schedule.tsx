import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react-native';
import { globalstyles } from '@/app/commans/style';
import { scheduleService, ScheduledOrder } from '@/utils/scheduleService';
import { storage } from '@/utils/auth';
import { orderAPI } from '@/utils/orderAPI';
import { Product } from '@/types/order';

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

export default function ScheduleScreen() {
  const [schedules, setSchedules] = useState<ScheduledOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [triggerTankLevel, setTriggerTankLevel] = useState('30');
  const [minInterval, setMinInterval] = useState('24');
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [addresses, setAddresses] = useState<SelectedAddress[]>([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load schedules
      await scheduleService.loadSchedules();
      setSchedules(scheduleService.getSchedules());

      // Load products
      const productsData = await orderAPI.getProducts();
      setProducts(productsData);

      // Load saved addresses from storage
      const savedAddresses = await AsyncStorage.getItem('saved_addresses');
      if (savedAddresses) {
        try {
          const parsedAddresses = JSON.parse(savedAddresses);
          setAddresses(parsedAddresses);
        } catch (error) {
          console.error('Error parsing addresses:', error);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!selectedProduct || !selectedAddress || !triggerTankLevel) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const newSchedule = await scheduleService.addSchedule({
        productType: selectedProduct.type,
        productName: selectedProduct.name,
        quantity: 1,
        unitPrice: selectedProduct.unitPrice,
        deliveryAddress: {
          fullName: selectedAddress.fullName,
          houseNumber: selectedAddress.houseNumber,
          portion: selectedAddress.portion,
          address: selectedAddress.address,
          phoneNumber: selectedAddress.phoneNumber,
          specialInstructions: selectedAddress.landmark ? `Landmark: ${selectedAddress.landmark}` : '',
          latitude: selectedAddress.latitude,
          longitude: selectedAddress.longitude,
        },
        triggerTankLevel: parseInt(triggerTankLevel),
        minIntervalHours: parseInt(minInterval) || 24,
      });

      setSchedules(scheduleService.getSchedules());
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Schedule created successfully');
    } catch (error) {
      console.error('Error creating schedule:', error);
      Alert.alert('Error', 'Failed to create schedule');
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setTriggerTankLevel('30');
    setMinInterval('24');
    setSelectedAddress(null);
  };

  const handleToggleSchedule = async (id: string) => {
    try {
      await scheduleService.toggleSchedule(id);
      setSchedules(scheduleService.getSchedules());
    } catch (error) {
      console.error('Error toggling schedule:', error);
      Alert.alert('Error', 'Failed to toggle schedule');
    }
  };

  const handleDeleteSchedule = (id: string) => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await scheduleService.deleteSchedule(id);
              setSchedules(scheduleService.getSchedules());
            } catch (error) {
              console.error('Error deleting schedule:', error);
              Alert.alert('Error', 'Failed to delete schedule');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const ScheduleCard = ({ schedule }: { schedule: ScheduledOrder }) => (
    <View style={styles.scheduleCard}>
      <View style={styles.cardHeader}>
        <View style={styles.cardInfo}>
          <Text style={styles.productName}>{schedule.productName}</Text>
          <Text style={styles.productType}>{schedule.productType}</Text>
        </View>
        <View style={styles.cardActions}>
          <Switch
            value={schedule.isActive}
            onValueChange={() => handleToggleSchedule(schedule.id)}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor={schedule.isActive ? '#10B981' : '#F3F4F6'}
          />
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Trigger Level:</Text>
          <Text style={styles.detailValue}>{schedule.triggerTankLevel}%</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Min Interval:</Text>
          <Text style={styles.detailValue}>{schedule.minIntervalHours || 24} hrs</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Delivery:</Text>
          <Text style={styles.detailValue}>{schedule.deliveryAddress.address}</Text>
        </View>
        {schedule.lastOrderPlaced && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Order:</Text>
            <Text style={styles.detailValue}>{formatDate(schedule.lastOrderPlaced)}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSchedule(schedule.id)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[globalstyles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Auto-Order Schedule</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading schedules...</Text>
          </View>
        ) : schedules.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Schedules</Text>
            <Text style={styles.emptyText}>
              Create a schedule to automatically order water when tank level drops
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.createButtonText}>Create Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.schedulesList}>
            {schedules.map((schedule) => (
              <ScheduleCard key={schedule.id} schedule={schedule} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Schedule Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={[globalstyles.container, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Schedule</Text>
            <TouchableOpacity onPress={handleAddSchedule}>
              <Text style={styles.modalCreate}>Create</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Product Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Product</Text>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.type}
                  style={[
                    styles.productOption,
                    selectedProduct?.type === product.type &&
                      styles.productOptionSelected,
                  ]}
                  onPress={() => setSelectedProduct(product)}
                >
                  <View>
                    <Text style={styles.productOptionName}>{product.name}</Text>
                    <Text style={styles.productOptionSize}>
                      {product.size} - Rs. {product.unitPrice.toLocaleString()}
                    </Text>
                  </View>
                  {selectedProduct?.type === product.type && (
                    <View style={styles.checkmark} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Trigger Tank Level */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trigger Tank Level (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="numeric"
                value={triggerTankLevel}
                onChangeText={setTriggerTankLevel}
              />
              <Text style={styles.inputHelper}>
                Order will be placed when tank level drops below this percentage
              </Text>
            </View>

            {/* Minimum Interval */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Interval (hours)</Text>
              <TextInput
                style={styles.input}
                placeholder="24"
                keyboardType="numeric"
                value={minInterval}
                onChangeText={setMinInterval}
              />
              <Text style={styles.inputHelper}>
                Minimum hours between automatic orders
              </Text>
            </View>

            {/* Address Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              {addresses.length === 0 ? (
                <>
                  <Text style={styles.addressHelper}>
                    No saved addresses found. Add one to create a schedule.
                  </Text>
                  <TouchableOpacity
                    style={styles.addressPlaceholder}
                    onPress={() => {
                      setShowAddModal(false);
                      router.push('/(main)/add-edit-address');
                    }}
                  >
                    <Text style={styles.addressPlaceholderText}>
                      + Add New Address
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.addressHelper}>
                    Select where you want orders delivered
                  </Text>
                  {addresses.map((addr) => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[
                        styles.addressOption,
                        selectedAddress?.id === addr.id && styles.addressOptionSelected,
                      ]}
                      onPress={() => setSelectedAddress(addr)}
                    >
                      <View>
                        <Text style={styles.addressOptionType}>{addr.type}</Text>
                        <Text style={styles.addressOptionText}>
                          {addr.houseNumber}, {addr.portion}
                        </Text>
                        <Text style={styles.addressOptionText}>{addr.address}</Text>
                      </View>
                      {selectedAddress?.id === addr.id && (
                        <View style={styles.checkmark} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.addressPlaceholder}
                    onPress={() => {
                      setShowAddModal(false);
                      router.push('/(main)/add-edit-address');
                    }}
                  >
                    <Text style={styles.addressPlaceholderText}>
                      + Add Another Address
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
    maxWidth: 280,
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  schedulesList: {
    paddingVertical: 16,
  },
  scheduleCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  productType: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  cardActions: {
    marginLeft: 12,
  },
  cardDetails: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  deleteButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  modalCreate: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  productOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  productOptionName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  productOptionSize: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputHelper: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  addressHelper: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  addressOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  addressOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  addressOptionType: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  addressOptionText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  addressPlaceholder: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  addressPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#007AFF',
  },
});
