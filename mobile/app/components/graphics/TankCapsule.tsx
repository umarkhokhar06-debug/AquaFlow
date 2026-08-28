import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { ClipPath, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, typography } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface TankCapsuleProps {
  level: number; // 0-100
  size?: number;
  showLabel?: boolean;
  animated?: boolean;
}

// Builds the water-body path: a wavy top edge (sampled sine wave) closing
// down to the capsule's bottom edge. Combining the fill + wave into one
// path avoids needing two animated SVG nodes.
function buildWaterPath(waterY: number, phase: number) {
  const amplitude = 2.2;
  const points = 11;
  let d = '';
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * 100;
    const y = waterY + amplitude * Math.sin((x / 100) * Math.PI * 2 + phase * Math.PI * 2);
    d += i === 0 ? `M${x},${y} ` : `L${x},${y} `;
  }
  d += `L100,100 L0,100 Z`;
  return d;
}

export default function TankCapsule({ level, size = 96, showLabel = true, animated = true }: TankCapsuleProps) {
  const clamped = Math.max(0, Math.min(100, level));
  const waterY = 100 - clamped;
  const phase = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    phase.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.linear }), -1, false);
  }, [animated]);

  const animatedProps = useAnimatedProps(() => ({
    d: buildWaterPath(waterY, phase.value),
  }));

  const isLarge = size >= 120;
  const labelColor = clamped < 35 ? '#fff' : colors.neutral[900];
  const subLabelColor = clamped < 35 ? '#fff' : colors.neutral[500];

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <ClipPath id="tankClip">
            <Rect x="8" y="6" width="84" height="88" rx="30" ry="30" />
          </ClipPath>
          <LinearGradient id="tankGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={colors.primary[300]} />
            <Stop offset="100%" stopColor={colors.primary[600]} />
          </LinearGradient>
        </Defs>
        <Rect x="8" y="6" width="84" height="88" rx="30" ry="30" fill={colors.primary[50]} stroke={colors.neutral[200]} strokeWidth="1.5" />
        <AnimatedPath animatedProps={animatedProps} fill="url(#tankGradient)" clipPath="url(#tankClip)" opacity={0.95} />
        <Rect x="8" y="6" width="84" height="88" rx="30" ry="30" fill="none" stroke={colors.neutral[900]} strokeOpacity={0.06} strokeWidth="2" />
      </Svg>
      {showLabel && isLarge && (
        <View style={styles.labelWrap} pointerEvents="none">
          <Text style={[styles.percent, { color: labelColor }]}>{Math.round(clamped)}%</Text>
          <Text style={[styles.full, { color: subLabelColor }]}>full</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontFamily: typography.numeric.fontFamily,
    fontSize: 30,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  full: {
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    marginTop: 2,
  },
});
