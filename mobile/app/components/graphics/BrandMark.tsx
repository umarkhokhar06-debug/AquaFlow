import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '@/theme';

interface BrandMarkProps {
  size?: number;
  variant?: 'default' | 'onDark';
}

// Water-drop silhouette with a roof/home notch and a flowing ribbon across
// the base, in the primary brand gradient. Used at key brand moments
// (splash, sign-in) instead of a generic icon-in-a-circle.
export default function BrandMark({ size = 34, variant = 'default' }: BrandMarkProps) {
  const notchFill = variant === 'onDark' ? colors.primary[700] : colors.neutral[0];
  return (
    <Svg width={size} height={size * 1.15} viewBox="0 0 40 46" fill="none">
      <Defs>
        <LinearGradient id="brandGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={colors.primary[500]} />
          <Stop offset="100%" stopColor={colors.primary[300]} />
        </LinearGradient>
      </Defs>
      <Path
        d="M20 1C20 1 3 20 3 30.5C3 39 10.7 45 20 45C29.3 45 37 39 37 30.5C37 20 20 1 20 1Z"
        fill="url(#brandGrad)"
      />
      <Path d="M14 24L20 18L26 24V31.5H23V26.5H17V31.5H14V24Z" fill={notchFill} fillOpacity={0.92} />
      <Path
        d="M6 33C10 30.5 14.5 35 20 33C25.5 31 30 35.5 34 33"
        stroke={notchFill}
        strokeOpacity={0.65}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
