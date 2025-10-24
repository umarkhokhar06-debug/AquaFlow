import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft,
  Bell,
  Shield,
  Moon,
  Globe,
  HelpCircle,
  FileText,
  Star,
  ChevronRight,
  Smartphone,
  Volume2,
  Lock,
  User,
  Car,
  DollarSign
} from 'lucide-react-native';
import { driverAPI, DriverSettings } from '../../utils/driverAPI';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<DriverSettings>({
    notifications: {
      push_enabled: true,
      sound_enabled: true,
      new_orders: true,
      order_updates: true,
      promotions: false,
      system_updates: true,
    },
    privacy: {
      location_sharing: true,
      data_analytics: false,
      marketing_communications: false,
    },
    preferences: {
      language: 'en',
      currency: 'PKR',
      distance_unit: 'km',
      dark_mode: false,
    },
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settingsData = await driverAPI.getSettings();
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: DriverSettings) => {
    try {
      setSaving(true);
      await driverAPI.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof DriverSettings['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handlePrivacyChange = (key: keyof DriverSettings['privacy'], value: boolean) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handlePreferenceChange = (key: keyof DriverSettings['preferences'], value: any) => {
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'You will be redirected to change your password.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => router.push('/auth/forgot-password') }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await driverAPI.deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              router.replace('/auth/login');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  const navigateToProfile = () => {
    router.push('/(driver)/(tabs)/profile');
  };

  const navigateToVehicle = () => {
    router.push('./vehicle');
  };

  const navigateToEarnings = () => {
    router.push('./earnings');
  };

  const navigateToHelp = () => {
    router.push('./help');
  };

  interface SettingItem {
    icon: React.ReactElement;
    title: string;
    subtitle: string;
    onPress?: () => void;
    showChevron?: boolean;
    toggle?: boolean;
    value?: boolean;
    onToggle?: (value: boolean) => void;
    dangerous?: boolean;
  }

  interface SettingSection {
    title: string;
    items: SettingItem[];
  }

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          icon: <User size={20} color="#007AFF" />,
          title: 'Profile Settings',
          subtitle: 'Manage your profile information',
          onPress: navigateToProfile,
          showChevron: true,
        },
        {
          icon: <Car size={20} color="#10B981" />,
          title: 'Vehicle Information',
          subtitle: 'Update your vehicle details',
          onPress: navigateToVehicle,
          showChevron: true,
        },
        {
          icon: <DollarSign size={20} color="#F59E0B" />,
          title: 'Earnings & Payments',
          subtitle: 'View earnings and payment methods',
          onPress: navigateToEarnings,
          showChevron: true,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: <Bell size={20} color="#8B5CF6" />,
          title: 'Push Notifications',
          subtitle: 'Receive push notifications',
          toggle: true,
          value: settings.notifications.push_enabled,
          onToggle: (value: boolean) => handleNotificationChange('push_enabled', value),
        },
        {
          icon: <Volume2 size={20} color="#EF4444" />,
          title: 'Sound Notifications',
          subtitle: 'Play sounds for notifications',
          toggle: true,
          value: settings.notifications.sound_enabled,
          onToggle: (value: boolean) => handleNotificationChange('sound_enabled', value),
        },
        {
          icon: <Smartphone size={20} color="#06B6D4" />,
          title: 'New Orders',
          subtitle: 'Get notified of new delivery orders',
          toggle: true,
          value: settings.notifications.new_orders,
          onToggle: (value: boolean) => handleNotificationChange('new_orders', value),
        },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        {
          icon: <Lock size={20} color="#374151" />,
          title: 'Change Password',
          subtitle: 'Update your account password',
          onPress: handleChangePassword,
          showChevron: true,
        },
        {
          icon: <Globe size={20} color="#059669" />,
          title: 'Location Sharing',
          subtitle: 'Share location for order tracking',
          toggle: true,
          value: settings.privacy.location_sharing,
          onToggle: (value: boolean) => handlePrivacyChange('location_sharing', value),
        },
        {
          icon: <Shield size={20} color="#7C3AED" />,
          title: 'Data Analytics',
          subtitle: 'Help improve app performance',
          toggle: true,
          value: settings.privacy.data_analytics,
          onToggle: (value: boolean) => handlePrivacyChange('data_analytics', value),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: <Moon size={20} color="#4B5563" />,
          title: 'Dark Mode',
          subtitle: 'Switch to dark theme',
          toggle: true,
          value: settings.preferences.dark_mode,
          onToggle: (value: boolean) => handlePreferenceChange('dark_mode', value),
        },
        {
          icon: <Globe size={20} color="#6366F1" />,
          title: 'Language',
          subtitle: `Current: ${settings.preferences.language.toUpperCase()}`,
          onPress: () => Alert.alert('Language', 'Language selection coming soon!'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle size={20} color="#10B981" />,
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          onPress: navigateToHelp,
          showChevron: true,
        },
        {
          icon: <FileText size={20} color="#6B7280" />,
          title: 'Terms & Conditions',
          subtitle: 'Read our terms and conditions',
          onPress: () => Alert.alert('Terms & Conditions', 'Terms and conditions would be displayed here.'),
          showChevron: true,
        },
        {
          icon: <Star size={20} color="#F59E0B" />,
          title: 'Rate App',
          subtitle: 'Rate our app on the store',
          onPress: () => Alert.alert('Rate App', 'This would open the app store rating.'),
          showChevron: true,
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          icon: <Shield size={20} color="#EF4444" />,
          title: 'Delete Account',
          subtitle: 'Permanently delete your account',
          onPress: handleDeleteAccount,
          showChevron: true,
          dangerous: true,
        },
      ],
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight}>
          {saving && <ActivityIndicator size="small" color="#007AFF" />}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem,
                    item.dangerous && styles.dangerousItem,
                  ]}
                  onPress={item.onPress}
                  disabled={item.toggle}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, item.dangerous && styles.dangerousIcon]}>
                      {item.icon}
                    </View>
                    <View style={styles.settingInfo}>
                      <Text style={[styles.settingTitle, item.dangerous && styles.dangerousText]}>
                        {item.title}
                      </Text>
                      <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <View style={styles.settingRight}>
                    {item.toggle ? (
                      <Switch
                        value={item.value}
                        onValueChange={item.onToggle}
                        trackColor={{ false: '#E5E7EB', true: '#007AFF' }}
                        thumbColor={item.value ? '#FFFFFF' : '#FFFFFF'}
                      />
                    ) : item.showChevron ? (
                      <ChevronRight size={20} color="#9CA3AF" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  dangerousItem: {
    backgroundColor: '#FEF2F2',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dangerousIcon: {
    backgroundColor: '#FEE2E2',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  dangerousText: {
    color: '#EF4444',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingRight: {
    marginLeft: 12,
  },
});