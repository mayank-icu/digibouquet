import { HapticButton } from '../components/HapticButton';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar, ScrollView,
  Linking, Modal,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { updateProfile } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { applyPendingReferral } from '../utils/referral';

function GoogleG({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </Svg>
  );
}

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK  = '#5C4844';
const MUTED = '#997E7A';
const MID   = '#EAE0D5';
const WHITE = '#fff';
const RED   = '#E05252';

const ALLOWED_PROVIDERS = [
  'gmail.com', 'icloud.com', 'outlook.com', 'yahoo.com', 'hotmail.com',
  'aol.com', 'protonmail.com', 'proton.me', 'zoho.com', 'mail.com',
  'gmx.com', 'me.com', 'mac.com', 'ymail.com'
];

const isMajorEmailProvider = (emailStr) => {
  const parts = emailStr.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  const domain = parts[1];
  return ALLOWED_PROVIDERS.includes(domain);
};

export default function RegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { signUp, signInWithGoogle, googleLoading, currentUser } = useAuth();
  const [agreed, setAgreed]       = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [overlayType, setOverlayType] = useState(null); 


  const trOr = (key, fallback) => {
    const v = tr(key);
    return v === key ? fallback : v;
  };

  const getPrivacySections = () => [
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

  const getTermsSections = () => [
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

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('MainTabs');
    }
  };

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: handleBack,
  });

  React.useEffect(() => {
    if (currentUser) {
      navigation.replace('ProActivation', { fromScreen: route.params?.fromScreen });
    }
  }, [currentUser, navigation, route.params?.fromScreen]);

  const handleRegister = async () => {
    setError('');
    
    if (!isMajorEmailProvider(email)) {
      setError('Please use a major email provider (e.g. Gmail, iCloud, Outlook, Yahoo).');
      return;
    }
    if (!name.trim()) { setError(tr('register.errorNameRequired')); return; }
    if (password.length < 6) { setError(tr('register.errorWeakPassword')); return; }
    if (!agreed) {
      setError('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }
    
    setLoading(true);
    try {
      const cred = await signUp(email.trim(), password);
      if (cred?.user) {
        await updateProfile(cred.user, { displayName: name.trim() });
        await applyPendingReferral(cred.user);
      }
    } catch (e) {
      const code = e.code;
      if (code === 'auth/email-already-in-use') setError(tr('register.errorEmailInUse'));
      else if (code === 'auth/invalid-email') setError(tr('register.errorInvalidEmail'));
      else if (code === 'auth/weak-password') setError(tr('register.errorWeakPassword'));
      else setError(tr('register.errorGeneral'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    
    try { 
      setAgreed(true); // Automatically accept terms when signing up via Google
      await signInWithGoogle(); 
    } catch { 
      setError(tr('register.errorGoogle')); 
    }
  };

  const busy = loading || googleLoading;
  const ready = name && email && password && agreed && !busy && isMajorEmailProvider(email);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top, backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      {...swipeHandlers}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      <View style={[styles.header, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
        <HapticButton style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </HapticButton>
        <Text style={[styles.headerTitle, { color: t.text }]}>{tr('register.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Standard Registration Form */}
          <View style={styles.formContainer}>
            {/* Google Signup */}
            <HapticButton
              style={[styles.googleBtn, { backgroundColor: t.cardBg, borderColor: t.border }, busy && styles.btnDisabled]}
              onPress={handleGoogle} disabled={busy} activeOpacity={0.85}
            >
              {googleLoading ? <ActivityIndicator color={t.text} /> : (
                <View style={styles.googleInner}>
                  <GoogleG size={20} />
                  <Text style={[styles.googleText, { color: t.text }]}>{tr('register.continueGoogle')}</Text>
                </View>
              )}
            </HapticButton>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
              <Text style={[styles.dividerText, { color: t.textMuted }]}>{tr('register.or')}</Text>
              <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
            </View>

            {/* Form Fields: Name */}
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              placeholder={tr('register.name')}
              placeholderTextColor={t.textMuted} value={name} onChangeText={setName}
              autoCapitalize="words" autoCorrect={false}
            />

            {/* Form Fields: Email */}
            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text, marginBottom: email.trim().length > 0 && !isMajorEmailProvider(email) ? 4 : 12 }]}
              placeholder={tr('register.email')}
              placeholderTextColor={t.textMuted} value={email} onChangeText={setEmail}
              keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
            />
            {email.trim().length > 0 && !isMajorEmailProvider(email) && (
              <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 11, color: RED, marginBottom: 12, paddingLeft: 4 }}>
                Please use a major email provider (e.g. Gmail, iCloud, Outlook, Yahoo).
              </Text>
            )}

            {/* Form Fields: Password */}
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.passInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
                placeholder={tr('register.password')} placeholderTextColor={t.textMuted}
                value={password} onChangeText={setPassword} secureTextEntry={!showPass}
              />
              <HapticButton style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={t.textMuted} />
              </HapticButton>
            </View>

            <View style={styles.agreeRow}>
              <HapticButton 
                style={[styles.checkbox, agreed && styles.checkboxChecked, { borderColor: t.border }]}
                onPress={() => setAgreed(v => !v)}
                activeOpacity={0.8}
              >
                {agreed && <Feather name="check" size={14} color="#fff" />}
              </HapticButton>
              
              <Text style={[styles.agreeText, { color: t.textMuted }]}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => setOverlayType('terms')}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.link} onPress={() => setOverlayType('privacy')}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            <HapticButton
              style={[styles.btn, { backgroundColor: t.brand }, !ready && styles.btnDisabled]}
              onPress={handleRegister} disabled={!ready} activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnText}>{tr('register.createAccount')}</Text>}
            </HapticButton>
          </View>

        <HapticButton 
          style={styles.switchRow} 
          onPress={() => navigation.navigate('Login', { fromScreen: route.params?.fromScreen })}
          activeOpacity={0.7}
        >
          <Text style={[styles.switchText, { color: t.textMuted, textAlign: 'center' }]}>
            {tr('register.alreadyHaveAccount')}{' '}
            <Text style={[styles.switchLink, { color: t.brand }]}>{tr('register.signIn')}</Text>
          </Text>
        </HapticButton>

      </ScrollView>

      {/* Distraction-Free Terms & Privacy Modal Overlay */}
      <Modal
        visible={overlayType !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setOverlayType(null)}
      >
        <View style={styles.modalContainer}>
          <HapticButton 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setOverlayType(null)}
          />
          <View style={[styles.modalCard, { backgroundColor: t.cardBg || '#fff', borderColor: t.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: t.text }]}>
                {overlayType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </Text>
              <HapticButton onPress={() => setOverlayType(null)} style={styles.closeModalBtn}>
                <Feather name="x" size={22} color={t.text} />
              </HapticButton>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
              {(overlayType === 'terms' ? getTermsSections() : getPrivacySections()).map((sec, idx) => (
                <View key={idx} style={{ marginBottom: 16 }}>
                  <Text style={{ fontFamily: 'Manrope-Bold', fontSize: 14, color: t.text || '#5C4844', marginBottom: 6 }}>
                    {sec.title}
                  </Text>
                  <Text style={{ fontFamily: 'Manrope-Regular', fontSize: 13, color: t.textMuted || '#997E7A', lineHeight: 20 }}>
                    {sec.body}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <HapticButton style={[styles.btn, { backgroundColor: t.brand, marginTop: 16, marginBottom: 0 }]} onPress={() => setOverlayType(null)}>
              <Text style={styles.btnText}>Close</Text>
            </HapticButton>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: CREAM, borderBottomWidth: 1, borderBottomColor: MID },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-Bold', fontSize: 18, color: DARK },
  content: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40, alignItems: 'stretch' },
  logo: { width: 140, height: 50, alignSelf: 'center', marginBottom: 20 },
  error: { fontFamily: 'Manrope-Regular', fontSize: 13, color: RED, backgroundColor: '#fdecea', borderRadius: 8, padding: 10, marginBottom: 12 },
  googleBtn: { backgroundColor: WHITE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: MID, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  googleInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4', fontFamily: 'Manrope-Bold' },
  googleText: { fontFamily: 'Manrope-SemiBold', fontSize: 15, color: DARK },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: MID },
  dividerText: { fontFamily: 'Manrope-Regular', fontSize: 13, color: MUTED },
  input: { backgroundColor: WHITE, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Manrope-Regular', color: DARK, marginBottom: 12, borderWidth: 1, borderColor: MID },
  passRow: { position: 'relative', marginBottom: 12 },
  passInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
  btn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20, marginTop: 8, shadowColor: BRAND, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: WHITE },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, paddingVertical: 8 },
  switchText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: MUTED },
  switchLink: { fontFamily: 'Manrope-Bold', fontSize: 14, color: BRAND },

  // Compliance Styles

  formContainer: { marginTop: 10 },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 16, gap: 10, paddingHorizontal: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  agreeText: { fontFamily: 'Manrope-Regular', fontSize: 13, flex: 1, lineHeight: 18 },
  link: { fontFamily: 'Manrope-Bold', textDecorationLine: 'underline', color: BRAND },

  // Modal Styles
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalCard: { width: '100%', height: '80%', borderRadius: 16, borderWidth: 1, padding: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'Manrope-Bold', fontSize: 18 },
  closeModalBtn: { padding: 4 },
  modalScroll: { flex: 1 },
  modalBodyText: { fontFamily: 'Manrope-Regular', fontSize: 14, lineHeight: 22 },
});
