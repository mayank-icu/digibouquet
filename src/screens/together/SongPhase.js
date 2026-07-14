import { HapticButton } from '../../components/HapticButton';
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import YouTubeSearchModal from '../../components/YouTubeSearchModal';

export default function SongPhase({ song, onSelectSong, onDone, done, partnerDone }) {
  const { theme: t } = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Selected song card */}
        {song ? (
          <View style={[s.selectedCard, { backgroundColor: t.cardBg, borderColor: t.brand }]}>
            <Text style={s.selectedEmoji}>🎵</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.selectedTitle, { color: t.text }]} numberOfLines={2}>
                {song.name || song.title}
              </Text>
              <Text style={[s.selectedArtist, { color: t.textMuted }]}>
                {song.artist}
              </Text>
            </View>
            {!done && (
              <HapticButton
                onPress={() => setShowPicker(true)}
                style={[s.changeBtn, { borderColor: t.border }]}
              >
                <Text style={[s.changeBtnText, { color: t.textMuted }]}>Change</Text>
              </HapticButton>
            )}
          </View>
        ) : (
          <HapticButton
            style={[s.searchTrigger, { backgroundColor: t.cardBg, borderColor: t.border }]}
            onPress={() => !done && setShowPicker(true)}
            disabled={done}
            activeOpacity={0.8}
          >
            <Feather name="music" size={22} color={t.textMuted} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.searchTriggerTitle, { color: t.text }]}>Search for a song</Text>
              <Text style={[s.searchTriggerSub, { color: t.textMuted }]}>
                Search YouTube — pick any song you love
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={t.textMuted} />
          </HapticButton>
        )}

        <View style={s.statusRow}>
          <View style={[s.badge, { backgroundColor: done ? '#5BAD8E22' : t.border + '44' }]}>
            <Text style={[s.badgeText, { color: done ? '#5BAD8E' : t.textMuted }]}>
              {done ? `✓ ${(song?.name || song?.title) ?? 'Song chosen'}` : 'Pick your song…'}
            </Text>
          </View>
          <View style={[s.badge, { backgroundColor: partnerDone ? '#5BAD8E22' : t.border + '44' }]}>
            <Text style={[s.badgeText, { color: partnerDone ? '#5BAD8E' : t.textMuted }]}>
              {partnerDone ? '✓ Partner chose' : 'Partner choosing…'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {!done && (
        <View style={[s.footer, { backgroundColor: t.bg, borderTopColor: t.border }]}>
          {partnerDone && (
            <Text style={[s.partnerHint, { color: '#5BAD8E' }]}>Partner is ready! Lock in your song.</Text>
          )}
          <HapticButton
            style={[s.doneBtn, { backgroundColor: !song ? t.border : t.brand }]}
            onPress={onDone}
            disabled={!song}
          >
            <Text style={s.doneBtnText}>
              {song ? `Lock In "${song.name || song.title}"` : 'Select a Song First'}
            </Text>
          </HapticButton>
        </View>
      )}

      {/* YouTube Search Modal */}
      <YouTubeSearchModal
        visible={showPicker}
        onClose={() => setShowPicker(false)}
        onSongSelect={(picked) => {
          onSelectSong(picked);
          setShowPicker(false);
        }}
        currentSong={song}
      />
    </View>
  );
}

const s = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
  searchTrigger: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5,
    borderRadius: 16, padding: 16, marginBottom: 16,
  },
  searchTriggerTitle: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  searchTriggerSub: { fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 2 },
  selectedCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 2, borderRadius: 16, padding: 16, marginBottom: 16,
  },
  selectedEmoji: { fontSize: 30 },
  selectedTitle: { fontFamily: 'Manrope-Bold', fontSize: 15 },
  selectedArtist: { fontFamily: 'Manrope-Regular', fontSize: 12, marginTop: 2 },
  changeBtn: {
    borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
  },
  changeBtnText: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  statusRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  badge: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  badgeText: { fontFamily: 'Manrope-SemiBold', fontSize: 12 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1,
  },
  partnerHint: { fontFamily: 'Manrope-SemiBold', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  doneBtn: { borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  doneBtnText: { fontFamily: 'Manrope-Bold', fontSize: 16, color: '#fff' },
});
