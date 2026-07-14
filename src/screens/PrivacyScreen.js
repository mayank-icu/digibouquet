import { HapticButton } from '../components/HapticButton';
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';

const C = { bg: '#FAF7F2', rose: '#7A5C58', muted: '#997E7A', dark: '#5C4844', border: '#EAE0D5', white: '#fff' };

export default function PrivacyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { getTextSize } = useAccessibility();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const trOr = (key, fallback) => {
    const v = tr(key);
    return v === key ? fallback : v;
  };

  const sections = [
    { title: trOr('privacy.section1Title', 'Information We Collect'), body: trOr('privacy.section1Body', 'For adult users (13+), we collect minimal information to operate the App, including bouquets you create (stored in Firebase Firestore) and optional account credentials if you sign up. For minor users (under 13), we do not collect any personal data, and all features run entirely locally on the device without cloud sync.') },
    { title: trOr('privacy.section2Title', 'How We Use Your Information'), body: trOr('privacy.section2Body', 'We use the information we collect to:\n\n- Store and deliver your digital bouquets (adults only)\n- Respond to feedback you submit\n- Improve app performance and features\n- Detect and prevent misuse') },
    { title: trOr('privacy.section3Title', 'Data Storage & Security'), body: trOr('privacy.section3Body', 'For adult users, your bouquet data is stored securely in Google Firebase. We use industry-standard encryption and security practices. We retain bouquet data for 90 days after creation, after which it may be automatically deleted. For under-13 users, all data is stored strictly locally on your device\'s local storage and is never sent to Firebase.') },
    { title: trOr('privacy.section4Title', 'Third-Party Services'), body: trOr('privacy.section4Body', 'The App uses the following third-party services:\n\n- Google Firebase (data storage - disabled for under-13)\n- iTunes Search API (song previews - no data is sent)\n- Sarvam AI (optional AI bouquet suggestions)\n\nEach service has its own Privacy Policy governing data use.') },
    { title: trOr('privacy.section5Title', 'Cookies & Tracking'), body: trOr('privacy.section5Body', 'The App does not use tracking cookies. On web, we may use local storage to remember your preferences. We do not use advertising trackers or sell your data to third parties.') },
    { title: trOr('privacy.section6Title', "Children's Privacy (All-Ages & COPPA Compliance)"), body: trOr('privacy.section6Body', 'Digi Bouquet is committed to protecting children\'s privacy. For users under 13, the App operates in a Secure Guest Mode where:\n\n- No personal information (including email, name, or phone numbers) is collected or sent to our servers.\n- All bouquet data is processed and stored 100% locally on the device.\n- Collaborative cloud editing (Make Bouquet Together) and recipient email delivery are completely disabled.\n- Your birth year is only collected to determine age, is processed entirely locally, and is never transmitted to us or any third party.') },
    { title: trOr('privacy.section7Title', 'Your Rights'), body: trOr('privacy.section7Body', 'You have the right to:\n\n- Access the data we hold about you\n- Request deletion of your bouquet data\n- Opt out of analytics\n\nTo exercise these rights, contact us at privacy@egreet.in.') },
    { title: trOr('privacy.section8Title', 'Changes to This Policy'), body: trOr('privacy.section8Body', 'We may update this Privacy Policy from time to time. We will notify you of significant changes via the App. Continued use after updates means you accept the revised policy.') },
    { title: trOr('privacy.section9Title', 'Contact Us'), body: trOr('privacy.section9Body', 'For privacy questions or data requests:\n\nEmail: privacy@egreet.in\nWebsite: https://egreet.in') },
  ];

  return (
    <View style={[s.root, { backgroundColor: t.bg }]} {...swipeHandlers}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <View style={[s.header, { paddingTop: insets.top, backgroundColor: t.bg, borderBottomColor: t.border }]}> 
        <HapticButton onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[s.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>{trOr('privacy.title', 'Privacy Policy')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={s.heroBadge}>
          <Feather name="shield" size={20} color={t.brand} />
          <Text style={[s.heroBadgeText, { color: t.brand }]}>{trOr('privacy.badge', 'Your privacy matters to us')}</Text>
        </View>
        <Text style={[s.updated, { color: t.textMuted }]}>{trOr('privacy.lastUpdated', 'Last updated: May 2025')}</Text>

        {sections.map((sec, i) => (
          <View key={i} style={[s.section, { borderBottomColor: t.border }]}>
            <Text style={[s.sectionTitle, { color: t.text }]}>{sec.title}</Text>
            <Text style={[s.sectionBody, { color: t.textMuted }]}>{sec.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope-SemiBold', color: C.dark },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3EDE8', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 12, alignSelf: 'flex-start' },
  heroBadgeText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: C.rose },
  updated: { fontSize: 12, fontFamily: 'Manrope-Regular', color: C.muted, marginBottom: 24 },
  section: { marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: C.dark, marginBottom: 8 },
  sectionBody: { fontSize: 13, fontFamily: 'Manrope-Regular', color: C.muted, lineHeight: 22 },
});
