import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { ArrowLeft, Keyboard } from 'lucide-react-native';
import { redeemDeviceInvite } from '@/utils/iotAPI';

export default function ScanInviteScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [redeeming, setRedeeming] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const scannedRef = useRef(false);

  const redeem = async (token: string) => {
    if (!token) return;
    try {
      setRedeeming(true);
      const response = await redeemDeviceInvite(token);
      if (response.success && response.device) {
        Alert.alert(
          'Access Granted',
          `You can now see "${response.device.name}" at ${response.device.houseLabel}.`,
          [{ text: 'OK', onPress: () => router.replace('/(main)/(tabs)/tank-monitoring') }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to redeem invite');
        scannedRef.current = false;
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'This invite is invalid or expired', [
        { text: 'OK', onPress: () => { scannedRef.current = false; } },
      ]);
    } finally {
      setRedeeming(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scannedRef.current || redeeming) return;
    scannedRef.current = true;

    try {
      const parsed = JSON.parse(result.data);
      if (parsed?.type === 'urbanwaters-device-invite' && parsed.token) {
        redeem(parsed.token);
        return;
      }
    } catch {
      // not JSON — fall through
    }

    // Fall back to treating the raw scanned text as the token itself
    redeem(result.data);
  };

  if (manualMode) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.manualHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.manualTitle}>Enter Invite Code</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.manualBody}>
          <Text style={styles.manualLabel}>Paste or type the invite code you were sent</Text>
          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="e.g. 740967444276b7b19171b61be110772c"
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.redeemButton, redeeming && styles.redeemButtonDisabled]}
            onPress={() => redeem(manualCode.trim())}
            disabled={redeeming || !manualCode.trim()}
          >
            {redeeming ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.redeemButtonText}>Redeem</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setManualMode(false)}>
            <Text style={styles.switchModeText}>Scan a QR code instead</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#087EA4" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.permissionText}>Camera access is needed to scan an invite QR code.</Text>
        <TouchableOpacity style={styles.redeemButton} onPress={requestPermission}>
          <Text style={styles.redeemButtonText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setManualMode(true)} style={{ marginTop: 16 }}>
          <Text style={styles.switchModeText}>Enter code manually instead</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.switchModeText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <TouchableOpacity style={styles.iconButtonLight} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.hint}>
            {redeeming ? 'Joining device...' : 'Point your camera at the invite QR code'}
          </Text>
          {redeeming && <ActivityIndicator color="#FFFFFF" style={{ marginTop: 12 }} />}
        </View>

        <TouchableOpacity style={styles.manualToggle} onPress={() => setManualMode(true)}>
          <Keyboard size={16} color="#FFFFFF" />
          <Text style={styles.manualToggleText}>Enter code manually</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonLight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameWrap: {
    alignItems: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 20,
  },
  hint: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  manualToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  manualToggleText: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  manualTitle: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  manualBody: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  manualLabel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 10,
  },
  manualInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  redeemButton: {
    backgroundColor: '#087EA4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonText: {
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  switchModeText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#087EA4',
    textAlign: 'center',
  },
});
