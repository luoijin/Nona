export const colors = {
  background: '#F5F9FF',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF3FF',
  primary: '#007DFF',
  primaryDark: '#0057B8',
  primarySoft: '#DCEEFF',
  accent: '#E79A78',
  warning: '#FFF3DF',
  warningText: '#745434',
  danger: '#B34E45',
  text: '#12263F',
  textMuted: '#5E7187',
  textSubtle: '#8C9BAA',
  border: '#DCE8F5',
  white: '#FFFFFF',
  emergencySurface: '#FFF0EB',
  emergencyBorder: '#F5D8CE',
  emergencyText: '#9A6255',
} as const;

export const surfaces = {
  app: colors.background,
  highContrastApp: colors.white,
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
} as const;

export const typography = {
  title: 30,
  heading: 23,
  body: 16,
  label: 13,
  caption: 12,
  button: 16,
} as const;

export const radii = {
  card: 16,
  control: 12,
  round: 999,
} as const;
