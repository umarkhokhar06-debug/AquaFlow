import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplets } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/auth/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient colors={[colors.primary[500], colors.primary[700]]} style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconContainer}>
          <Droplets size={60} color={colors.neutral[0]} />
        </View>
        <Text style={styles.title}>AabRahat</Text>
        <Text style={styles.subtitle}>Smart Water Delivery</Text>
      </View>
      <Text style={styles.version}>Version 1.0.0</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.fontSize,
    color: colors.neutral[0],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  version: {
    position: 'absolute',
    bottom: 50,
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
