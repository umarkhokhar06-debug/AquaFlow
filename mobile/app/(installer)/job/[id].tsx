import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Phone } from 'lucide-react-native';
import { ScreenHeader, Card, Button, TextField } from '@/app/components/ui';
import CustomAlert from '@/app/components/CustomAlert';
import { getInstallationById, completeInstallation, InstallationRequest } from '@/utils/installationAPI';
import { colors, spacing, typography } from '@/theme';

export default function InstallerJobDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [job, setJob] = useState<InstallationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultAlert, setResultAlert] = useState<{ title: string; message: string; onClose?: () => void } | null>(null);

  const [deviceId, setDeviceId] = useState('');
  const [houseLabel, setHouseLabel] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [numberOfUsers, setNumberOfUsers] = useState('');
  const [tankLengthCm, setTankLengthCm] = useState('');
  const [tankWidthCm, setTankWidthCm] = useState('');
  const [tankHeightCm, setTankHeightCm] = useState('');
  const [tankDepth, setTankDepth] = useState('');
  const [tankFullDistance, setTankFullDistance] = useState('');
  const [tankCapacityLiters, setTankCapacityLiters] = useState('');
  const [expectedMonthlyDemand, setExpectedMonthlyDemand] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getInstallationById(id);
        setJob(data);
        setOwnerName(data.requestedBy?.fullName || data.requestedBy?.name || '');
      } catch (error) {
        console.error('Error fetching installation job:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const canSubmit = !!deviceId.trim() && !!houseLabel.trim() && !!tankDepth && !!tankFullDistance;

  const handleComplete = async () => {
    if (!id || !canSubmit) return;
    setSubmitting(true);
    try {
      await completeInstallation(id, {
        deviceId: deviceId.trim(),
        houseLabel: houseLabel.trim(),
        ownerName: ownerName.trim() || undefined,
        numberOfUsers: numberOfUsers ? Number(numberOfUsers) : undefined,
        tankLengthCm: tankLengthCm ? Number(tankLengthCm) : undefined,
        tankWidthCm: tankWidthCm ? Number(tankWidthCm) : undefined,
        tankHeightCm: tankHeightCm ? Number(tankHeightCm) : undefined,
        tank_depth: Number(tankDepth),
        tank_full_distance: Number(tankFullDistance),
        tankCapacityLiters: tankCapacityLiters ? Number(tankCapacityLiters) : undefined,
        expectedMonthlyDemand: expectedMonthlyDemand ? Number(expectedMonthlyDemand) : undefined,
      });
      setResultAlert({
        title: 'Installation complete',
        message: 'The device has been created and connected to the customer\'s account.',
        onClose: () => router.replace('/(installer)'),
      });
    } catch (error) {
      setResultAlert({
        title: 'Could not complete installation',
        message: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Installation Visit" tone="gradient" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Card style={styles.customerCard}>
          <Text style={styles.customerName}>{job?.requestedBy?.fullName || job?.requestedBy?.name}</Text>
          <View style={styles.customerRow}>
            <MapPin size={14} color={colors.neutral[400]} />
            <Text style={styles.customerDetail}>{job?.address || job?.requestedBy?.address || 'No address provided'}</Text>
          </View>
          {(job?.contactPhone || job?.requestedBy?.phoneNumber) && (
            <View style={styles.customerRow}>
              <Phone size={14} color={colors.neutral[400]} />
              <Text style={styles.customerDetail}>{job?.contactPhone || job?.requestedBy?.phoneNumber}</Text>
            </View>
          )}
          {job?.notes ? <Text style={styles.customerNotes}>"{job.notes}"</Text> : null}
        </Card>

        <Text style={styles.sectionLabel}>Device</Text>
        <TextField label="Device ID" placeholder="e.g. TANK-0042" autoCapitalize="characters" value={deviceId} onChangeText={setDeviceId} />
        <TextField label="House label" placeholder="e.g. Ahmed residence, Block 4" value={houseLabel} onChangeText={setHouseLabel} />
        <TextField label="Owner name" value={ownerName} onChangeText={setOwnerName} />
        <TextField label="Number of users on this supply" keyboardType="number-pad" value={numberOfUsers} onChangeText={setNumberOfUsers} />

        <Text style={styles.sectionLabel}>Tank dimensions</Text>
        <View style={styles.row}>
          <View style={styles.rowItem}><TextField label="Length (cm)" keyboardType="number-pad" value={tankLengthCm} onChangeText={setTankLengthCm} /></View>
          <View style={styles.rowItem}><TextField label="Width (cm)" keyboardType="number-pad" value={tankWidthCm} onChangeText={setTankWidthCm} /></View>
        </View>
        <TextField label="Height (cm)" keyboardType="number-pad" value={tankHeightCm} onChangeText={setTankHeightCm} />

        <Text style={styles.sectionLabel}>Sensor calibration</Text>
        <View style={styles.row}>
          <View style={styles.rowItem}><TextField label="Tank depth (cm) *" keyboardType="number-pad" value={tankDepth} onChangeText={setTankDepth} /></View>
          <View style={styles.rowItem}><TextField label="Full distance (cm) *" keyboardType="number-pad" value={tankFullDistance} onChangeText={setTankFullDistance} /></View>
        </View>
        <TextField label="Tank capacity (liters)" keyboardType="number-pad" value={tankCapacityLiters} onChangeText={setTankCapacityLiters} />

        <Text style={styles.sectionLabel}>Planning</Text>
        <TextField label="Expected monthly demand (liters)" keyboardType="number-pad" value={expectedMonthlyDemand} onChangeText={setExpectedMonthlyDemand} />

        <Button
          label={submitting ? 'Completing…' : 'Confirm device installed'}
          onPress={handleComplete}
          disabled={!canSubmit || submitting}
          loading={submitting}
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>

      <CustomAlert
        visible={!!resultAlert}
        title={resultAlert?.title || ''}
        message={resultAlert?.message || ''}
        onClose={() => {
          const onClose = resultAlert?.onClose;
          setResultAlert(null);
          onClose?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutral[50] },
  scrollContent: { padding: spacing.lg },
  customerCard: { borderColor: colors.neutral[200], marginBottom: spacing.lg },
  customerName: { fontFamily: typography.h3.fontFamily, fontSize: 16, color: colors.neutral[900], marginBottom: spacing.xs },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  customerDetail: { flex: 1, fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.neutral[500] },
  customerNotes: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[400], marginTop: spacing.sm, fontStyle: 'italic' },
  sectionLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: 12.5,
    color: colors.neutral[500],
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  rowItem: { flex: 1 },
  submitButton: { marginTop: spacing.md },
});
