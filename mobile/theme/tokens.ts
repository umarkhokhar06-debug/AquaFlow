// AquaFlow design tokens. Values are a direct systemization of colors and
// sizes already in use across the app -- not a rebrand -- so re-skinning
// existing screens onto these is a value swap, not a repaint.

export const colors = {
  primary: {
    50: '#EEF6FF',
    100: '#D9ECFF',
    300: '#66AFFF',
    500: '#007AFF',
    600: '#0062CC',
    700: '#0056CC',
    900: '#003D91',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    700: '#374151',
    900: '#1F2937',
  },
  // 50 = tinted card/section backgrounds; 100 = one step more saturated, for
  // anything (icon circles, badges) that needs to read clearly ON a 50-tier
  // background instead of blending into it.
  success: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 700: '#047857' },
  warning: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 700: '#92400E' },
  danger: { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 700: '#B91C1C' },
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
};

export const typography: Record<
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyMed' | 'caption' | 'label' | 'numeric',
  TypeRole
> = {
  display: { fontFamily: 'Inter-ExtraBold', fontSize: 34, lineHeight: 40 },
  h1: { fontFamily: 'Inter-Bold', fontSize: 24, lineHeight: 30 },
  h2: { fontFamily: 'Inter-SemiBold', fontSize: 20, lineHeight: 26 },
  h3: { fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 22 },
  body: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 22 },
  bodyMed: { fontFamily: 'Inter-Medium', fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 18 },
  label: { fontFamily: 'Inter-Medium', fontSize: 12, lineHeight: 16 },
  numeric: { fontFamily: 'Inter-ExtraBold', fontSize: 28, lineHeight: 32 },
};
