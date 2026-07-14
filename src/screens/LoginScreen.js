import { HapticButton } from '../components/HapticButton';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar, ScrollView,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

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

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { signIn, signInWithGoogle, googleLoading, currentUser } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleBack = () => {
    navigation.replace('MainTabs');
  };

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: handleBack,
  });

  React.useEffect(() => {
    if (currentUser) {
      navigation.replace('ProActivation');
    }
  }, [currentUser, navigation]);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const code = e.code;
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') setError(tr('login.errorInvalid'));
      else if (code === 'auth/too-many-requests') setError(tr('login.errorTooMany'));
      else setError(tr('login.errorGeneral'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    try { await signInWithGoogle(); } catch { setError(tr('login.errorGoogle')); }
  };

  const busy = loading || googleLoading;
  const ready = email && password && !busy;

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
        <Text style={[styles.headerTitle, { color: t.text }]}>{tr('login.title')}</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Google */}
        <HapticButton
          style={[styles.googleBtn, { backgroundColor: t.cardBg, borderColor: t.border }, busy && styles.btnDisabled]}
          onPress={handleGoogle} disabled={busy} activeOpacity={0.85}
        >
          {googleLoading ? <ActivityIndicator color={t.text} /> : (
            <View style={styles.googleInner}>
              <GoogleG size={20} />
              <Text style={[styles.googleText, { color: t.text }]}>{tr('login.continueGoogle')}</Text>
            </View>
          )}
        </HapticButton>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
          <Text style={[styles.dividerText, { color: t.textMuted }]}>{tr('login.or')}</Text>
          <View style={[styles.dividerLine, { backgroundColor: t.border }]} />
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
          placeholder={tr('login.email')} placeholderTextColor={t.textMuted}
          value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
        />

        <View style={styles.passRow}>
          <TextInput
            style={[styles.input, styles.passInput, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            placeholder={tr('login.password')} placeholderTextColor={t.textMuted}
            value={password} onChangeText={setPassword} secureTextEntry={!showPass}
          />
          <HapticButton style={styles.eyeBtn} onPress={() => setShowPass(v => !v)}>
            <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={t.textMuted} />
          </HapticButton>
        </View>

        <HapticButton style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={[styles.forgotText, { color: t.brand }]}>{tr('login.forgotPassword')}</Text>
        </HapticButton>

        <HapticButton
          style={[styles.btn, { backgroundColor: t.brand }, !ready && styles.btnDisabled]}
          onPress={handleLogin} disabled={!ready} activeOpacity={0.85}
        >
          {loading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnText}>{tr('login.signIn')}</Text>}
        </HapticButton>

        <HapticButton 
          style={styles.switchRow}
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.7}
        >
          <Text style={[styles.switchText, { color: t.textMuted, textAlign: 'center' }]}>
            {tr('login.noAccount')}{' '}
            <Text style={[styles.switchLink, { color: t.brand }]}>{tr('login.signUp')}</Text>
          </Text>
        </HapticButton>
      </ScrollView>
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
  passRow: { position: 'relative', marginBottom: 4 },
  passInput: { marginBottom: 0, paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 4 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 8 },
  forgotText: { fontFamily: 'Manrope-SemiBold', fontSize: 13, color: BRAND },
  btn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 20, shadowColor: BRAND, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: WHITE },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, paddingVertical: 8 },
  switchText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: MUTED },
  switchLink: { fontFamily: 'Manrope-Bold', fontSize: 14, color: BRAND },

  // Compliance Styles
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 16, gap: 10, paddingHorizontal: 2 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  agreeText: { fontFamily: 'Manrope-Regular', fontSize: 13, flex: 1, lineHeight: 18 },
  link: { fontFamily: 'Manrope-Bold', textDecorationLine: 'underline', color: BRAND },
});
