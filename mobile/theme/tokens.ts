// AabRahat design tokens, per the brand brief (Aab Blue / Deep Water Navy /
// Fresh Aqua / Comfort Green). Re-skinning existing screens onto these is a
// value swap, not a repaint.

export const colors = {
  primary: {
    50: '#E4F3F6',   // Teal pale -- tinted card/section backgrounds
    100: '#E6F8FA',  // Blue pale -- one step more saturated accent tint
    300: '#38C6D9',  // Fresh Aqua -- secondary accent / highlights
    500: '#087EA4',  // Aab Blue -- primary brand/action color
    600: '#0E93A6',  // Blue deep -- accent pressed state
    700: '#063B5C',  // Deep Water Navy -- pressed/deep states, dark surfaces
    900: '#063B5C',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F7FBFC',   // Soft White -- app background
    100: '#F3F4F6',
    200: '#E1EDF0',  // line/border color
    300: '#D1D5DB',
    400: '#9AB0B8',  // gray light
    500: '#5B7280',  // gray
    700: '#374151',
    900: '#102A38',  // Dark Text -- all body/heading text
  },
  // 50 = tinted card/section backgrounds; 100 = one step more saturated, for
  // anything (icon circles, badges) that needs to read clearly ON a 50-tier
  // background instead of blending into it.
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#45B97C', 700: '#047857' }, // Comfort Green
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#E7A63C', 700: '#92400E' },
  danger: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#E5484D', 700: '#B91C1C' },
  info: { 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 700: '#6D28D9' },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

type TypeRole = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

// Sora, per the AabRahat brand brief: SemiBold (600) as the primary weight,
// -1% to -2% tracking.
export const typography: Record<
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyMed' | 'caption' | 'label' | 'numeric',
  TypeRole
> = {
  display: { fontFamily: 'Sora-ExtraBold', fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  h1: { fontFamily: 'Sora-Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: 'Sora-SemiBold', fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: 'Sora-SemiBold', fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: 'Sora-Regular', fontSize: 15, lineHeight: 22, letterSpacing: -0.15 },
  bodyMed: { fontFamily: 'Sora-Medium', fontSize: 15, lineHeight: 22, letterSpacing: -0.15 },
  caption: { fontFamily: 'Sora-Regular', fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  label: { fontFamily: 'Sora-Medium', fontSize: 12, lineHeight: 16, letterSpacing: -0.1 },
  numeric: { fontFamily: 'Sora-ExtraBold', fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
};
