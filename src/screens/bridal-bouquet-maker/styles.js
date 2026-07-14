import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

export const theme = {
  bg: '#fbf9f6',
  surface: '#fbf9f6',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f5f3f0',
  surfaceVariant: '#e4e2df',
  primary: '#261913',
  onPrimary: '#ffffff',
  onSurface: '#1b1c1a',
  onSurfaceVariant: '#4f4540',
  outline: '#807570',
  outlineVariant: '#d2c4be',
  secondary: '#52634e',
  secondaryContainer: '#d4e8ce',
  onSecondaryContainer: '#576954',
  tertiaryContainer: '#382f2f',

  fontDisplay: 'PlayfairDisplay-Regular',
  fontBody: 'Manrope-Regular',
  fontBodySemiBold: 'Manrope-SemiBold',

  spacingGutter: 24,
  marginMobile: 20,
  marginDesktop: 64,
  borderRadiusXl: 24,
  borderRadiusFull: 9999,
};

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  pageContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: isTablet ? theme.marginDesktop : theme.marginMobile,
    paddingTop: 32,
    paddingBottom: 120,
  },
  
  // Typography
  textHeadlineLg: {
    fontFamily: theme.fontDisplay,
    fontSize: isTablet ? 64 : 40,
    lineHeight: isTablet ? 70 : 48,
    color: theme.primary,
  },
  textHeadlineMd: {
    fontFamily: theme.fontDisplay,
    fontSize: 24,
    lineHeight: 33,
    color: theme.primary,
  },
  textBodyLg: {
    fontFamily: theme.fontBody,
    fontSize: 18,
    lineHeight: 28,
    color: theme.onSurfaceVariant,
  },
  textBodyMd: {
    fontFamily: theme.fontBody,
    fontSize: 16,
    lineHeight: 25,
    color: theme.onSurfaceVariant,
  },
  textLabelMd: {
    fontFamily: theme.fontBodySemiBold,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  textLabelSm: {
    fontFamily: theme.fontBodySemiBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.36,
    textTransform: 'uppercase',
  },

  // Layouts
  flexRowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  flexRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
