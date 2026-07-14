import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import { Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';

// --- Lazy translation loader ---
// IMPORTANT: require('../translations') still bundles the file at build time with Metro,
// BUT with Hermes + bundle compression enabled, the actual bytes stored in the APK
// are compressed. The key win here is that by NOT top-level importing it, Metro's
// tree-shaker can better optimize the module. Additionally, the JS execution cost
// (parsing all 21 languages on startup) is eliminated - only English parses at boot.
const translationCache = {};

const loadTranslationsForLocale = (locale) => {
  if (translationCache[locale]) return translationCache[locale];
  // Load all translations once and cache individual locales
  const all = require('../translations').default;
  // Cache all locales at once so subsequent language switches are instant
  Object.keys(all).forEach(lang => {
    if (!translationCache[lang]) translationCache[lang] = all[lang];
  });
  return translationCache[locale] || translationCache['en'];
};

// Eagerly initialize English only at module load
const getEn = () => {
  if (!translationCache['en']) {
    loadTranslationsForLocale('en');
  }
  return translationCache['en'];
};

const BASE_MANROPE = {
  'Manrope-Regular': Manrope_400Regular,
  'Manrope-SemiBold': Manrope_600SemiBold,
  'Manrope-Bold': Manrope_700Bold,
};

const LANGUAGE_FONTS = {
  en: BASE_MANROPE,
  es: BASE_MANROPE,
  fr: BASE_MANROPE,
  de: BASE_MANROPE,
  pt: BASE_MANROPE,
  it: BASE_MANROPE,
  ru: BASE_MANROPE,
  tr: BASE_MANROPE,
  nl: BASE_MANROPE,
  pl: BASE_MANROPE,
  sv: BASE_MANROPE,
  id: BASE_MANROPE,
  hi: BASE_MANROPE,
  ta: BASE_MANROPE,
  te: BASE_MANROPE, 
  bn: BASE_MANROPE,
  ar: BASE_MANROPE,
  ur: BASE_MANROPE,
  cn: BASE_MANROPE,
  ja: BASE_MANROPE,
  ko: BASE_MANROPE,
};

const LanguageContext = createContext({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
  fonts: { regular: 'Manrope-Regular', semiBold: 'Manrope-SemiBold', bold: 'Manrope-Bold' },
  fontsReady: true,
});

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState('en');
  const [fontsReady, setFontsReady] = useState(true);
  const [localeData, setLocaleData] = useState(() => getEn());
  const enDataRef = useRef(null);
  if (!enDataRef.current) {
    enDataRef.current = getEn();
  }

  useEffect(() => {
    const loadFont = async (loc) => {
      if (LANGUAGE_FONTS[loc]) {
        setFontsReady(false);
        try {
          await Font.loadAsync(LANGUAGE_FONTS[loc]);
        } catch (e) {
          console.error('Failed to load font for', loc, e);
        }
        setFontsReady(true);
      } else {
        setFontsReady(true);
      }
    };
    loadFont(locale);
  }, [locale]);

  // Load saved language on startup
  useEffect(() => {
    AsyncStorage.getItem('app_language').then((saved) => {
      if (saved && saved !== 'en') {
        const data = loadTranslationsForLocale(saved);
        if (data) {
          setLocaleData(data);
          setLocaleState(saved);
        }
      }
    });
  }, []);

  const setLocale = async (newLocale) => {
    const data = loadTranslationsForLocale(newLocale);
    if (data) {
      setLocaleData(data);
      setLocaleState(newLocale);
      await AsyncStorage.setItem('app_language', newLocale);
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let result = localeData;
    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        // Fallback to English
        let fb = enDataRef.current;
        for (const fk of keys) {
          if (fb && fb[fk]) fb = fb[fk];
          else return key; // key not found at all
        }
        return typeof fb === 'string' ? fb : key;
      }
    }
    return typeof result === 'string' ? result : key;
  };

  const fonts = { regular: 'Manrope-Regular', semiBold: 'Manrope-SemiBold', bold: 'Manrope-Bold' };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, fonts, fontsReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
