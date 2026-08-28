import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Home as HomeIcon, QrCode, ChevronRight } from 'lucide-react-native';
import BrandMark from '@/app/components/graphics/BrandMark';
import { Card } from '@/app/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

export default function SignInChoiceScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <BrandMark size={34} />
      <Text style={styles.title}>Welcome to AabRahat</Text>
      <Text style={styles.subtitle}>Choose how you&apos;d like to get started.</Text>

      <Card onPress={() => router.push('/auth/signup')} style={styles.optionCard}>
        <View style={styles.optionRow}>
          <View style={[styles.optionIcon, { backgroundColor: colors.primary[50] }]}>
            <HomeIcon size={20} color={colors.primary[500]} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>New sign-in</Text>
            <Text style={styles.optionSubtitle}>Set up a new house account — you&apos;ll be the owner</Text>
          </View>
          <ChevronRight size={17} color={colors.neutral[400]} />
        </View>
      </Card>

      <Card
        onPress={() => router.push({ pathname: '/auth/login', params: { redirectAfterLogin: 'scan-invite' } })}
        style={styles.optionCard}
      >
        <View style={styles.optionRow}>
          <View style={[styles.optionIcon, { backgroundColor: colors.primary[100] }]}>
            <QrCode size={20} color={colors.primary[600]} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Join with a QR code</Text>
            <Text style={styles.optionSubtitle}>Sign in, then scan a code from your house owner to join</Text>
          </View>
          <ChevronRight size={17} color={colors.neutral[400]} />
        </View>
      </Card>

      <View style={{ flex: 1 }} />
      <Text style={styles.footerText}>
        By continuing you agree to AabRahat&apos;s Terms &amp; Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    paddingTop: 60,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.neutral[900],
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13.5,
    color: colors.neutral[500],
    marginBottom: spacing.xxxl,
    lineHeight: 20,
  },
  optionCard: {
    marginBottom: spacing.lg,
    borderColor: colors.neutral[100],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 14.5,
    color: colors.neutral[900],
  },
  optionSubtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
    lineHeight: 18,
  },
  footerText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11.5,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 18,
  },
});
