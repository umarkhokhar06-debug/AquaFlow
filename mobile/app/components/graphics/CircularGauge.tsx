import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, typography } from '@/theme';

interface CircularGaugeProps {
  level: number; // 0-100
  size?: number;
  strokeWidth?: number;
  trackColor?: string;
  progressColor?: string;
  innerColor?: string;
  textColor?: string;
  subTextColor?: string;
  showLabel?: boolean;
}

// Ring-style tank/level gauge -- the signature widget of the updated visual
// direction, replacing the capsule/wave shape everywhere a percentage-full
// reading is shown (Home's hero tank card, the per-device list on the
// water-monitoring screen).
export default function CircularGauge({
  level,
  size = 76,
  strokeWidth = 7,
  trackColor = 'rgba(255,255,255,0.16)',
  progressColor = colors.primary[300],
  innerColor = colors.primary[600],
  textColor = colors.neutral[0],
  subTextColor = 'rgba(255,255,255,0.7)',
  showLabel = true,
}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(100, level));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;
  const innerSize = size - strokeWidth * 2.6;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: innerColor,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {showLabel && (
          <>
            <Text style={[styles.pct, { color: textColor, fontSize: size * 0.2 }]}>{Math.round(clamped)}%</Text>
            {size >= 60 && <Text style={[styles.full, { color: subTextColor }]}>FULL</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pct: {
    fontFamily: typography.numeric.fontFamily,
    lineHeight: undefined,
  },
  full: {
    fontFamily: typography.label.fontFamily,
    fontSize: 8,
    letterSpacing: 0.4,
    marginTop: 1,
  },
});
