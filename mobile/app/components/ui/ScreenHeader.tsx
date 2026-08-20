import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, LucideIcon } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  tone?: 'flat' | 'gradient';
  onBack?: () => void;
  rightAction?: {
    icon: LucideIcon;
    onPress: () => void;
    badgeCount?: number;
  };
}

export default function ScreenHeader({ title, subtitle, tone = 'flat', onBack, rightAction }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const isGradient = tone === 'gradient';
  const textColor = isGradient ? colors.neutral[0] : colors.neutral[900];
  const subtitleColor = isGradient ? colors.primary[50] : colors.neutral[500];
  const iconColor = isGradient ? colors.neutral[0] : colors.neutral[900];
  const buttonBg = isGradient ? 'rgba(255,255,255,0.2)' : colors.neutral[50];

  const content = (
    <View style={[styles.row, { paddingTop: insets.top + spacing.md }]}>
      {onBack ? (
        <TouchableOpacity style={[styles.iconButton, { backgroundColor: buttonBg }]} onPress={onBack}>
          <ArrowLeft size={20} color={iconColor} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subtitleColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightAction ? (
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: buttonBg }]}
          onPress={rightAction.onPress}
        >
          <rightAction.icon size={20} color={iconColor} />
          {!!rightAction.badgeCount && rightAction.badgeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {rightAction.badgeCount > 9 ? '9+' : rightAction.badgeCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );

  if (isGradient) {
    return (
      <LinearGradient colors={[colors.primary[500], colors.primary[700]]} style={styles.wrapper}>
        {content}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.wrapper, styles.flatWrapper]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  flatWrapper: {
    backgroundColor: colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
  },
  subtitle: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    backgroundColor: colors.danger[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontFamily: typography.label.fontFamily,
    fontSize: 9,
    color: colors.neutral[0],
  },
});
