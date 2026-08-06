import { useState, useEffect, useCallback } from 'react';
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
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, UserPlus, UserMinus, Users, QrCode, Clock, ScanLine } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { getMyDevices, addTenant, removeTenant, createDeviceInvite, Device } from '@/utils/iotAPI';

type AddMode = 'email' | 'phone';

export default function ManageDeviceAccessScreen() {
  const router = useRouter();
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [fetching, setFetching] = useState(true);

  const [addMode, setAddMode] = useState<AddMode>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [invite, setInvite] = useState<{ token: string; expiresAt: string } | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const loadDevice = useCallback(async () => {
    try {
      setFetching(true);
      const response = await getMyDevices();
      if (response.success) {
        const match = response.devices.find((d) => d.deviceId === deviceId) || null;
        setDevice(match);
      }
    } catch (error) {
      console.log('Error fetching device:', error);
    } finally {
      setFetching(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadDevice();
  }, [loadDevice]);

  const handleAddTenant = async () => {
    if (!device) return;

    const value = addMode === 'email' ? email.trim().toLowerCase() : phoneNumber.trim();
    if (!value) {
      Alert.alert('Validation Error', addMode === 'email' ? 'Please enter an email address' : 'Please enter a phone number');
      return;
    }

    try {
      setSubmitting(true);
      await addTenant(device._id, addMode === 'email' ? { email: value } : { phoneNumber: value });
      setEmail('');
      setPhoneNumber('');
      await loadDevice();
      Alert.alert('Success', `${value} can now view this device's water level.`);
    } catch (error: any) {
      Alert.alert(
        "Couldn't add tenant",
        error.message || 'Failed to add tenant',
        [
          { text: 'OK', style: 'cancel' },
          { text: 'Generate invite QR instead', onPress: handleGenerateInvite },
        ]
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!device) return;
    try {
      setGeneratingInvite(true);
      const response = await createDeviceInvite(device._id);
      setInvite({ token: response.token, expiresAt: response.expiresAt });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate invite');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleShareInvite = async () => {
    if (!invite || !device) return;
    try {
      await Share.share({
        message: `You've been invited to view "${device.name}" at ${device.houseLabel} on AquaFlow.\n\nOpen the app, go to My Devices → Scan Invite, and scan the QR code, or enter this code manually:\n\n${invite.token}\n\n(Expires ${new Date(invite.expiresAt).toLocaleString()})`,
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleRemoveTenant = (tenantUserId: string, tenantName: string) => {
    if (!device) return;
    Alert.alert(
      'Remove Access',
      `Remove ${tenantName}'s access to this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTenant(device._id, tenantUserId);
              await loadDevice();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove tenant');
            }
          },
        },
      ]
    );
  };

  if (fetching) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.loadingText}>Device not found, or you don't own it.</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#007AFF', '#0056CC']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Access</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <Users size={24} color="#007AFF" />
          <Text style={styles.infoTitle}>{device.name}</Text>
          <Text style={styles.infoText}>{device.houseLabel}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Add a tenant</Text>
          <Text style={styles.description}>
            They'll be able to see this device's live water level, but won't be able to
            change calibration or remove other people's access. They need an AquaFlow
            account already — if they don't have one yet, use the invite QR below instead.
          </Text>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, addMode === 'email' && styles.modeButtonActive]}
              onPress={() => setAddMode('email')}
            >
              <Text style={[styles.modeButtonText, addMode === 'email' && styles.modeButtonTextActive]}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, addMode === 'phone' && styles.modeButtonActive]}
              onPress={() => setAddMode('phone')}
            >
              <Text style={[styles.modeButtonText, addMode === 'phone' && styles.modeButtonTextActive]}>Phone Number</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addRow}>
            {addMode === 'email' ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="tenant@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="03xx xxxxxxx"
                keyboardType="phone-pad"
                placeholderTextColor="#9CA3AF"
              />
            )}
            <TouchableOpacity
              style={[styles.addButton, submitting && styles.addButtonDisabled]}
              onPress={handleAddTenant}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <UserPlus size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inviteHeader}>
            <QrCode size={20} color="#007AFF" />
            <Text style={[styles.label, { marginBottom: 0, marginLeft: 8 }]}>Invite by QR code</Text>
          </View>
          <Text style={styles.description}>
            For a tenant without an account yet: they sign up in the app, then scan this
            code (My Devices → Scan Invite) to get access instantly — no need to know
            their email or phone number up front.
          </Text>

          {!invite ? (
            <TouchableOpacity
              style={[styles.generateButton, generatingInvite && styles.addButtonDisabled]}
              onPress={handleGenerateInvite}
              disabled={generatingInvite}
            >
              {generatingInvite ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <QrCode size={16} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generate Invite Code</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.inviteBlock}>
              <View style={styles.qrWrap}>
                <QRCode
                  value={JSON.stringify({ type: 'aquaflow-device-invite', token: invite.token })}
                  size={180}
                />
              </View>
              <View style={styles.expiryRow}>
                <Clock size={13} color="#9CA3AF" />
                <Text style={styles.expiryText}>
                  Expires {new Date(invite.expiresAt).toLocaleString()} · single use
                </Text>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
                  <Text style={styles.shareButtonText}>Share Invite</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.regenButton} onPress={handleGenerateInvite}>
                  <Text style={styles.regenButtonText}>New Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.scanLink}
            onPress={() => router.push('/(main)/scan-invite')}
          >
            <ScanLine size={14} color="#007AFF" />
            <Text style={styles.scanLinkText}>Have an invite code yourself? Scan it here</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>People with access</Text>

          <View style={styles.tenantRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.tenantName}>{device.owner.name}</Text>
              <Text style={styles.tenantEmail}>{device.owner.email}</Text>
            </View>
            <View style={styles.ownerBadge}>
              <Text style={styles.ownerBadgeText}>Owner</Text>
            </View>
          </View>

          {device.tenants.length === 0 && (
            <Text style={styles.emptyText}>No tenants added yet.</Text>
          )}

          {device.tenants.map((tenant) => (
            <View key={tenant.user._id} style={styles.tenantRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tenantName}>{tenant.user.name}</Text>
                <Text style={styles.tenantEmail}>{tenant.user.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveTenant(tenant.user._id, tenant.user.name)}
              >
                <UserMinus size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  backLink: {
    marginTop: 16,
  },
  backLinkText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
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
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  formCard: {
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
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  modeButtonTextActive: {
    color: '#007AFF',
    fontFamily: 'Inter-SemiBold',
  },
  addRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  generateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  inviteBlock: {
    alignItems: 'center',
  },
  qrWrap: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  expiryText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  regenButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  regenButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  scanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  scanLinkText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#007AFF',
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tenantName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  tenantEmail: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  ownerBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#1D4ED8',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    paddingVertical: 12,
  },
});
