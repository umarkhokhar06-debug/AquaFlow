import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';
import Tap from '@/app/components/Tap';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
}

export default function Card({ children, style, padded = true, onPress }: CardProps) {
  if (onPress) {
    return (
      <Tap onPress={onPress} style={[styles.card, padded && styles.padded, style]}>
        {children}
      </Tap>
    );
  }
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[100],
    ...shadow.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
