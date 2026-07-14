import { HapticButton } from '../components/HapticButton';
import React, { useState, useMemo, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  Modal,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useCountry } from '../contexts/CountryContext';
import { LANGUAGES } from '../constants/languages';
import { detectCountryFromIP, getLanguageForCountry } from '../utils/countryLanguageMapping';

export default function LanguageScreen() {
  const { theme: rawTheme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { locale: selectedLang, setLocale: setSelectedLang, t } = useLanguage();
  const { countryCode } = useCountry();
  const { getTextSize, getEffectiveTheme } = useAccessibility();
  const theme = getEffectiveTheme(rawTheme);
  const isDark = rawTheme.dark;
  const [searchQuery, setSearchQuery] = useState('');
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [detectedLanguage, setDetectedLanguage] = useState(null);

  // Detect user's country and language from IP as fallback
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
      }
    };
    detectUserLocation();
  }, []);

  const activeCountryCode = countryCode || detectedCountry;
  const countryLangCode = activeCountryCode ? getLanguageForCountry(activeCountryCode) : null;

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return LANGUAGES;
    const query = searchQuery.toLowerCase();
    return LANGUAGES.filter(lang => 
      lang.name.toLowerCase().includes(query) || 
      lang.nativeName.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Sort languages: Selected first, then Country language (suggested) second, then others
  const sortedLanguages = useMemo(() => {
    let list = [...filteredLanguages];

    const selectedIdx = list.findIndex(lang => lang.code === selectedLang);
    let selectedItem = null;
    if (selectedIdx !== -1) {
      selectedItem = list.splice(selectedIdx, 1)[0];
    }

    const countryLangIdx = list.findIndex(lang => lang.code === countryLangCode);
    let countryLangItem = null;
    if (countryLangIdx !== -1) {
      countryLangItem = list.splice(countryLangIdx, 1)[0];
    }

    const result = [];
    if (selectedItem) {
      result.push(selectedItem);
    }
    
    // Put country language next if it's different from the currently selected one
    if (countryLangItem && (!selectedItem || countryLangItem.code !== selectedItem.code)) {
      result.push(countryLangItem);
    }
    
    result.push(...list);
    return result;
  }, [filteredLanguages, selectedLang, countryLangCode]);

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.modalBackdrop}>
        <HapticButton 
          style={styles.backdropPressable} 
          activeOpacity={1} 
          onPress={handleClose} 
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.modalContent,
            { 
              backgroundColor: theme.cardBg || theme.surface, 
              paddingBottom: insets.bottom + 20 
            }
          ]}
        >
          {/* Sheet Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

          {/* Search Bar */}
          <View style={[styles.searchContainer, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <Feather name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, fontSize: getTextSize(15) }]}
              placeholder={t('common.search') || 'Search'}
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <HapticButton onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Feather name="x" size={18} color={theme.textMuted} />
              </HapticButton>
            )}
          </View>

          {/* Scrollable Language List */}
          <ScrollView 
            style={styles.scrollView}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.listContainer}>
              {sortedLanguages.length > 0 ? (
                sortedLanguages.map((lang) => {
                  const isSelected = selectedLang === lang.code;
                  return (
                    <HapticButton
                      key={lang.code}
                      style={[
                        styles.langItem,
                        { borderRadius: 12 },
                        isSelected && { backgroundColor: theme.brand + '15' }
                      ]}
                      onPress={() => {
                        setSelectedLang(lang.code);
                        // Auto-close on select with a clean delay so they feel the change
                        setTimeout(() => {
                          handleClose();
                        }, 200);
                      }}
                    >
                      <View style={styles.langInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <Text style={[
                            styles.langNative, 
                            { color: theme.text, fontSize: getTextSize(16) }, 
                            isSelected && { fontWeight: 'bold', color: theme.brand }
                          ]}>
                            {lang.nativeName} <Text style={{ fontSize: getTextSize(12), opacity: 0.6 }}>({lang.code.toUpperCase()})</Text>
                          </Text>
                        </View>
                        <Text style={[styles.langEnglish, { color: theme.textMuted, fontSize: getTextSize(13) }]}>
                          {lang.name}
                        </Text>
                      </View>
                      {isSelected && <Feather name="check" size={20} color={theme.brand} />}
                    </HapticButton>
                  );
                })
              ) : (
                <View style={styles.emptyState}>
                  <Feather name="search" size={40} color={theme.textMuted} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <Text style={[styles.emptyText, { color: theme.textMuted, fontSize: getTextSize(14) }]}>
                    {t('bouquetView.noLanguagesFound') || 'No languages found'}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    flex: 1,
    maxHeight: Dimensions.get('window').height * 0.8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 8,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12,
    marginBottom: 16,
  },
  headerTitle: { 
    fontFamily: 'Manrope-Bold',
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 12, 
    borderWidth: 1, 
    paddingHorizontal: 12, 
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: { 
    marginRight: 8 
  },
  searchInput: { 
    flex: 1, 
    fontFamily: 'Manrope-Regular', 
    paddingVertical: 0,
  },
  clearBtn: { 
    padding: 4 
  },
  scrollView: { 
    flex: 1,
  },
  listContainer: { 
    gap: 8,
    paddingBottom: 20,
  },
  langItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 14, 
    paddingHorizontal: 16,
  },
  langInfo: { 
    flex: 1,
  },
  langNative: { 
    fontFamily: 'Manrope-SemiBold', 
    marginBottom: 2,
  },
  langEnglish: { 
    fontFamily: 'Manrope-Regular',
  },
  emptyState: { 
    alignItems: 'center', 
    paddingVertical: 40,
  },
  emptyText: { 
    fontFamily: 'Manrope-Regular', 
    textAlign: 'center',
  },
});
