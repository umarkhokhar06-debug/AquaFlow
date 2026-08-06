import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Gauge, Users, Wifi, WifiOff, ScanLine } from 'lucide-react-native';
import { getMyDevices, Device } from '@/utils/iotAPI';
import { storage } from '@/utils/auth';

export default function DeviceListScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setFetching(true);
      const userData = await storage.getUserData();
      setCurrentUserId(userData?.user?.id || null);

      const response = await getMyDevices();
      if (response.success) {
        setDevices(response.devices);
      }
    } catch (error) {
      console.log('Error fetching devices:', error);
    } finally {
      setFetching(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your devices...</Text>
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
          <Text style={styles.headerTitle}>My Devices</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(main)/scan-invite')}>
            <ScanLine size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {devices.length === 0 && (
          <TouchableOpacity style={styles.scanInviteCard} onPress={() => router.push('/(main)/scan-invite')}>
            <ScanLine size={22} color="#007AFF" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.scanInviteTitle}>Have an invite code?</Text>
              <Text style={styles.scanInviteText}>Scan the QR someone shared with you to get access to their device.</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.infoCard}>
          <Gauge size={24} color="#007AFF" />
          <Text style={styles.infoTitle}>Tank Calibration</Text>
          <Text style={styles.infoText}>
            Calibration is set by the admin when a device is installed, so readings
            stay consistent with what the sensor actually reports. If a value looks
            wrong, contact support to have it recalibrated.
          </Text>
        </View>

        {devices.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No devices are linked to your account yet.</Text>
          </View>
        )}

        {devices.map((device) => {
          const isOwner = device.owner._id === currentUserId;
          return (
            <View key={device._id} style={styles.deviceCard}>
              <View style={styles.deviceHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceHouse}>{device.houseLabel}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: device.status === 'active' ? '#D1FAE5' : '#FEE2E2' }]}>
                  {device.status === 'active' ? <Wifi size={12} color="#10B981" /> : <WifiOff size={12} color="#EF4444" />}
                  <Text style={[styles.statusText, { color: device.status === 'active' ? '#10B981' : '#EF4444' }]}>
                    {device.status}
                  </Text>
                </View>
              </View>

              <View style={styles.calibrationRow}>
                <View style={styles.calibrationItem}>
                  <Text style={styles.calibrationLabel}>Tank Depth</Text>
                  <Text style={styles.calibrationValue}>{device.calibration.tank_depth} cm</Text>
                </View>
                <View style={styles.calibrationItem}>
                  <Text style={styles.calibrationLabel}>Full Distance</Text>
                  <Text style={styles.calibrationValue}>{device.calibration.tank_full_distance} cm</Text>
                </View>
                <View style={styles.calibrationItem}>
                  <Text style={styles.calibrationLabel}>Capacity</Text>
                  <Text style={styles.calibrationValue}>{device.tankCapacityLiters} L</Text>
                </View>
                <View style={styles.calibrationItem}>
                  <Text style={styles.calibrationLabel}>Alert Below</Text>
                  <Text style={styles.calibrationValue}>{device.lowWaterThreshold}%</Text>
                </View>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.roleText}>
                  {isOwner ? 'You own this device' : 'You have tenant access'}
                </Text>
                {isOwner && (
                  <TouchableOpacity
                    style={styles.manageButton}
                    onPress={() => router.push({ pathname: '/(main)/manage-device-access', params: { deviceId: device.deviceId } })}
                  >
                    <Users size={14} color="#007AFF" />
                    <Text style={styles.manageButtonText}>Manage Access</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanInviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  scanInviteTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  scanInviteText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  deviceCard: {
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
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  deviceHouse: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  calibrationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  calibrationItem: {
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  calibrationLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  calibrationValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageButtonText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
});
