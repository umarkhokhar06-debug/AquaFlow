// AabRahat design tokens, per the updated visual direction: Deep Water Navy
// / Teal / Fresh Aqua / Amber (primary CTA accent) / warm Cream ground.
// Re-skinning existing screens onto these is a value swap, not a repaint.

export const colors = {
  primary: {
    50: '#EAF3F2',   // Teal pale -- tinted card/section backgrounds
    100: '#DCE8E7',  // Mist -- one step more saturated accent tint
    300: '#6FD6C9',  // Fresh Aqua -- secondary accent / highlights
    500: '#1B7A8C',  // Teal -- primary brand/action color
    600: '#0F4E60',  // Deep-2 -- accent pressed state
    700: '#0B3D4C',  // Deep Water Navy -- pressed/deep states, dark surfaces
    900: '#0B3D4C',
  },
  // Amber -- the primary CTA/action-button color (distinct from the teal
  // brand color, per the updated visual direction). Not used for warnings.
  accent: {
    50: '#FDF3E4',
    100: '#FCE8CC',
    500: '#F0A73B',
    600: '#D98D22',
    700: '#B8721A',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F6F3EC',   // Cream -- app background
    100: '#EEF4F3',  // Mist-2
    200: '#DCE8E7',  // Mist -- line/border color
    300: '#D1D5DB',
    400: '#9AB0B8',  // gray light
    500: '#5B7280',  // gray
    700: '#374151',
    900: '#0E2A30',  // Ink -- all body/heading text
  },
  // 50 = tinted card/section backgrounds; 100 = one step more saturated, for
  // anything (icon circles, badges) that needs to read clearly ON a 50-tier
  // background instead of blending into it.
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#4FA97C', 700: '#047857' },
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#E7A63C', 700: '#92400E' },
  danger: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#D9694F', 700: '#B91C1C' },
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

// Manrope, per the updated AabRahat visual direction: SemiBold/Bold as the
// primary weights for headings, ExtraBold reserved for numeric/display.
export const typography: Record<
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyMed' | 'caption' | 'label' | 'numeric',
  TypeRole
> = {
  display: { fontFamily: 'Manrope-ExtraBold', fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  h1: { fontFamily: 'Manrope-Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { fontFamily: 'Manrope-Bold', fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: 'Manrope-Bold', fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: 'Manrope-Regular', fontSize: 15, lineHeight: 22, letterSpacing: -0.15 },
  bodyMed: { fontFamily: 'Manrope-Medium', fontSize: 15, lineHeight: 22, letterSpacing: -0.15 },
  caption: { fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  label: { fontFamily: 'Manrope-SemiBold', fontSize: 12, lineHeight: 16, letterSpacing: -0.1 },
  numeric: { fontFamily: 'Manrope-ExtraBold', fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
};
