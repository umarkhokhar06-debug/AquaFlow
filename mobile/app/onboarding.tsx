import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Droplet, Truck, Users, MapPin, LucideIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BrandMark from '@/app/components/graphics/BrandMark';
import Tap from '@/app/components/Tap';
import { Button } from '@/app/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

const ONBOARDING_SEEN_KEY = '@aabrahat/onboarding_seen';

interface Slide {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}

const SLIDES: Slide[] = [
  {
    icon: Droplet,
    title: 'See your tank level, live',
    subtitle: "Check your water tank's level in real time — from anywhere, anytime.",
  },
  {
    icon: Truck,
    title: 'Order a tanker in one tap',
    subtitle: 'Order before you run low, with verified drivers in your area.',
  },
  {
    icon: Users,
    title: 'One account, whole house',
    subtitle: 'Owner, tenants, family — everyone joins with a single QR scan.',
  },
];

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === 'true';
  } catch {
    return false;
  }
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;
  const current = SLIDES[slide];

  const finish = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch {
      // Non-critical -- worst case onboarding shows again next launch.
    }
    router.replace('/auth/choice');
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <BrandMark size={22} />
        <Text style={styles.brandName}>AabRahat</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <current.icon size={36} color={colors.primary[500]} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Tap key={i} onPress={() => setSlide(i)} haptics={false}>
              <View style={[styles.dot, i === slide && styles.dotActive]} />
            </Tap>
          ))}
        </View>

        <View style={styles.servingPill}>
          <MapPin size={14} color={colors.primary[500]} />
          <Text style={styles.servingText}>Now serving Gulzar-e-Quaid, Rawalpindi</Text>
        </View>

        <Button
          label={isLast ? 'Get started' : 'Next'}
          size="lg"
          onPress={isLast ? finish : () => setSlide(slide + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[50],
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 56,
    paddingHorizontal: spacing.xxl,
  },
  brandName: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 15,
    color: colors.neutral[900],
    letterSpacing: -0.2,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: colors.neutral[0],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 21,
    color: colors.neutral[900],
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: 13.5,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xxl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral[200],
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary[500],
  },
  servingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderColor: colors.neutral[100],
    borderRadius: radius.md,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  servingText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: colors.neutral[500],
  },
});
