import { HapticButton } from '../components/HapticButton';
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getDeviceId } from '../utils/deviceId';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useAccessibility } from '../contexts/AccessibilityContext';

const C = { bg: '#FAF7F2', rose: '#7A5C58', muted: '#997E7A', dark: '#5C4844', border: '#EAE0D5', white: '#fff' };

export default function FeedbackScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr } = useLanguage();
  const { currentUser } = useAuth();
  const { getTextSize } = useAccessibility();

  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const CATEGORIES = [
    { key: 'bugReport', label: tr('feedback.bugReport') },
    { key: 'featureRequest', label: tr('feedback.featureRequest') },
    { key: 'general', label: tr('feedback.general') },
    { key: 'other', label: tr('feedback.other') },
  ];

  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Toast.show({ type: 'error', text1: tr('feedback.errorEmpty') });
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Toast.show({ type: 'error', text1: tr('feedback.emailRequired'), text2: tr('feedback.emailRequiredDesc') });
      return;
    }
    setSending(true);

    try {
      const deviceId = await getDeviceId();
      const userId = currentUser?.uid || deviceId;
      
      const lastFeedbackDoc = await getDoc(doc(db, 'user-feedbacks', userId));
      if (lastFeedbackDoc.exists()) {
        const data = lastFeedbackDoc.data();
        const lastSentAt = data.lastSentAt;
        if (lastSentAt) {
          const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - lastSentAt < oneWeekMs) {
            Toast.show({ type: 'error', text1: tr('feedback.limitReached'), text2: tr('feedback.limitReachedDesc') });
            setSending(false);
            return;
          }
        }
      }

      const { httpsCallable } = require('firebase/functions');
      const { functions } = require('../firebase');
      const sendFeedbackEmail = httpsCallable(functions, 'sendFeedbackEmail');

      await sendFeedbackEmail({
        subject: `Feedback: ${CATEGORIES.find(c => c.key === category)?.label || 'General'}`,
        html: `<p><strong>Category:</strong> ${category}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br/>')}</p>`,
        text: `Category: ${category}\nEmail: ${email}\nMessage:\n${message}`,
      });

      await setDoc(doc(db, 'user-feedbacks', userId), { lastSentAt: Date.now() }, { merge: true });

      Toast.show({ type: 'success', text1: tr('feedback.successTitle'), text2: tr('feedback.successMsg') });
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: tr('feedback.errorSend'), text2: tr('feedback.errorSendDesc') });
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.root, { backgroundColor: t.bg }]} {...swipeHandlers}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

        {/* Header */}
        <View style={[s.header, { paddingTop: insets.top, backgroundColor: t.bg, borderBottomColor: t.border }]}>
          <HapticButton onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={22} color={t.text} />
          </HapticButton>
          <Text style={[s.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>{tr('feedback.title')}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
          <Text style={[s.lead, { color: t.textMuted }]}>{tr('feedback.lead')}</Text>

          {/* Category */}
          <Text style={[s.label, { color: t.brand }]}>{tr('feedback.categoryLabel')}</Text>
          <View style={s.chips}>
            {CATEGORIES.map(c => (
              <HapticButton
                key={c.key}
                style={[s.chip, { borderColor: t.border, backgroundColor: t.cardBg }, category === c.key && { backgroundColor: t.brand, borderColor: t.brand }]}
                onPress={() => setCategory(c.key)}
              >
                <Text style={[s.chipText, { color: t.textMuted }, category === c.key && { color: C.white }]}>{c.label}</Text>
              </HapticButton>
            ))}
          </View>

          {/* Message */}
          <Text style={[s.label, { color: t.brand }]}>{tr('feedback.messageLabel')}</Text>
          <TextInput
            style={[s.textarea, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            placeholder={tr('feedback.messagePlaceholder')}
            placeholderTextColor={t.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={[s.charCount, { color: t.textMuted }]}>{message.length}/1000</Text>

          {/* Email */}
          <Text style={[s.label, { color: t.brand }]}>{tr('feedback.emailLabel')}</Text>
          <TextInput
            style={[s.input, { backgroundColor: t.inputBg, borderColor: t.border, color: t.text }]}
            placeholder={tr('feedback.emailPlaceholder') || 'your@email.com'}
            placeholderTextColor={t.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          {/* Send */}
          <HapticButton style={[s.sendBtn, { backgroundColor: t.brand }, sending && { opacity: 0.6 }]} onPress={handleSend} disabled={sending}>
            <Feather name="send" size={18} color={C.white} />
            <Text style={s.sendBtnText}>{sending ? tr('feedback.sending') : tr('feedback.send')}</Text>
          </HapticButton>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope-SemiBold', color: C.dark },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  lead: { fontSize: 14, fontFamily: 'Manrope-Regular', color: C.muted, lineHeight: 22, marginBottom: 28 },
  label: { fontSize: 12, fontFamily: 'Manrope-Bold', color: C.rose, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  chipActive: { backgroundColor: C.rose, borderColor: C.rose },
  chipText: { fontSize: 13, fontFamily: 'Manrope-SemiBold', color: C.muted },
  chipTextActive: { color: C.white },
  textarea: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, padding: 14, fontSize: 14, fontFamily: 'Manrope-Regular', color: C.dark, minHeight: 140, marginBottom: 4 },
  charCount: { fontSize: 11, color: C.muted, textAlign: 'right', marginBottom: 20 },
  input: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, padding: 14, fontSize: 14, fontFamily: 'Manrope-Regular', color: C.dark, marginBottom: 6 },
  hint: { fontSize: 11, color: C.muted, marginBottom: 32 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.rose, borderRadius: 14, paddingVertical: 16 },
  sendBtnText: { fontSize: 15, fontFamily: 'Manrope-Bold', color: C.white },
});
