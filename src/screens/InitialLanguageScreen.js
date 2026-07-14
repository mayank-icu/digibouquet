import { HapticButton } from '../components/HapticButton';
import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { detectCountryFromIP, getLanguageForCountry, getCountryFlag } from '../utils/countryLanguageMapping';

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

const BRAND_COLOR = '#7A5C58';
const BG_COLOR = '#FAF7F2';
const TEXT_DARK = '#5C4844';

export default function InitialLanguageScreen({ onLanguageSelected }) {
  const insets = useSafeAreaInsets();
  const [detecting, setDetecting] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  useEffect(() => {
    const detectUserLocation = async () => {
      try {
        const country = await detectCountryFromIP();
        if (country) {
          setDetectedCountry(country);
          const lang = getLanguageForCountry(country);
          setDetectedLanguage(lang);
        }
      } catch (error) {
        console.log('Failed to detect country:', error);
      } finally {
        setDetecting(false);
      }
    };
    detectUserLocation();
  }, []);

  const sortedLanguages = useMemo(() => {
    if (!detectedLanguage) return LANGUAGES;
    
    const detected = LANGUAGES.find(lang => lang.code === detectedLanguage);
    if (!detected) return LANGUAGES;
    
    return [detected, ...LANGUAGES.filter(lang => lang.code !== detectedLanguage)];
  }, [detectedLanguage]);

  const handleSelectLanguage = async (code) => {
    await AsyncStorage.setItem('app_language', code);
    await AsyncStorage.setItem('language_selected', 'true');
    onLanguageSelected(code);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: BG_COLOR }]}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Language</Text>
        <Text style={styles.subtitle}>Select your preferred language</Text>
      </View>

      {detecting ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
          <Text style={styles.loadingText}>Detecting your location...</Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listContainer}>
            {sortedLanguages.map((lang, index) => {
              const isDetected = detectedLanguage && lang.code === detectedLanguage;
              return (
                <HapticButton
                  key={lang.code}
                  style={[
                    styles.langItem,
                    index === sortedLanguages.length - 1 && { borderBottomWidth: 0 },
                    isDetected && { backgroundColor: '#f8f4f0' }
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                >
                  <View style={styles.langInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.langNative}>{lang.nativeName}</Text>
                      {isDetected && detectedCountry && (
                        <View style={styles.detectedBadge}>
                          <Text style={styles.detectedFlag}>{getCountryFlag(detectedCountry)}</Text>
                          <Text style={styles.detectedText}>Your Language</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.langEnglish}>{lang.name}</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={TEXT_DARK} style={{ opacity: 0.3 }} />
                </HapticButton>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  title: { fontSize: 32, fontFamily: 'Manrope-Bold', color: TEXT_DARK, marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: 'Manrope-Regular', color: TEXT_DARK, opacity: 0.6 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 14, fontFamily: 'Manrope-Regular', color: TEXT_DARK, opacity: 0.6 },
  scrollView: { flex: 1, paddingHorizontal: 24 },
  listContainer: { borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden' },
  langItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  langInfo: { flex: 1 },
  langNative: { fontSize: 16, fontFamily: 'Manrope-SemiBold', color: TEXT_DARK },
  langEnglish: { fontSize: 13, fontFamily: 'Manrope-Regular', color: TEXT_DARK, opacity: 0.5, marginTop: 2 },
  detectedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 12,
    backgroundColor: BRAND_COLOR,
    gap: 4,
  },
  detectedFlag: { fontSize: 12 },
  detectedText: { fontSize: 11, color: '#fff', fontFamily: 'Manrope-SemiBold' },
});
