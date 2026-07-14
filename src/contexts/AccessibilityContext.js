import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HIGH_CONTRAST_LIGHT = {
  bg:        '#FFFFFF',
  surface:   '#FFFFFF',
  surface2:  '#E0E0E0',
  border:    '#000000',
  brand:     '#4A0000',
  text:      '#000000',
  textMuted: '#333333',
  inputBg:   '#FFFFFF',
  navBg:     '#FFFFFF',
  headerBg:  '#000000',
  headerText:'#FFFFFF',
  cardBg:    '#FFFFFF',
  cardBorder:'#000000',
};

const HIGH_CONTRAST_DARK = {
  bg:        '#000000',
  surface:   '#111111',
  surface2:  '#1A1A1A',
  border:    '#FFFFFF',
  brand:     '#FFD700',
  text:      '#FFFFFF',
  textMuted: '#CCCCCC',
  inputBg:   '#111111',
  navBg:     '#000000',
  headerBg:  '#111111',
  headerText:'#FFFFFF',
  cardBg:    '#111111',
  cardBorder:'#FFFFFF',
};

const AccessibilityContext = createContext({
  fontScale: 1.0,
  setFontScale: () => {},
  reduceMotion: false,
  setReduceMotion: () => {},
  highContrast: false,
  setHighContrast: () => {},
  swipeNavigation: true,
  setSwipeNavigation: () => {},
  getTextSize: (defaultSize) => defaultSize,
  getEffectiveTheme: (theme) => theme,
});

export function AccessibilityProvider({ children }) {
  const [fontScale, setFontScaleState] = useState(1.0);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [highContrast, setHighContrastState] = useState(false);
  const [swipeNavigation, setSwipeNavigationState] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet(['a11y_fontScale', 'a11y_reduceMotion', 'a11y_highContrast', 'a11y_swipeNavigation']).then((values) => {
      values.forEach(([key, value]) => {
        if (value !== null) {
          if (key === 'a11y_fontScale') setFontScaleState(parseFloat(value));
          if (key === 'a11y_reduceMotion') setReduceMotionState(value === 'true');
          if (key === 'a11y_highContrast') setHighContrastState(value === 'true');
          if (key === 'a11y_swipeNavigation') setSwipeNavigationState(value === 'true');
        }
      });
    });
  }, []);

  const setFontScale = async (val) => {
    setFontScaleState(val);
    await AsyncStorage.setItem('a11y_fontScale', String(val));
  };
  const setReduceMotion = async (val) => {
    setReduceMotionState(val);
    await AsyncStorage.setItem('a11y_reduceMotion', String(val));
  };
  const setHighContrast = async (val) => {
    setHighContrastState(val);
    await AsyncStorage.setItem('a11y_highContrast', String(val));
  };
  const setSwipeNavigation = async (val) => {
    setSwipeNavigationState(val);
    await AsyncStorage.setItem('a11y_swipeNavigation', String(val));
  };

  const getTextSize = useCallback((defaultSize) => {
    return Math.round(defaultSize * fontScale);
  }, [fontScale]);

  // Merges high contrast overrides onto the existing theme if enabled
  const getEffectiveTheme = useCallback((theme) => {
    if (!highContrast) return theme;
    const overrides = theme.dark ? HIGH_CONTRAST_DARK : HIGH_CONTRAST_LIGHT;
    return { ...theme, ...overrides };
  }, [highContrast]);

  return (
    <AccessibilityContext.Provider value={{
      fontScale, setFontScale,
      reduceMotion, setReduceMotion,
      highContrast, setHighContrast,
      swipeNavigation, setSwipeNavigation,
      getTextSize,
      getEffectiveTheme,
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
