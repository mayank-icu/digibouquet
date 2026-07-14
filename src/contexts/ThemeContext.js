import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app_theme_mode';

// ── Palettes ──────────────────────────────────────────────────────────────────
export const LIGHT = {
  isDarkMode: false,
  bg:        '#FAF7F2',
  surface:   '#FFFFFF',
  surface2:  '#EAE0D5',
  border:    '#EAE0D5',
  brand:     '#7A5C58',
  dark:      '#5C4844',
  muted:     '#997E7A',
  sage:      '#8CA18F',
  text:      '#5C4844',
  textMuted: '#997E7A',
  inputBg:   '#FAF7F2',
  navBg:     '#FFFFFF',
  headerBg:  '#7A5C58',
  headerText:'#FAF7F2',
  cardBg:    '#FFFFFF',
  cardBorder:'#EAE0D5',
  overlay:   'rgba(0,0,0,0.45)',
};

export const DARK = {
  isDarkMode: true,
  bg:        '#1A1614',
  surface:   '#2A2220',
  surface2:  '#332E2C',
  border:    '#3D3533',
  brand:     '#C4978F',
  dark:      '#F0E8E4',
  muted:     '#9E8E8A',
  sage:      '#8CA18F',
  text:      '#F0E8E4',
  textMuted: '#9E8E8A',
  inputBg:   '#2A2220',
  navBg:     '#2A2220',
  headerBg:  '#2A2220',
  headerText:'#F0E8E4',
  cardBg:    '#2A2220',
  cardBorder:'#3D3533',
  overlay:   'rgba(0,0,0,0.65)',
};

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext({ theme: LIGHT, isDark: false, toggleTheme: () => {} });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'dark') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // Ignore storage write failures; the in-memory theme still updates.
    }
  }, [isDark]);

  const value = useMemo(() => ({
    theme: isDark ? DARK : LIGHT,
    isDark,
    toggleTheme,
  }), [isDark, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
