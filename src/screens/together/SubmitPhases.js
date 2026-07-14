import { HapticButton } from '../../components/HapticButton';
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { CachedImage } from '../../components/CachedImage';

// ── WaitingPhase ─────────────────────────────────────────────────────────────
export function WaitingPhase({ onSubmit, submitted }) {
  const { theme: t } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <View style={ws.root}>
      <Animated.Text style={[ws.emoji, { transform: [{ scale: pulse }] }]}>🕊️</Animated.Text>
      <Text style={[ws.title, { color: t.text }]}>
        {submitted ? 'Waiting for your partner…' : 'Almost there!'}
      </Text>
      <Text style={[ws.sub, { color: t.textMuted }]}>
        {submitted
          ? 'Your submission is locked in. As soon as your partner submits, the bouquet will be revealed!'
          : 'You\'ve completed all the steps. Hit submit to lock in your part of the bouquet!'
        }
      </Text>
      {!submitted && (
        <HapticButton style={[ws.btn, { backgroundColor: '#7A5C58' }]} onPress={onSubmit}>
          <Text style={ws.btnText}>Submit My Part 🎁</Text>
          <Feather name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />
        </HapticButton>
      )}
      {submitted && (
        <View style={[ws.lockedBadge, { backgroundColor: '#5BAD8E22', borderColor: '#5BAD8E' }]}>
          <Feather name="check-circle" size={16} color="#5BAD8E" />
          <Text style={[ws.lockedText, { color: '#5BAD8E' }]}>Your submission is locked in</Text>
        </View>
      )}
    </View>
  );
}

const ws = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontFamily: 'Manrope-Bold', fontSize: 22, textAlign: 'center', marginBottom: 12 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 36, paddingVertical: 16, borderRadius: 24,
  },
  btnText: { fontFamily: 'Manrope-Bold', fontSize: 17, color: '#fff' },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12,
  },
  lockedText: { fontFamily: 'Manrope-SemiBold', fontSize: 14 },
});

// ── DonePhase ─────────────────────────────────────────────────────────────────
export function DonePhase({ myData, partnerData, onClose }) {
  const { theme: t } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={ds.root}>
      <Animated.Text style={[ds.emoji, { transform: [{ scale }] }]}>🎉</Animated.Text>
      <Text style={[ds.title, { color: t.text }]}>Your Bouquet is Ready!</Text>
      <Text style={[ds.sub, { color: t.textMuted }]}>
        Both of you have submitted. Here&apos;s what you made for each other:
      </Text>

      {/* Partner's message to me */}
      {partnerData?.message ? (
        <View style={[ds.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <Text style={[ds.cardLabel, { color: t.textMuted }]}>💌 Their message to you</Text>
          <Text style={[ds.cardMsg, { color: t.text }]}>{partnerData.message}</Text>
        </View>
      ) : null}

      {/* Partner's custom drawing */}
      {partnerData?.drawingUrl ? (
        <View style={[ds.card, { backgroundColor: t.cardBg, borderColor: t.border, alignItems: 'center' }]}>
          <Text style={[ds.cardLabel, { color: t.textMuted, alignSelf: 'flex-start' }]}>🎨 Flower they drew for you</Text>
          <CachedImage source={{ uri: partnerData.drawingUrl }} style={ds.drawingPreview} resizeMode="contain" />
        </View>
      ) : null}

      {/* Partner's song for me */}
      {partnerData?.song ? (
        <View style={[ds.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <Text style={[ds.cardLabel, { color: t.textMuted }]}>🎵 Song they chose for you</Text>
          <Text style={[ds.cardTitle, { color: t.text }]}>{partnerData.song.title}</Text>
          <Text style={[ds.cardArtist, { color: t.textMuted }]}>{partnerData.song.artist}</Text>
        </View>
      ) : null}

      {/* My message */}
      {myData?.message ? (
        <View style={[ds.card, { backgroundColor: t.cardBg, borderColor: t.border }]}>
          <Text style={[ds.cardLabel, { color: t.textMuted }]}>✍️ Your message to them</Text>
          <Text style={[ds.cardMsg, { color: t.text }]}>{myData.message}</Text>
        </View>
      ) : null}

      <HapticButton style={[ds.closeBtn, { backgroundColor: '#7A5C58' }]} onPress={onClose}>
        <Text style={ds.closeBtnText}>Done 🌸</Text>
      </HapticButton>
    </View>
  );
}

const ds = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, paddingTop: 32, alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontFamily: 'Manrope-Bold', fontSize: 24, textAlign: 'center', marginBottom: 8 },
  sub: { fontFamily: 'Manrope-Regular', fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  card: {
    width: '100%', borderWidth: 1.5, borderRadius: 16, padding: 16, marginBottom: 12,
  },
  cardLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  cardMsg: { fontFamily: 'Manrope-Regular', fontSize: 14, lineHeight: 21 },
  cardTitle: { fontFamily: 'Manrope-Bold', fontSize: 16 },
  cardArtist: { fontFamily: 'Manrope-Regular', fontSize: 13, marginTop: 2 },
  drawingPreview: { width: 150, height: 112, marginTop: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee' },
  closeBtn: {
    marginTop: 16, paddingHorizontal: 40, paddingVertical: 16, borderRadius: 24,
  },
  closeBtnText: { fontFamily: 'Manrope-Bold', fontSize: 17, color: '#fff' },
});
