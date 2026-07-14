import { HapticButton } from '../../components/HapticButton';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

const SUGGESTIONS = [
  'You make every day brighter. 🌸',
  'Thank you for always being there for me.',
  'Every moment with you is a treasure.',
  'You mean the absolute world to me.',
  'This bouquet is a little piece of my heart for you.',
  'Wishing you all the happiness in the world!',
];

export default function MessagePhase({
  message, onUpdateMessage, onDone, done, partnerDone,
}) {
  const { theme: t } = useTheme();
  const [local, setLocal] = useState(message || '');

  const handleChange = (v) => {
    setLocal(v);
    onUpdateMessage?.(v);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <TextInput
          style={[s.input, { borderColor: t.border, color: t.text, backgroundColor: t.inputBg }]}
          multiline
          placeholder="Write something from the heart…"
          placeholderTextColor={t.textMuted}
          value={local}
          onChangeText={handleChange}
          maxLength={500}
          editable={!done}
        />
        <Text style={[s.charCount, { color: t.textMuted }]}>{local.length}/500</Text>

        <Text style={[s.suggestTitle, { color: t.textMuted }]}>Quick suggestions</Text>
        <View style={s.suggestions}>
          {SUGGESTIONS.map((sg, i) => (
            <HapticButton
              key={i}
              style={[s.sgChip, { borderColor: t.border, backgroundColor: t.cardBg }]}
              onPress={() => handleChange(sg)}
              disabled={done}
            >
              <Text style={[s.sgText, { color: t.text }]}>{sg}</Text>
            </HapticButton>
          ))}
        </View>

        <View style={s.statusRow}>
          <View style={[s.badge, { backgroundColor: done ? '#5BAD8E22' : t.border + '44' }]}>
            <Text style={[s.badgeText, { color: done ? '#5BAD8E' : t.textMuted }]}>
              {done ? '✓ Your message locked' : 'Write your message…'}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: partnerDone ? '#5BAD8E22' : t.border + '44' }]}>
            <Text style={[s.badgeText, { color: partnerDone ? '#5BAD8E' : t.textMuted }]}>
              {partnerDone ? '✓ Partner wrote theirs' : 'Partner writing…'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {!done && (
        <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border }]}>
          {partnerDone && (
            <Text style={[s.partnerHint, { color: '#5BAD8E' }]}>Partner is ready! Lock in your message.</Text>
          )}
          <HapticButton
            style={[s.doneBtn, { backgroundColor: local.trim().length === 0 ? t.border : t.brand }]}
            onPress={onDone}
            disabled={local.trim().length === 0}
          >
            <Text style={s.doneBtnText}>Lock Message</Text>
            <Feather name="lock" size={16} color="#fff" style={{ marginLeft: 8 }} />
          </HapticButton>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  title: { fontFamily: 'Manrope-Bold', fontSize: 20, marginBottom: 6 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  input: {
    borderWidth: 1.5, borderRadius: 16, padding: 16,
    fontFamily: 'Manrope-Regular', fontSize: 15, minHeight: 130,
    textAlignVertical: 'top', lineHeight: 22,
  },
  charCount: { fontFamily: 'Manrope-Regular', fontSize: 11, textAlign: 'right', marginTop: 6, marginBottom: 20 },
  suggestTitle: { fontFamily: 'Manrope-SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  suggestions: { gap: 8 },
  sgChip: { borderWidth: 1.5, borderRadius: 12, padding: 12 },
  sgText: { fontFamily: 'Manrope-Regular', fontSize: 13, lineHeight: 18 },
  statusRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  badge: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  badgeText: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1,
  },
  partnerHint: { fontFamily: 'Manrope-SemiBold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 16, paddingVertical: 15,
  },
  doneBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
});
