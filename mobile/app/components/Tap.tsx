import { ReactNode } from 'react';
import { GestureResponderEvent, Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface TapProps {
  children: ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
  haptics?: boolean;
}

// Shared press-feedback primitive: every tappable surface in the app (Button,
// Card, and any bespoke row/chip) should route through this so press
// feedback is consistent instead of each screen inventing its own.
export default function Tap({ children, onPress, style, disabled, scaleTo = 0.965, haptics = true }: TapProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(scaleTo, { duration: 80 });
    if (haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220 });
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View style={[animatedStyle, disabled && { opacity: 0.5 }, style]}>{children}</Animated.View>
    </Pressable>
  );
}
