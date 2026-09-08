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
import { colors, typography } from '@/theme';

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
          [{ text: 'OK', onPress: () => router.replace('/(main)/tank-monitoring') }]
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
            <ArrowLeft size={22} color={colors.neutral[900]} />
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
            placeholderTextColor={colors.neutral[400]}
          />
          <TouchableOpacity
            style={[styles.redeemButton, redeeming && styles.redeemButtonDisabled]}
            onPress={() => redeem(manualCode.trim())}
            disabled={redeeming || !manualCode.trim()}
          >
            {redeeming ? <ActivityIndicator color={colors.neutral[0]} /> : <Text style={styles.redeemButtonText}>Redeem</Text>}
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
        <ActivityIndicator size="large" color={colors.primary[500]} />
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
          <ArrowLeft size={22} color={colors.neutral[0]} />
        </TouchableOpacity>

        <View style={styles.frameWrap}>
          <View style={styles.frame} />
          <Text style={styles.hint}>
            {redeeming ? 'Joining device...' : 'Point your camera at the invite QR code'}
          </Text>
          {redeeming && <ActivityIndicator color={colors.neutral[0]} style={{ marginTop: 12 }} />}
        </View>

        <TouchableOpacity style={styles.manualToggle} onPress={() => setManualMode(true)}>
          <Keyboard size={16} color={colors.neutral[0]} />
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
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[900],
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
    backgroundColor: colors.neutral[100],
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
    borderColor: colors.neutral[0],
    marginBottom: 20,
  },
  hint: {
    fontSize: 14,
    fontFamily: typography.bodyMed.fontFamily,
    color: colors.neutral[0],
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
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[0],
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.neutral[0],
  },
  manualTitle: {
    fontSize: 17,
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[900],
  },
  manualBody: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  manualLabel: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[500],
    marginBottom: 10,
  },
  manualInput: {
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontFamily: typography.body.fontFamily,
    color: colors.neutral[900],
    borderWidth: 1,
    borderColor: colors.neutral[200],
    marginBottom: 20,
  },
  redeemButton: {
    backgroundColor: colors.primary[500],
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
    fontFamily: typography.h3.fontFamily,
    color: colors.neutral[0],
  },
  switchModeText: {
    fontSize: 13,
    fontFamily: typography.bodyMed.fontFamily,
    color: colors.primary[500],
    textAlign: 'center',
  },
});
