import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowLeft,
  User,
  Mail,
  Truck,
  LogOut,
  Settings,
  Star,
  FileText,
  AlertCircle
} from 'lucide-react-native';
import { driverAPI, DriverProfile } from '@/utils/driverAPI';
import { useCallback } from 'react';

export default function DriverProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<DriverProfile | null>(null);
  const [editedData, setEditedData] = useState<Partial<DriverProfile> | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'vehicle' | 'settings'>('info');

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await driverAPI.getProfile();
      setProfileData(profile);
      setEditedData(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editedData) {
        await driverAPI.updateProfile(editedData);
        await loadProfile();
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await driverAPI.logout();
            router.push('/');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const updateField = (field: string, value: any) => {
    setEditedData(prev => {
      if (!prev) return prev;
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        const parentData = prev[parent as keyof Partial<DriverProfile>];
        if (typeof parentData === 'object' && parentData !== null) {
          return {
            ...prev,
            [parent]: {
              ...parentData,
              [child]: value
            }
          } as Partial<DriverProfile>;
        }
      }
      return { ...prev, [field]: value } as Partial<DriverProfile>;
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#087EA4', '#063B5C']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#087EA4" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : !profileData ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color="#EF4444" />
            <Text style={styles.errorText}>Failed to load profile</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Rating Card */}
            <View style={styles.ratingCard}>
              <View style={styles.ratingTop}>
                <Text style={styles.ratingValue}>
                  {typeof profileData.rating === 'number' ? profileData.rating.toFixed(1) : '--'}
                </Text>
                <View style={styles.stars}>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      color={i < Math.floor(profileData.rating || 0) ? '#FFB800' : '#E5E7EB'}
                      fill={i < Math.floor(profileData.rating || 0) ? '#FFB800' : 'none'}
                    />
                  ))}
                </View>
              </View>
              <Text style={styles.ratingCount}>
                Based on {profileData.totalRatings} ratings
              </Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              {(['info', 'vehicle', 'settings'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tab, activeTab === tab && styles.activeTab]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Personal Info Tab */}
            {activeTab === 'info' && (
              <View style={styles.tabContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      value={editedData?.name || ''}
                      onChangeText={(value) => updateField('name', value)}
                      placeholder="Enter your name"
                      placeholderTextColor="#D1D5DB"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      value={editedData?.email || ''}
                      onChangeText={(value) => updateField('email', value)}
                      placeholder="Enter your email"
                      placeholderTextColor="#D1D5DB"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Vehicle Info Tab */}
            {activeTab === 'vehicle' && (
              <View style={styles.tabContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Type</Text>
                  <View style={styles.inputWrapper}>
                    <Truck size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      value={editedData?.vehicleInfo?.vehicleType || ''}
                      onChangeText={(value) => updateField('vehicleInfo.vehicleType', value)}
                      placeholder="e.g., Truck, Van, Motorcycle"
                      placeholderTextColor="#D1D5DB"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Vehicle Number</Text>
                  <View style={styles.inputWrapper}>
                    <FileText size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      value={editedData?.vehicleInfo?.vehicleNumber || ''}
                      onChangeText={(value) => updateField('vehicleInfo.vehicleNumber', value)}
                      placeholder="Enter vehicle registration"
                      placeholderTextColor="#D1D5DB"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>License Plate</Text>
                  <View style={styles.inputWrapper}>
                    <FileText size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      value={editedData?.vehicleInfo?.licensePlate || ''}
                      onChangeText={(value) => updateField('vehicleInfo.licensePlate', value)}
                      placeholder="Enter license plate"
                      placeholderTextColor="#D1D5DB"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Insurance Number</Text>
                  <View style={styles.inputWrapper}>
                    <FileText size={18} color="#6B7280" />
                    <TextInput
                      style={styles.input}
                      value={editedData?.vehicleInfo?.insuranceNumber || ''}
                      onChangeText={(value) => updateField('vehicleInfo.insuranceNumber', value)}
                      placeholder="Enter insurance number"
                      placeholderTextColor="#D1D5DB"
                    />
                  </View>
                </View>

                <View style={styles.saveButtonContainer}>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <View style={styles.tabContent}>
                <View style={styles.settingItem}>
                  <View>
                    <Text style={styles.settingLabel}>Notifications</Text>
                    <Text style={styles.settingDescription}>Receive order notifications</Text>
                  </View>
                  <Switch
                    value={editedData?.settings?.notificationsEnabled || false}
                    onValueChange={(value) => updateField('settings.notificationsEnabled', value)}
                    trackColor={{ false: '#E5E7EB', true: '#087EA4' }}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.settingItem}>
                  <View>
                    <Text style={styles.settingLabel}>Sound</Text>
                    <Text style={styles.settingDescription}>Enable notification sounds</Text>
                  </View>
                  <Switch
                    value={editedData?.settings?.soundEnabled || false}
                    onValueChange={(value) => updateField('settings.soundEnabled', value)}
                    trackColor={{ false: '#E5E7EB', true: '#087EA4' }}
                  />
                </View>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
                  <LogOut size={20} color="#FFFFFF" />
                  <Text style={styles.dangerButtonText}>Logout</Text>
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
    backgroundColor: '#F8F9FF',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ratingTop: {
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingValue: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingCount: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#087EA4',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  tabContent: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    marginLeft: 12,
  },
  saveButtonContainer: {
    marginTop: 24,
  },
  saveBtn: {
    backgroundColor: '#087EA4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  dangerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#087EA4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
});