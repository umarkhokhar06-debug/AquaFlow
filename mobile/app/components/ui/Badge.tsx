import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

// One step more saturated than the 50-tier tint most cards/sections use, so
// a badge never blends into a same-toned card background (e.g. a warning
// badge on a warning-tinted promo card).
const TONE_STYLES: Record<BadgeTone, { bg: string; text: string }> = {
  success: { bg: colors.success[100], text: colors.success[700] },
  warning: { bg: colors.warning[100], text: colors.warning[700] },
  danger: { bg: colors.danger[100], text: colors.danger[700] },
  info: { bg: colors.info[100], text: colors.info[700] },
  neutral: { bg: colors.neutral[100], text: colors.neutral[700] },
};

export default function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const toneStyle = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.bg }]}>
      <Text style={[styles.label, { color: toneStyle.text }]}>{label}</Text>
    </View>
  );
}

// Shared mapping so order-status coloring isn't reimplemented per screen
// (previously duplicated across orders.tsx, order-details/[id].tsx, tracking.tsx).
export function orderStatusTone(status: string): BadgeTone {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'out_for_delivery':
      return 'info';
    case 'preparing':
    case 'confirmed':
      return 'warning';
    default:
      return 'neutral';
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
  },
});
