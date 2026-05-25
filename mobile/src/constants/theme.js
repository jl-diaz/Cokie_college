// Sistema de diseño centralizado para CokieCollege Mobile
export const Colors = {
  primary: '#0B1956',
  primaryLight: '#426bc2',
  primaryDark: '#0a1540',
  
  background: '#F5F7FA',
  card: '#FFFFFF',
  
  text: {
    primary: '#0B1956',
    secondary: '#4A5568',
    muted: '#8a8da0',
    inverse: '#FFFFFF',
  },
  
  status: {
    present: '#4CAF50',
    absent: '#e74c3c',
    pending: '#f39c12',
    approved: '#2ecc71',
    rejected: '#e74c3c',
  },
  
  conduct: {
    positive: '#2ecc71',
    leve: '#f39c12',
    grave: '#e74c3c',
    muyGrave: '#8E44AD',
  },
  
  gray: {
    50: '#F7F7F7',
    100: '#F5F7FA',
    200: '#EDF2F7',
    300: '#E2E8F0',
    400: '#CBD5E0',
    500: '#A0AEC0',
    600: '#718096',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  },
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  size: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  },
  weight: {
    regular: '400',
    medium: '500',
    bold: '700',
    extraBold: '800',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#0B1956',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#0B1956',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
};