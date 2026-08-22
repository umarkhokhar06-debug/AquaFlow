import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  Settings as SettingsIcon
} from 'lucide-react-native';
import { authAPI, storage } from '@/utils/auth';
import { Button, TextField } from '@/app/components/ui';
import { colors, spacing, typography } from '@/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = () => {
    Alert.alert(
      'Change Password',
      'You will be redirected to change your password.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => console.log('Navigate to change password') }
      ]
    );
  };

  const handleDeleteAccount = () => {
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Password required', 'Enter your password to confirm account deletion.');
      return;
    }
    setDeleting(true);
    try {
      const userData = await storage.getUserData();
      if (!userData?.token) {
        throw new Error('You are not logged in');
      }
      await authAPI.deleteAccount(userData.token, deletePassword);
      setShowDeleteModal(false);
      await storage.clearUserData();
      router.replace('/auth/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      Alert.alert('Could not delete account', message);
    } finally {
      setDeleting(false);
    }
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showArrow = true, 
    rightComponent 
  }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>
          {icon}
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && <ChevronRight size={20} color="#6B7280" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={['#087EA4', '#063B5C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<Bell size={20} color="#087EA4" />}
              title="Push Notifications"
              subtitle="Receive order updates and alerts"
              showArrow={false}
              rightComponent={
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#E5E7EB', true: '#087EA4' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingItem
              icon={<Volume2 size={20} color="#087EA4" />}
              title="Sound & Vibration"
              subtitle="Enable notification sounds"
              showArrow={false}
              rightComponent={
                <Switch
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#087EA4' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
          </View>
        </View>

        {/* Account & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Security</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<Lock size={20} color="#FF6B35" />}
              title="Change Password"
              subtitle="Update your account password"
              onPress={handleChangePassword}
            />
            {/* <SettingItem
              icon={<Shield size={20} color="#28A745" />}
              title="Privacy Settings"
              subtitle="Manage your privacy preferences"
              onPress={() => console.log('Privacy settings')}
            />
            <SettingItem
              icon={<Smartphone size={20} color="#9333EA" />}
              title="Two-Factor Authentication"
              subtitle="Add an extra layer of security"
              onPress={() => console.log('2FA settings')}
            /> */}
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<Moon size={20} color="#6B7280" />}
              title="Dark Mode"
              subtitle="Switch to dark theme"
              showArrow={false}
              rightComponent={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#E5E7EB', true: '#087EA4' }}
                  thumbColor="#FFFFFF"
                />
              }
            />
            <SettingItem
              icon={<Globe size={20} color="#087EA4" />}
              title="Language"
              subtitle="English"
              onPress={() => console.log('Language settings')}
            />
          </View>
        </View>

        {/* Tank Monitoring Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tank Monitoring</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<SettingsIcon size={20} color="#087EA4" />}
              title="My Devices"
              subtitle="View tank devices and manage tenant access"
              onPress={() => router.push('/(main)/calibration-settings')}
            />
          </View>
        </View>

        {/* Support & About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & About</Text>
          <View style={styles.settingGroup}>
            <SettingItem
              icon={<HelpCircle size={20} color="#087EA4" />}
              title="Help & Support"
              subtitle="Get help and contact support"
              onPress={() => router.push('/(main)/help')}
            />
            <SettingItem
              icon={<Star size={20} color="#FFB800" />}
              title="Rate App"
              subtitle="Rate us on the App Store"
              onPress={() => console.log('Rate app')}
            />
            <SettingItem
              icon={<FileText size={20} color="#6B7280" />}
              title="Terms & Privacy"
              subtitle="Read our terms and privacy policy"
              onPress={() => console.log('Terms & Privacy')}
            />
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.settingGroup}>
            <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
              <Text style={styles.dangerText}>Delete Account</Text>
              <Text style={styles.dangerSubtext}>Permanently delete your account and data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App Version */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>AabRahat v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2026 AabRahat. All rights reserved.</Text>
        </View>
      </ScrollView>

      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>Delete your account?</Text>
            <Text style={modalStyles.subtitle}>
              This permanently deletes your AabRahat account and profile data. This cannot be undone. Enter your
              password to confirm.
            </Text>
            <TextField
              placeholder="Password"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureToggle
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={modalStyles.actions}>
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setShowDeleteModal(false)}
                style={modalStyles.actionButton}
                disabled={deleting}
              />
              <Button
                label={deleting ? 'Deleting...' : 'Delete Account'}
                variant="danger"
                loading={deleting}
                onPress={confirmDeleteAccount}
                style={modalStyles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: 20,
    padding: spacing.xl,
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    color: colors.neutral[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    color: colors.neutral[500],
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});

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
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
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
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  settingGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    backgroundColor: '#F8F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    marginBottom: 2,
  },
  dangerSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#991B1B',
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});