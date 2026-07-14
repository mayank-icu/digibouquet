import { useTheme } from '../../../contexts/ThemeContext';

export const useGoldenBouquet = (routeParams: any) => {
  const { theme: originalTheme, isDark: originalIsDark } = useTheme();
  
  const isGoldenMode = routeParams?.goldenMode || false;
  
  const themeColors = isGoldenMode ? {
    ...originalTheme,
    bg: '#0F0C0A',
    surface: '#1F1A15',
    surface2: '#2A1F1A',
    border: '#3D2E27',
    text: '#F5C842',
    textMuted: '#D4AF37',
    brand: '#C9960C',
    cardBg: '#1A1200'
  } : originalTheme;
  
  const isDark = isGoldenMode ? true : originalIsDark;

  return { isGoldenMode, themeColors, isDark };
};
