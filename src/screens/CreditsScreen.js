import { HapticButton } from '../components/HapticButton';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const C = { bg: '#FAF7F2', rose: '#7A5C58', muted: '#997E7A', dark: '#5C4844', border: '#EAE0D5', white: '#fff', mid: '#EAE0D5' };

export default function CreditsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: tTheme, isDark } = useTheme();
  const { t } = useLanguage();
  const { getTextSize } = useAccessibility();
  
  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const tools = [
    { name: 'LottieFiles', desc: t('credits.lottieFiles') || 'for providing beautiful, high-quality animations.' },
    { name: 'Storyset.com', desc: t('credits.storyset') || 'for the stunning and expressive illustrations.' },
    { name: 'React Native & Expo', desc: t('credits.reactNative') || 'for the core framework.' },
    { name: 'Firebase', desc: t('credits.firebase') || 'for backend services.' },
    { name: 'Cloudflare', desc: t('credits.cloudflare') || 'for DNS and web security.' },
    { name: 'Netlify', desc: t('credits.netlify') || 'for hosting and deployment.' },
    { name: 'Sarvam AI', desc: t('credits.sarvamAI') || 'for intelligent text and generation features.' },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: tTheme.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={tTheme.bg} />

      <View style={[s.header, { backgroundColor: tTheme.bg, borderBottomColor: tTheme.border }]}>
        <HapticButton onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={tTheme.text} />
        </HapticButton>
        <Text style={[s.headerTitle, { color: tTheme.text, fontSize: getTextSize(18) }]}>
          {t('credits.title') || 'Credits'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.sectionLabel, { color: tTheme.brand, fontSize: getTextSize(11) }]}>
          {t('credits.toolsTitle') || 'TOOLS & RESOURCES'}
        </Text>
        <Text style={[s.body, { color: tTheme.textMuted, fontSize: getTextSize(14), marginBottom: 16 }]}>
          {t('credits.toolsSubtitle') || 'This app was made possible thanks to the following amazing tools and platforms:'}
        </Text>

        <View style={s.featureList}>
          {tools.map((tool, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.featureDot, { backgroundColor: tTheme.brand }]} />
              <Text style={[s.featureText, { color: tTheme.text, fontSize: getTextSize(14) }]}>
                <Text style={{ fontFamily: 'Manrope-Bold' }}>{tool.name}</Text> {tool.desc}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Manrope-Bold' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  sectionLabel: { 
    fontSize: 11, 
    fontFamily: 'Manrope-Bold', 
    letterSpacing: 1.5, 
    textTransform: 'uppercase', 
    marginTop: 24, 
    marginBottom: 10 
  },
  body: { fontSize: 14, fontFamily: 'Manrope-Regular', lineHeight: 24 },
  featureList: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureDot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
  featureText: { fontSize: 14, fontFamily: 'Manrope-Regular', flex: 1, lineHeight: 22 },
});
