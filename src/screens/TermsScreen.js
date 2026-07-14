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

export default function TermsScreen({ navigation }) {
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
    { title: trOr('terms.section1Title', '1. Acceptance of Terms'), body: trOr('terms.section1Body', 'By downloading, installing, or using Digi Bouquet ("the App"), you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the App.') },
    { title: trOr('terms.section2Title', '2. Age Restrictions and Guest Mode'), body: trOr('terms.section2Body', 'Users of all ages are welcome to use Digi Bouquet. However, users under the age of 13 are restricted to our Secure Guest Mode in compliance with COPPA and Google Play Families Policies. Children under 13 may not create cloud accounts, upload personal media (photos, voice notes), use real-time collaboration features, or request recipient email delivery. All content created by children is processed and stored strictly locally on their device.') },
    { title: trOr('terms.section3Title', '3. User-Generated Content'), body: trOr('terms.section3Body', 'You are solely responsible for the messages, text, and other content you create and share through the App. E Greet does not endorse and is not responsible for any user-generated content.') },
    { title: trOr('terms.section4Title', '4. Intellectual Property'), body: trOr('terms.section4Body', 'All design elements, flower artwork, animations, and software in the App are the intellectual property of E Greet. You may not reproduce, distribute, or create derivative works without prior written permission.') },
    { title: trOr('terms.section5Title', '5. Third-Party Services'), body: trOr('terms.section5Body', 'The App may integrate with third-party services (such as iTunes for music preview). Your use of those services is subject to their respective terms. We are not responsible for any third-party content or services.') },
    { title: trOr('terms.section6Title', '6. Disclaimer of Warranties'), body: trOr('terms.section6Body', 'The App is provided "as is" without warranties of any kind. E Greet does not guarantee that the App will be error-free or uninterrupted.') },
    { title: trOr('terms.section7Title', '7. Limitation of Liability'), body: trOr('terms.section7Body', 'To the fullest extent permitted by law, E Greet shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.') },
    { title: trOr('terms.section8Title', '8. Changes to Terms'), body: trOr('terms.section8Body', 'We reserve the right to modify these Terms at any time. Continued use of the App after changes are posted constitutes acceptance of the new Terms.') },
    { title: trOr('terms.section9Title', '9. Contact'), body: trOr('terms.section9Body', 'If you have questions about these Terms, please contact us at hello@egreet.in.') },
  ];

  return (
    <View style={[s.root, { backgroundColor: t.bg }]} {...swipeHandlers}> 
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <View style={[s.header, { paddingTop: insets.top, backgroundColor: t.bg, borderBottomColor: t.border }]}> 
        <HapticButton onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[s.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>{trOr('terms.title', 'Terms & Conditions')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={[s.updated, { color: t.textMuted }]}>{trOr('terms.lastUpdated', 'Last updated: May 2025')}</Text>

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
  updated: { fontSize: 12, fontFamily: 'Manrope-Regular', color: C.muted, marginBottom: 24 },
  section: { marginBottom: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { fontSize: 14, fontFamily: 'Manrope-Bold', color: C.dark, marginBottom: 8 },
  sectionBody: { fontSize: 13, fontFamily: 'Manrope-Regular', color: C.muted, lineHeight: 22 },
});
