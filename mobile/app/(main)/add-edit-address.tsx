import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Save, MapPin, Home, Building2, User, Phone, Navigation } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

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

export default function AddEditAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const isEdit = params.id ? true : false;
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(false);
  const [addressType, setAddressType] = useState<'Home' | 'Office' | 'Other'>('Home');
  const [fullName, setFullName] = useState('');
  const [houseNumber, setHouseNumber] = useState('');
  const [portion, setPortion] = useState<'upper' | 'lower'>('upper');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [latitude, setLatitude] = useState<number>(24.8607); // Default: Karachi
  const [longitude, setLongitude] = useState<number>(67.0011);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (isEdit && params.id) {
      loadAddress(params.id as string);
    } else {
      // Get current location for new address
      getCurrentLocation();
    }
  }, [params.id]);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to set address location');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      
      // Animate map to current location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadAddress = async (addressId: string) => {
    try {
      const savedAddresses = await AsyncStorage.getItem('saved_addresses');
      if (savedAddresses) {
        const addresses: Address[] = JSON.parse(savedAddresses);
        const address = addresses.find(addr => addr.id === addressId);
        if (address) {
          setAddressType(address.type);
          setFullName(address.fullName);
          setHouseNumber(address.houseNumber);
          setPortion(address.portion);
          setAddress(address.address);
          setLandmark(address.landmark);
          setPhoneNumber(address.phoneNumber);
          setIsDefault(address.isDefault);
          if (address.latitude && address.longitude) {
            setLatitude(address.latitude);
            setLongitude(address.longitude);
          }
        }
      }
    } catch (error) {
      console.error('Error loading address:', error);
    }
  };

  const handleSave = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter your full name');
      return;
    }
    if (!houseNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter house number');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Validation Error', 'Please enter complete address');
      return;
    }
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter phone number');
      return;
    }

    setLoading(true);

    try {
      // Get existing addresses
      const savedAddresses = await AsyncStorage.getItem('saved_addresses');
      let addresses: Address[] = savedAddresses ? JSON.parse(savedAddresses) : [];

      if (isEdit && params.id) {
        // Update existing address
        addresses = addresses.map(addr => {
          if (addr.id === params.id) {
            return {
              ...addr,
              type: addressType,
              fullName,
              houseNumber,
              portion,
              address,
              landmark,
              phoneNumber,
              isDefault: isDefault || addr.isDefault,
              latitude,
              longitude,
            };
          }
          // If this is being set as default, remove default from others
          if (isDefault && addr.isDefault) {
            return { ...addr, isDefault: false };
          }
          return addr;
        });
      } else {
        // Add new address
        const newAddress: Address = {
          id: Date.now().toString(),
          type: addressType,
          fullName,
          houseNumber,
          portion,
          address,
          landmark,
          phoneNumber,
          isDefault: isDefault || addresses.length === 0, // First address is default
          latitude,
          longitude,
        };

        // If setting as default, remove default from others
        if (isDefault) {
          addresses = addresses.map(addr => ({ ...addr, isDefault: false }));
        }

        addresses.push(newAddress);
      }

      // Save to AsyncStorage
      await AsyncStorage.setItem('saved_addresses', JSON.stringify(addresses));

      Alert.alert(
        'Success',
        isEdit ? 'Address updated successfully' : 'Address added successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Address' : 'Add New Address'}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Address Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Type</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[styles.typeButton, addressType === 'Home' && styles.typeButtonActive]}
              onPress={() => setAddressType('Home')}
            >
              <Home size={20} color={addressType === 'Home' ? '#007AFF' : '#6B7280'} />
              <Text style={[styles.typeButtonText, addressType === 'Home' && styles.typeButtonTextActive]}>
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, addressType === 'Office' && styles.typeButtonActive]}
              onPress={() => setAddressType('Office')}
            >
              <Building2 size={20} color={addressType === 'Office' ? '#007AFF' : '#6B7280'} />
              <Text style={[styles.typeButtonText, addressType === 'Office' && styles.typeButtonTextActive]}>
                Office
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, addressType === 'Other' && styles.typeButtonActive]}
              onPress={() => setAddressType('Other')}
            >
              <MapPin size={20} color={addressType === 'Other' ? '#007AFF' : '#6B7280'} />
              <Text style={[styles.typeButtonText, addressType === 'Other' && styles.typeButtonTextActive]}>
                Other
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <User size={18} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <Phone size={18} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="+92 300 1234567"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Address Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Details</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>House Number *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 123, A-456"
              value={houseNumber}
              onChangeText={setHouseNumber}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Portion</Text>
            <View style={styles.portionButtons}>
              <TouchableOpacity
                style={[styles.portionButton, portion === 'upper' && styles.portionButtonActive]}
                onPress={() => setPortion('upper')}
              >
                <Text style={[styles.portionButtonText, portion === 'upper' && styles.portionButtonTextActive]}>
                  Upper
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.portionButton, portion === 'lower' && styles.portionButtonActive]}
                onPress={() => setPortion('lower')}
              >
                <Text style={[styles.portionButtonText, portion === 'lower' && styles.portionButtonTextActive]}>
                  Lower
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Complete Address *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Street, Block, Area, City"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Landmark (Optional)</Text>
            <View style={styles.inputContainer}>
              <MapPin size={18} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="e.g., Near City School"
                value={landmark}
                onChangeText={setLandmark}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Location on Map */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Location on Map</Text>
            <TouchableOpacity onPress={getCurrentLocation} style={styles.currentLocationButton}>
              <Navigation size={16} color="#007AFF" />
              <Text style={styles.currentLocationText}>Use Current</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={styles.mapToggle}
            onPress={() => setShowMap(!showMap)}
          >
            <MapPin size={18} color="#007AFF" />
            <Text style={styles.mapToggleText}>
              {showMap ? 'Hide Map' : 'Show Map & Set Location'}
            </Text>
          </TouchableOpacity>

          {showMap && (
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude,
                  longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={(e) => {
                  const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
                  setLatitude(lat);
                  setLongitude(lng);
                }}
              >
                <Marker
                  coordinate={{ latitude, longitude }}
                  title="Delivery Location"
                  description={address || 'Tap on map to set location'}
                  pinColor="#007AFF"
                />
              </MapView>
              <View style={styles.mapInfo}>
                <Text style={styles.mapInfoText}>
                  📍 Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
                </Text>
                <Text style={styles.mapInfoHint}>
                  Tap on the map to set delivery location
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Default Address Toggle */}
        <TouchableOpacity style={styles.defaultToggle} onPress={() => setIsDefault(!isDefault)}>
          <View style={styles.defaultToggleLeft}>
            <View style={[styles.checkbox, isDefault && styles.checkboxActive]}>
              {isDefault && <View style={styles.checkboxInner} />}
            </View>
            <Text style={styles.defaultToggleText}>Set as default address</Text>
          </View>
        </TouchableOpacity>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>{isEdit ? 'Update Address' : 'Save Address'}</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EFF6FF',
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#007AFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  portionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  portionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  portionButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#EFF6FF',
  },
  portionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  portionButtonTextActive: {
    color: '#007AFF',
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  defaultToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  defaultToggleText: {
    fontSize: 15,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
  },
  currentLocationText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  mapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    marginBottom: 12,
  },
  mapToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: 300,
  },
  mapInfo: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  mapInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  mapInfoHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});
