import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { detectCountryFromIP, getLanguageForCountry, getCountryFlag } from '../utils/countryLanguageMapping';

const BRAND = '#7A5C58';
const BG_COLOR = '#FAF7F2';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'cn', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];

export default function LanguagePickerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useLanguage();
  const [selected, setSelected] = useState(locale || 'en');
  const [detecting, setDetecting] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  // Detect user's country and language from IP
  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        const country = await detectCountryFromIP();
        if (country) {
          setDetectedCountry(country);
          const lang = getLanguageForCountry(country);
          setDetectedLanguage(lang);
          // Auto-select detected language if available
          if (LANGUAGES.find(l => l.code === lang)) {
            setSelected(lang);
          }
        }
      } catch (error) {
        console.log('Failed to detect country:', error);
      } finally {
        setDetecting(false);
      }
    };
    detectUserLocation();
  }, []);

  // Sort languages to show detected language first
  const sortedLanguages = useMemo(() => {
    if (!detectedLanguage) return LANGUAGES;
    
    const detected = LANGUAGES.find(lang => lang.code === detectedLanguage);
    if (!detected) return LANGUAGES;
    
    return [detected, ...LANGUAGES.filter(lang => lang.code !== detectedLanguage)];
  }, [detectedLanguage]);

  const handleContinue = async () => {
    await setLocale(selected);
    await AsyncStorage.setItem('hasPickedLanguage', 'true');
    navigation.replace('Welcome');
  };

  return (
    <ImageBackground
      source={require('./welcome-screen-bg.webp')}
      style={styles.bg}
      resizeMode="cover"
    >
        <View style={styles.overlay} />
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <StatusBar style="light" />

          <Text style={styles.title}>{t('languagePicker.title')}</Text>
          <Text style={styles.subtitle}>{t('languagePicker.subtitle')}</Text>

          {detecting && (
            <View style={styles.detectingContainer}>
              <ActivityIndicator size="small" color={BRAND} />
              <Text style={styles.detectingText}>{t('languageScreen.detectingLocation')}</Text>
            </View>
          )}

          <View style={styles.grid}>
            {sortedLanguages.map((lang) => {
              const isSelected = selected === lang.code;
              const isDetected = detectedLanguage && lang.code === detectedLanguage;
              return (
                <HapticButton
                  key={lang.code}
                  style={[
                    styles.langBtn, 
                    isSelected && styles.langBtnSelected,
                    isDetected && !isSelected && styles.langBtnDetected
                  ]}
                  onPress={() => setSelected(lang.code)}
                  activeOpacity={0.75}
                >
                  {isSelected && (
                    <Feather name="check" size={13} color="#fff" style={styles.checkIcon} />
                  )}
                  {isDetected && !isSelected && detectedCountry && (
                    <Text style={styles.flagIcon}>{getCountryFlag(detectedCountry)}</Text>
                  )}
                  <Text style={[styles.langText, isSelected && styles.langTextSelected]}>
                    {lang.nativeName}
                  </Text>
                </HapticButton>
              );
            })}
          </View>

          <HapticButton style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
            <Text style={styles.continueBtnText}>{t('languagePicker.continue')}</Text>
            <Feather name="arrow-right" size={18} color={BG_COLOR} style={{ marginLeft: 8 }} />
          </HapticButton>
        </View>
      </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 247, 242, 0.50)',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    ...(Platform.OS === 'web' && {
      maxWidth: 560,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  title: {
    fontFamily: 'Manrope-Bold',
    fontSize: 26,
    color: '#5C4844',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Manrope-Regular',
    fontSize: 14,
    color: '#7A5C58',
    textAlign: 'center',
    marginBottom: 36,
    opacity: 0.85,
  },
  detectingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
  },
  detectingText: {
    fontFamily: 'Manrope-Regular',
    fontSize: 12,
    color: '#7A5C58',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 44,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1.5,
    borderColor: 'rgba(122, 92, 88, 0.2)',
  },
  langBtnSelected: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  langBtnDetected: {
    backgroundColor: 'rgba(122, 92, 88, 0.15)',
    borderColor: 'rgba(122, 92, 88, 0.4)',
  },
  checkIcon: {
    marginRight: 5,
  },
  flagIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  langText: {
    fontFamily: 'Manrope-SemiBold',
    fontSize: 14,
    color: '#5C4844',
  },
  langTextSelected: {
    color: '#fff',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(122, 92, 88, 0.85)',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 28,
  },
  continueBtnText: {
    fontFamily: 'Manrope-Bold',
    fontSize: 15,
    color: BG_COLOR,
    letterSpacing: 0.3,
  },
});
