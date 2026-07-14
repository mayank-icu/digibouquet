import { HapticButton } from '../components/HapticButton';
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as StoreReview from 'expo-store-review';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const C = { bg: '#FAF7F2', rose: '#7A5C58', muted: '#997E7A', dark: '#5C4844', border: '#EAE0D5', white: '#fff', mid: '#EAE0D5' };

const STORE_URL = 'https://play.google.com/store/apps/details?id=com.egreet.digibouquet';

export default function AboutScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { getTextSize } = useAccessibility();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });



  const FEATURES = [
    tr('about.feature1'),
    tr('about.feature2'),
    tr('about.feature3'),
    tr('about.feature4'),
    tr('about.feature5'),
    tr('about.feature6'),
  ];

  const handleRateUs = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        Linking.openURL(STORE_URL);
      }
    } catch {
      Linking.openURL(STORE_URL);
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: t.bg }]} {...swipeHandlers}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <View style={[s.header, { backgroundColor: t.bg, borderBottomColor: t.border }]}> 
        <HapticButton onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[s.headerTitle, { color: t.text, fontSize: getTextSize(18) }]}>{tr('about.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={s.brandBlock}>
          <View style={s.brandIconCircle}>
            <Feather name="feather" size={32} color={t.brand} />
          </View>
          <Text style={[s.brandName, { color: t.text }]}>{tr('common.appName')}</Text>
          <Text style={[s.brandTagline, { color: t.textMuted, fontSize: getTextSize(14) }]}>{tr('about.tagline')}</Text>
        </View>

        <Text style={[s.sectionLabel, { color: t.brand, fontSize: getTextSize(11) }]}>{tr('about.missionTitle')}</Text>
        <Text style={[s.body, { color: t.textMuted, fontSize: getTextSize(14) }]}>
          {tr('about.missionBody')}
        </Text>

        <Text style={[s.sectionLabel, { color: t.brand, fontSize: getTextSize(11) }]}>{tr('about.featuresTitle')}</Text>
        <View style={s.featureList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.featureDot, { backgroundColor: t.brand }]} />
              <Text style={[s.featureText, { color: t.text, fontSize: getTextSize(14) }]}>{f}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.sectionLabel, { color: t.brand, fontSize: getTextSize(11) }]}>{tr('about.madeWithLoveTitle')}</Text>
        <Text style={[s.body, { color: t.textMuted, fontSize: getTextSize(14) }]}>
          {tr('about.madeWithLovePrefix')}{' '}
          <Text style={{ color: t.brand, fontFamily: 'Manrope-Bold', fontSize: getTextSize(14) }}>{tr('common.companyName')}</Text>
          {' '}{tr('about.madeWithLoveSuffix')}
        </Text>

        <View style={s.linkRow}>
          <HapticButton style={[s.linkBtn, { borderColor: t.brand, backgroundColor: t.cardBg }]} onPress={() => Linking.openURL('https://egreet.in')}>
            <Feather name="globe" size={16} color={t.brand} />
            <Text style={[s.linkBtnText, { color: t.brand, fontSize: getTextSize(14) }]}>{tr('about.visitWebsite')}</Text>
          </HapticButton>
          <HapticButton style={[s.linkBtn, { backgroundColor: t.brand, borderColor: t.brand }]} onPress={handleRateUs}>
            <Feather name="star" size={16} color={C.white} />
            <Text style={[s.linkBtnText, { color: C.white, fontSize: getTextSize(14) }]}>{tr('about.rateApp')}</Text>
          </HapticButton>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope-Bold', color: C.dark },
  content: { paddingHorizontal: 24, paddingTop: 20 },

  brandBlock: { alignItems: 'center', paddingVertical: 32 },
  brandIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3EDE8', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  brandName: { fontSize: 28, fontFamily: 'Manrope-Bold', color: C.dark, marginBottom: 4 },
  brandTagline: { fontSize: 14, fontFamily: 'Manrope-Regular', color: C.muted, marginBottom: 8 },

  sectionLabel: { fontSize: 11, fontFamily: 'Manrope-Bold', color: C.rose, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 24, marginBottom: 10 },
  body: { fontSize: 14, fontFamily: 'Manrope-Regular', color: C.muted, lineHeight: 24 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.rose },
  featureText: { fontSize: 14, fontFamily: 'Manrope-Regular', color: C.dark, flex: 1 },

  linkRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  linkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.rose, backgroundColor: C.white },
  linkBtnText: { fontSize: 14, fontFamily: 'Manrope-Bold', color: C.rose },
});
