import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  CreditCard,
  Users,
  Droplets,
  Settings as SettingsIcon,
  Clock,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';
import HeaderComponent from '@/app/components/Header';
import { storage, User as UserType } from '@/utils/auth';
import { getMyDevices } from '@/utils/iotAPI';
import { colors, radius, spacing, typography } from '@/theme';

export default function AccountScreen() {
  const [user, setUser] = useState<UserType | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    storage.getUserData().then((data) => setUser(data?.user || null));
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleAddMember = async () => {
    try {
      const devicesRes = await getMyDevices();
      const firstDevice = devicesRes.success ? devicesRes.devices[0] : null;
      if (!firstDevice) {
        router.push('/(main)/(tabs)/tank-monitoring');
        return;
      }
      router.push({ pathname: '/(main)/manage-device-access', params: { deviceId: firstDevice.deviceId } });
    } catch (error) {
      console.error('Error loading devices for Add Member:', error);
      router.push('/(main)/(tabs)/tank-monitoring');
    }
  };

  const handleLogout = async () => {
    await storage.clearUserData();
    router.replace('/auth/login');
  };

  const menuItems = [
    { label: 'Add Member', icon: Users, onPress: handleAddMember },
    { label: 'Payment Methods', icon: CreditCard, onPress: () => router.push('/(main)/payments') },
    { label: 'Saved Addresses', icon: MapPin, onPress: () => router.push('/(main)/addresses') },
    { label: 'My Devices', icon: Droplets, onPress: () => router.push('/(main)/calibration-settings') },
    { label: 'Auto-Order Schedule', icon: Clock, onPress: () => router.push('/(main)/schedule') },
    { label: 'Notifications', icon: Bell, onPress: () => router.push('/(main)/notifications') },
    { label: 'Settings', icon: SettingsIcon, onPress: () => router.push('/(main)/settings') },
    { label: 'Help & Support', icon: HelpCircle, onPress: () => router.push('/(main)/help') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.neutral[0]} />
      <HeaderComponent openNotifications={() => router.push('/(main)/notifications')} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.profileRow} onPress={() => router.push('/(main)/profile')} activeOpacity={0.8}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profileSubtitle}>View profile</Text>
          </View>
          <ChevronRight size={18} color={colors.neutral[400]} />
        </TouchableOpacity>

        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity key={item.label} style={styles.menuRow} onPress={item.onPress} activeOpacity={0.7}>
              <View style={styles.menuIconCircle}>
                <item.icon size={18} color={colors.primary[500]} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={16} color={colors.neutral[400]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <LogOut size={18} color={colors.danger[500]} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[0] },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontFamily: typography.h3.fontFamily, fontSize: 18, color: colors.neutral[0] },
  profileDetails: { flex: 1 },
  profileName: { fontFamily: typography.h3.fontFamily, fontSize: 16, color: colors.neutral[900] },
  profileSubtitle: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[500], marginTop: 2 },
  menuSection: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: { flex: 1, fontFamily: typography.bodyMed.fontFamily, fontSize: 14, color: colors.neutral[900] },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg - 2,
    borderRadius: radius.md,
    backgroundColor: colors.danger[50],
  },
  logoutText: { fontFamily: typography.h3.fontFamily, fontSize: 14, color: colors.danger[500] },
});
