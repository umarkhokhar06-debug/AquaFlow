import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // outline/ghost normally use primary-colored text+border, which
  // disappears when the button sits on a colored/gradient surface (e.g.
  // the auth screens' blue background) instead of the usual white one.
  onDark?: boolean;
}

const SIZE_STYLES: Record<Size, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, fontSize: 13 },
  md: { paddingVertical: 14, paddingHorizontal: spacing.xl, fontSize: 15 },
  lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xxl, fontSize: 16 },
};

const VARIANT_STYLES: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary[500], text: colors.neutral[0] },
  secondary: { bg: colors.primary[50], text: colors.primary[600] },
  outline: { bg: 'transparent', text: colors.primary[600], border: colors.primary[500] },
  ghost: { bg: 'transparent', text: colors.neutral[700] },
  danger: { bg: colors.danger[500], text: colors.neutral[0] },
  warning: { bg: colors.warning[500], text: colors.neutral[0] },
};

const ON_DARK_VARIANT_STYLES: Partial<Record<Variant, { bg: string; text: string; border?: string }>> = {
  outline: { bg: 'transparent', text: colors.neutral[0], border: colors.neutral[0] },
  ghost: { bg: 'transparent', text: colors.neutral[0] },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  onDark = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sizeStyle = SIZE_STYLES[size];
  const variantStyle = (onDark && ON_DARK_VARIANT_STYLES[variant]) || VARIANT_STYLES[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
          borderWidth: variantStyle.border ? 1 : 0,
          paddingVertical: sizeStyle.paddingVertical,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.text} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: variantStyle.text, fontSize: sizeStyle.fontSize }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: typography.h3.fontFamily,
  },
});
