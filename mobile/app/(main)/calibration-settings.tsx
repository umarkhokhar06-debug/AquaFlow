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
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Save, Settings } from 'lucide-react-native';
import { getCalibration, setCalibration } from '@/utils/iotAPI';

export default function CalibrationSettingsScreen() {
  const router = useRouter();
  const [tankDepth, setTankDepth] = useState('');
  const [tankFullDistance, setTankFullDistance] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchCalibration();
  }, []);

  const fetchCalibration = async () => {
    try {
      setFetching(true);
      const response = await getCalibration();
      if (response.success && response.calibration) {
        setTankDepth(response.calibration.tank_depth.toString());
        setTankFullDistance(response.calibration.tank_full_distance.toString());
      }
    } catch (error) {
      console.log('No calibration found or error fetching:', error);
      // It's okay if there's no calibration yet
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    const depth = parseFloat(tankDepth);
    const fullDistance = parseFloat(tankFullDistance);

    if (!tankDepth || !tankFullDistance) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    if (isNaN(depth) || isNaN(fullDistance)) {
      Alert.alert('Validation Error', 'Please enter valid numbers');
      return;
    }

    if (depth <= 0 || fullDistance < 0) {
      Alert.alert('Validation Error', 'Values must be positive numbers');
      return;
    }

    if (fullDistance >= depth) {
      Alert.alert(
        'Validation Error',
        'Tank full distance must be less than tank depth'
      );
      return;
    }

    try {
      setLoading(true);
      const response = await setCalibration(depth, fullDistance);
      
      if (response.success) {
        Alert.alert(
          'Success',
          'Calibration settings saved successfully',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to save calibration');
      }
    } catch (error) {
      console.error('Error saving calibration:', error);
      Alert.alert('Error', 'Failed to save calibration settings');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading calibration settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#007AFF', '#0056CC']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tank Calibration</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Settings size={24} color="#007AFF" />
          <Text style={styles.infoTitle}>Calibration Settings</Text>
          <Text style={styles.infoText}>
            Configure your tank sensor calibration values to ensure accurate water
            level readings. Tank depth is the total height of your tank, and tank
            full distance is the sensor reading when the tank is full.
          </Text>
        </View>

        {/* Calibration Form */}
        <View style={styles.formCard}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tank Depth (cm)</Text>
            <Text style={styles.description}>
              Total height of the water tank in centimeters
            </Text>
            <TextInput
              style={styles.input}
              value={tankDepth}
              onChangeText={setTankDepth}
              placeholder="e.g., 100"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tank Full Distance (cm)</Text>
            <Text style={styles.description}>
              Sensor distance reading when tank is completely full
            </Text>
            <TextInput
              style={styles.input}
              value={tankFullDistance}
              onChangeText={setTankFullDistance}
              placeholder="e.g., 10"
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Calculation Example */}
          {tankDepth && tankFullDistance && (
            <View style={styles.exampleCard}>
              <Text style={styles.exampleTitle}>Current Configuration</Text>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Tank Depth:</Text>
                <Text style={styles.exampleValue}>{tankDepth} cm</Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Full Distance:</Text>
                <Text style={styles.exampleValue}>{tankFullDistance} cm</Text>
              </View>
              <View style={styles.exampleRow}>
                <Text style={styles.exampleLabel}>Usable Depth:</Text>
                <Text style={styles.exampleValue}>
                  {(parseFloat(tankDepth) - parseFloat(tankFullDistance)).toFixed(1)} cm
                </Text>
              </View>
            </View>
          )}
        </View>

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
              <Text style={styles.saveButtonText}>Save Calibration</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Help Text */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>💡 Calibration Tips</Text>
          <Text style={styles.helpText}>
            • Measure your tank height from bottom to the sensor position{'\n'}
            • The full distance should be the sensor reading when water touches the sensor{'\n'}
            • Make sure the sensor is mounted securely at the top of the tank{'\n'}
            • Recalibrate if you move or adjust the sensor position
          </Text>
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
  formGroup: {
    marginBottom: 24,
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
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exampleCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  exampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  exampleLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  exampleValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginLeft: 8,
  },
  helpCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  helpTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#78350F',
    lineHeight: 22,
  },
});
