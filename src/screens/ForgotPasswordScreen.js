import { HapticButton } from '../components/HapticButton';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const BRAND = '#7A5C58';
const CREAM = '#FAF7F2';
const DARK  = '#5C4844';
const MUTED = '#997E7A';
const MID   = '#EAE0D5';
const WHITE = '#fff';
const RED   = '#E05252';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { resetPassword } = useAuth();
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleBack = () => {
    navigation.replace('MainTabs');
  };

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: handleBack,
  });

  const handleReset = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch {
      setError(tr('forgotPassword.errorSend'));
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={[styles.headerTitle, { color: t.text }]}>{tr('forgotPassword.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.sub, { color: t.textMuted }]}>{tr('forgotPassword.sub')}</Text>

        {sent ? (
          <View style={styles.successBox}>
            <View style={styles.successIconRow}>
              <Feather name="check-circle" size={32} color="#27ae60" />
              <Text style={[styles.successText, { color: t.text }]}>{tr('forgotPassword.successText')}</Text>
            </View>
            <HapticButton style={[styles.btn, { backgroundColor: t.brand }]} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.btnText}>{tr('forgotPassword.backToSignIn')}</Text>
            </HapticButton>
          </View>
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TextInput
              style={[styles.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
              placeholder={tr('forgotPassword.email')}
              placeholderTextColor={t.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <HapticButton
              style={[styles.btn, { backgroundColor: t.brand }, (!email || loading) && styles.btnDisabled]}
              onPress={handleReset}
              disabled={!email || loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color={WHITE} /> : <Text style={styles.btnText}>{tr('forgotPassword.sendLink')}</Text>}
            </HapticButton>

            <HapticButton style={styles.switchRow} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={[styles.switchText, { color: t.textMuted }]}>{tr('forgotPassword.rememberPassword')} </Text>
              <Text style={[styles.switchLink, { color: t.brand }]}>{tr('forgotPassword.backToLogin')}</Text>
            </HapticButton>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CREAM },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: CREAM,
    borderBottomWidth: 1, borderBottomColor: MID,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Manrope-Bold', fontSize: 18, color: DARK },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 28, alignItems: 'stretch' },
  title: { fontFamily: 'Manrope-Bold', fontSize: 28, color: DARK, marginBottom: 6 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 20 },
  error: {
    fontFamily: 'Manrope-Regular', fontSize: 13, color: RED,
    backgroundColor: '#fdecea', borderRadius: 8, padding: 10, marginBottom: 12,
  },
  input: {
    backgroundColor: WHITE, borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 16, fontSize: 15, fontFamily: 'Manrope-Regular',
    color: DARK, marginBottom: 16, borderWidth: 1, borderColor: MID,
  },
  btn: {
    backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
    shadowColor: BRAND, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: WHITE },
  successBox: { gap: 20 },
  successIconRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#e8f5e9', borderRadius: 12, padding: 16 },
  successText: {
    fontFamily: 'Manrope-Regular', fontSize: 14, color: DARK, flex: 1, lineHeight: 20,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  switchText: { fontFamily: 'Manrope-Regular', fontSize: 14, color: MUTED },
  switchLink: { fontFamily: 'Manrope-Bold', fontSize: 14, color: BRAND },
});
