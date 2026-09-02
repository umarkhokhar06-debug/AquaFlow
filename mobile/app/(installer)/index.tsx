import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wrench, MapPin, Phone, LogOut } from 'lucide-react-native';
import { ScreenHeader, Card, EmptyState } from '@/app/components/ui';
import { getMyInstallationJobs, InstallationRequest } from '@/utils/installationAPI';
import { storage } from '@/utils/auth';
import { colors, spacing, typography } from '@/theme';

export default function InstallerJobsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<InstallationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getMyInstallationJobs();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching installation jobs:', error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchJobs();
      setLoading(false);
    })();
  }, [fetchJobs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await storage.clearUserData();
    router.replace('/auth/login');
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="My Installation Jobs"
        tone="gradient"
        rightAction={{ icon: LogOut, onPress: handleLogout }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {jobs.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No jobs assigned"
              subtitle="Installation visits assigned to you will show up here."
            />
          ) : (
            jobs.map((job) => (
              <Card key={job._id} onPress={() => router.push(`/(installer)/job/${job._id}`)} style={styles.jobCard}>
                <Text style={styles.jobName}>{job.requestedBy?.fullName || job.requestedBy?.name}</Text>
                <View style={styles.jobRow}>
                  <MapPin size={14} color={colors.neutral[400]} />
                  <Text style={styles.jobDetail} numberOfLines={2}>{job.address || job.requestedBy?.address || 'No address provided'}</Text>
                </View>
                {(job.contactPhone || job.requestedBy?.phoneNumber) && (
                  <View style={styles.jobRow}>
                    <Phone size={14} color={colors.neutral[400]} />
                    <Text style={styles.jobDetail}>{job.contactPhone || job.requestedBy?.phoneNumber}</Text>
                  </View>
                )}
                {job.notes ? <Text style={styles.jobNotes} numberOfLines={2}>"{job.notes}"</Text> : null}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.neutral[50] },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: spacing.lg, gap: spacing.sm },
  jobCard: { borderColor: colors.neutral[200] },
  jobName: { fontFamily: typography.h3.fontFamily, fontSize: 15, color: colors.neutral[900], marginBottom: spacing.xs },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  jobDetail: { flex: 1, fontFamily: typography.body.fontFamily, fontSize: 13, color: colors.neutral[500] },
  jobNotes: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: colors.neutral[400], marginTop: spacing.sm, fontStyle: 'italic' },
});
