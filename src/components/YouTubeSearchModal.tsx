import React, { useState, useCallback, memo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  Image, Modal, ActivityIndicator, StyleSheet, Dimensions,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Music, Search, X, Play, Pause,
  Check, Lock, Sliders, Star,
} from 'lucide-react-native';
import { searchYouTube } from '../services/youtubeSearch';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from './CachedImage';

// ── Constants ─────────────────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const TIMELINE_W = W - 32;
const PREVIEW_DURATION = 30;
const DURATION_OPTIONS = [15, 30, 45, 60];

const C = {
  rose: '#7A5C58', cream: '#FAF7F2', card: '#FFFFFF',
  muted: '#997E7A', border: '#EAE0D5', text: '#5C4844',
  gold: '#F5A623', lock: '#b05c7a',
};

// ── Types ─────────────────────────────────────────────────────────────────────
export interface YouTubeSong {
  id: string; name: string; artist: string;
  albumArt: string; duration: string;
  previewUrl?: string;
  url?: string;
  startTime?: number; clipDuration?: number;
  isItunes?: boolean;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSongSelect: (song: YouTubeSong) => void;
  currentSong?: YouTubeSong | null;
}

// ── iTunes preview fetch ──────────────────────────────────────────────────────
async function fetchItunesPreview(query: string): Promise<string | null> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_ITUNES_SEARCH_URL || 'https://itunes.apple.com/search';
    const url = `${baseUrl}?term=${encodeURIComponent(query)}&media=music&limit=1&entity=song`;
    const res = await fetch(url);
    const json = await res.json();
    return json.results?.[0]?.previewUrl ?? null;
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseDuration(dur: string): number {
  if (!dur) return 300;
  const parts = dur.split(':');
  if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  if (parts.length === 3) return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
  return 300;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Popular / curated songs shown before any search ─────────────────────────
const POPULAR_SONGS: YouTubeSong[] = [
  { id: 'JGwWNGJdvx8', name: 'Shape of You', artist: 'Ed Sheeran', albumArt: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: '4:24' },
  { id: 'kXYiU_JCYtU', name: 'Numb', artist: 'Linkin Park', albumArt: 'https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg', duration: '3:07' },
  { id: 'ic8j13piAhQ', name: 'Cruel Summer', artist: 'Taylor Swift', albumArt: 'https://img.youtube.com/vi/ic8j13piAhQ/hqdefault.jpg', duration: '2:58' },
  { id: 'G7KNmW9a75Y', name: 'Flowers', artist: 'Miley Cyrus', albumArt: 'https://img.youtube.com/vi/G7KNmW9a75Y/hqdefault.jpg', duration: '3:21' },
  { id: '4NRXx6U8ABQ', name: 'Blinding Lights', artist: 'The Weeknd', albumArt: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg', duration: '3:22' },
  { id: 'H5v3kku4y6Q', name: 'As It Was', artist: 'Harry Styles', albumArt: 'https://img.youtube.com/vi/H5v3kku4y6Q/hqdefault.jpg', duration: '2:46' },
  { id: 'RgKAFK5djSk', name: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', albumArt: 'https://img.youtube.com/vi/RgKAFK5djSk/hqdefault.jpg', duration: '3:58' },
  { id: '2Vv-BfVoq4g', name: 'Perfect', artist: 'Ed Sheeran', albumArt: 'https://img.youtube.com/vi/2Vv-BfVoq4g/hqdefault.jpg', duration: '4:40' },
  { id: 'TUVcZfQe-Kw', name: 'Levitating', artist: 'Dua Lipa', albumArt: 'https://img.youtube.com/vi/TUVcZfQe-Kw/hqdefault.jpg', duration: '3:24' },
  { id: 'OPf0YbXqDm0', name: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', albumArt: 'https://img.youtube.com/vi/OPf0YbXqDm0/hqdefault.jpg', duration: '4:31' },
];

// ── Component ─────────────────────────────────────────────────────────────────
function YouTubeSearchModal({ visible, onClose, onSongSelect, currentSong }: Props) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const isLoggedIn = !!currentUser;
  const insets = useSafeAreaInsets();

  // Tab
  const [activeTab, setActiveTab] = useState<'best' | 'custom'>('best');

  // Search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeSong[]>([]);
  const [searching, setSearching] = useState(false);

  // Selection
  const [selected, setSelected] = useState<YouTubeSong | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // iTunes audio
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  // Crop - simple state-based approach
  const [clipDuration, setClipDuration] = useState(30);
  const [startTime, setStartTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartLeft = useRef(0);

  // YouTube
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [youtubePlaying, setYoutubePlaying] = useState(false);
  const [youtubeCurrentTime, setYoutubeCurrentTime] = useState(0);
  const [youtubeDuration, setYoutubeDuration] = useState(0);
  const youtubeRef = useRef<any>(null);

  // ScrollView scroll-lock while dragging crop window
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Keyboard
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const isClosingRef = useRef(!visible);
  useEffect(() => {
    isClosingRef.current = !visible;
  }, [visible]);
  const selectionIdRef = useRef(0);

  // ── Computed from selected ──────────────────────────────────────────────────
  const videoDurationSeconds = selected ? parseDuration(selected.duration) : 300;
  const timelineMaxSeconds   = Math.min(videoDurationSeconds, 300);

  // pixel width of the yellow window
  const cropWindowPx = (clipDuration / timelineMaxSeconds) * TIMELINE_W;
  const maxCropLeft  = TIMELINE_W - cropWindowPx;
  
  // Calculate crop window position from startTime
  const cropLeftPx = (startTime / timelineMaxSeconds) * TIMELINE_W;

  // ── Touch handlers for dragging ────────────────────────────────────────────
  const handleCropTouchStart = (e: any) => {
    setIsDragging(true);
    setScrollEnabled(false);
    dragStartX.current = e.nativeEvent.pageX;
    dragStartLeft.current = cropLeftPx;
  };

  const handleCropTouchMove = (e: any) => {
    if (!isDragging) return;
    const deltaX = e.nativeEvent.pageX - dragStartX.current;
    const newLeft = Math.max(0, Math.min(maxCropLeft, dragStartLeft.current + deltaX));
    const newStartTime = Math.round((newLeft / TIMELINE_W) * timelineMaxSeconds);
    setStartTime(newStartTime);
  };

  const handleCropTouchEnd = async () => {
    setIsDragging(false);
    setScrollEnabled(true);
    // Seek YouTube player to the new start position
    if (youtubeRef.current && youtubeReady) {
      try {
        await youtubeRef.current.seekTo(startTime, true);
        setYoutubeCurrentTime(startTime);
      } catch (err) {
        console.log('Seek error:', err);
      }
    }
  };

  // ── Audio cleanup ───────────────────────────────────────────────────────────
  const stopAndUnload = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
    setPlaying(false);
    setPosition(0);
  }, []);

  useEffect(() => { if (!visible) stopAndUnload(); }, [visible]);

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetSelection = useCallback(() => {
    stopAndUnload();
    setSelected(null);
    setPreviewUrl(null);
    setStartTime(0);
    setClipDuration(30);
    setIsDragging(false);
    setYoutubeReady(false);
    setYoutubePlaying(false);
    setYoutubeCurrentTime(0);
    setYoutubeDuration(0);
    setScrollEnabled(true);
  }, [stopAndUnload]);

  const handleClose = useCallback(() => {
    resetSelection();
    setQuery('');
    setResults([]);
    onClose();
  }, [resetSelection, onClose]);

  // ── YouTube search ──────────────────────────────────────────────────────────
  const handleSearch = useCallback(async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    resetSelection();
    Keyboard.dismiss();
    try {
      const raw = await searchYouTube(searchQuery.trim());
      setResults(raw.map((r: any) => ({
        id: r.id, name: r.title, artist: r.channel,
        albumArt: r.thumbnail, duration: r.duration || '',
      })));
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [query, resetSelection]);


  // ── Pick result ─────────────────────────────────────────────────────────────
  const handleSelectVideo = useCallback(async (song: YouTubeSong) => {
    selectionIdRef.current += 1;
    const currentId = selectionIdRef.current;
    
    resetSelection();
    setSelected(song);
    setPreviewLoading(true);
    const url = await fetchItunesPreview(`${song.name} ${song.artist}`);
    
    if (isClosingRef.current || currentId !== selectionIdRef.current) return;
    
    setPreviewUrl(url);
    setPreviewLoading(false);

    if (url) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        if (isClosingRef.current || currentId !== selectionIdRef.current) return;
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: true, isLooping: false },
        );
        
        if (isClosingRef.current || currentId !== selectionIdRef.current) {
          await sound.unloadAsync();
          return;
        }
        
        soundRef.current = sound;
        setPlaying(true);
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (s.isLoaded) {
            setPosition(s.positionMillis / 1000);
            if (s.didJustFinish) { setPlaying(false); setPosition(0); }
          }
        });
      } catch {}
    } else {
      // No iTunes preview available — automatically switch to custom tab
      // so user can pick their own clip from the YouTube player
      setActiveTab('custom');
    }
  }, [resetSelection]);

  // ── YouTube ready/state ─────────────────────────────────────────────────────
  const handleYouTubeReady = useCallback(() => {
    setYoutubeReady(true);
    youtubeRef.current?.getDuration().then((d: number) => setYoutubeDuration(d));
  }, []);

  const handleYouTubeStateChange = useCallback((state: string) => {
    setYoutubePlaying(state === 'playing');
    if (state === 'ended') setYoutubePlaying(false);
  }, []);

  // ── YouTube polling — enforces clip end ─────────────────────────────────────
  // We keep refs so the interval always reads the latest values without
  // being re-created on every state change.
  const startTimeRef    = useRef(startTime);
  const clipDurationRef = useRef(clipDuration);
  const activeTabRef    = useRef(activeTab);

  useEffect(() => { startTimeRef.current    = startTime;    }, [startTime]);
  useEffect(() => { clipDurationRef.current = clipDuration; }, [clipDuration]);
  useEffect(() => { activeTabRef.current    = activeTab;    }, [activeTab]);

  useEffect(() => {
    if (!youtubePlaying) return;
    const id = setInterval(async () => {
      if (!youtubeRef.current) return;
      try {
        const ct: number = await youtubeRef.current.getCurrentTime();
        setYoutubeCurrentTime(ct);

        if (activeTabRef.current === 'custom') {
          const end = startTimeRef.current + clipDurationRef.current;
          // Stop when reaching the end of the yellow window
          if (ct >= end - 0.1) {
            await youtubeRef.current.pauseVideo();
            setYoutubePlaying(false);
            // Seek back to start of clip so user can replay easily
            await youtubeRef.current.seekTo(startTimeRef.current, true);
            setYoutubeCurrentTime(startTimeRef.current);
          }
        }
      } catch {}
    }, 500); // was 100 — slower polling prevents listener accumulation

    return () => clearInterval(id);
  }, [youtubePlaying]);

  const toggleYouTubePlay = useCallback(async () => {
    if (!youtubeRef.current || !youtubeReady) return;
    try {
      if (youtubePlaying) {
        await youtubeRef.current.pauseVideo();
        setYoutubePlaying(false);
      } else {
        // If we're in custom mode, always seek to startTime before playing
        if (activeTab === 'custom') {
          await youtubeRef.current.seekTo(startTime, true);
          setYoutubeCurrentTime(startTime);
        }
        await youtubeRef.current.playVideo();
        setYoutubePlaying(true);
      }
    } catch (err) {
      console.log('YouTube play/pause error:', err);
    }
  }, [youtubePlaying, youtubeReady, activeTab, startTime]);

  const seekYouTube = useCallback(async (seconds: number) => {
    if (!youtubeRef.current || !youtubeReady) return;
    const clamped = Math.max(0, Math.min(timelineMaxSeconds, seconds));
    await youtubeRef.current.seekTo(clamped, true);
    setYoutubeCurrentTime(clamped);
    setStartTime(clamped);
  }, [youtubeReady, timelineMaxSeconds]);

  // ── iTunes play/pause ───────────────────────────────────────────────────────
  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    if (playing) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setPlaying(true);
    }
  }, [playing]);

  // ── Confirm ─────────────────────────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!selected) return;
    
    isClosingRef.current = true;
    
    const isItunes = activeTab === 'best' && !!previewUrl;
    
    const songData = {
      ...selected,
      url: isItunes ? previewUrl : undefined,
      previewUrl: isItunes ? previewUrl : `https://www.youtube.com/watch?v=${selected.id}`,
      isItunes,
      startTime: activeTab === 'custom' && isLoggedIn ? startTime : 0,
      clipDuration: activeTab === 'custom' && isLoggedIn ? clipDuration : 30,
    };
    
    await stopAndUnload();
    onSongSelect(songData);
    handleClose();
  }, [selected, startTime, clipDuration, activeTab, isLoggedIn, previewUrl, onSongSelect, handleClose, stopAndUnload]);

  // ── Needle position — clamped to crop window in custom mode ─────────────────
  const needleLeft = (() => {
    if (activeTab !== 'custom') {
      return (youtubeCurrentTime / Math.max(timelineMaxSeconds, 1)) * TIMELINE_W;
    }
    // In custom mode pin needle within [cropLeftPx, cropLeftPx + cropWindowPx]
    const relPx = ((youtubeCurrentTime - startTime) / Math.max(clipDuration, 1)) * cropWindowPx;
    const clampedRel = Math.max(0, Math.min(cropWindowPx, relPx));
    return cropLeftPx + clampedRel;
  })();

  const progressPct = Math.min(1, position / PREVIEW_DURATION);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal hardwareAccelerated={true} visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom }]}>

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>{t('youtubeSearch.addMusic')}</Text>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={s.closeBtn}
            >
              <Text style={s.closeBtnText}>Close</Text>
              <X size={20} color={C.muted} />
            </TouchableOpacity>
          </View>

          <View style={s.searchContainer}>
            <View style={s.searchBarInner}>
              <TextInput
                style={[s.searchInput, { paddingLeft: 16 }]}
                placeholder={t('youtubeSearch.searchPlaceholder')}
                placeholderTextColor={C.muted}
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={() => handleSearch()}
                returnKeyType="search"
                autoCorrect={false}
              />
              {results.length > 0 && query.trim().length > 0 && (
                <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }} style={{ padding: 8 }}>
                  <X size={18} color={C.muted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[s.searchBtnInside, (!query.trim() || searching) && s.btnDisabled]}
                onPress={() => handleSearch()}
                disabled={!query.trim() || searching}
              >
                <Search size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── States ── */}
          {searching ? (
            <View style={{ paddingTop: 10 }}>
               {[1, 2, 3, 4, 5].map(i => (
                 <View key={i} style={[s.songCard, { opacity: 0.6 }]}>
                   <View style={[s.songThumb, { backgroundColor: '#e0e0e0' }]} />
                   <View style={{ flex: 1, marginHorizontal: 10, gap: 6 }}>
                     <View style={{ height: 14, backgroundColor: '#e0e0e0', borderRadius: 4, width: '80%' }} />
                     <View style={{ height: 12, backgroundColor: '#e0e0e0', borderRadius: 4, width: '40%' }} />
                   </View>
                   <View style={{ width: 60, height: 30, backgroundColor: '#e0e0e0', borderRadius: 15 }} />
                 </View>
               ))}
            </View>

          ) : selected ? (
            /* ── SELECTION SCREEN ── */
            <ScrollView
              style={s.selBox}
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 120, 140) }}
            >
              {/* YouTube Player */}
              <View style={s.videoWrapper}>
                <YoutubePlayer
                  ref={youtubeRef}
                  height={W * 0.5}
                  width={W - 32}
                  play={false}
                  videoId={selected.id}
                  onReady={handleYouTubeReady}
                  onChangeState={handleYouTubeStateChange}
                  forceAndroidAutoplay={Platform.OS === 'android'}
                  webViewProps={{
                    mediaPlaybackRequiresUserAction: false,
                  }}
                  initialPlayerParams={{ controls: true, rel: false }}
                />
                {youtubeReady && youtubeDuration > 0 && (
                  <View style={s.youtubeProgress}>
                    <View style={s.youtubeProgressTrack}>
                      <View
                        style={[
                          s.youtubeProgressFill,
                          { width: `${(youtubeCurrentTime / youtubeDuration) * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={s.youtubeProgressText}>
                      {formatTime(youtubeCurrentTime)} / {formatTime(youtubeDuration)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Info row */}
              <View style={s.infoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.selTitle} numberOfLines={2}>{selected.name}</Text>
                  <Text style={s.selArtist} numberOfLines={1}>{selected.artist}</Text>
                </View>
                {selected.duration ? (
                  <View style={s.durationBadge}>
                    <Text style={s.durationText}>{selected.duration}</Text>
                  </View>
                ) : null}
              </View>

              {/* Mode tabs */}
              <View style={s.modeRow}>
                <TouchableOpacity
                  style={[s.modeTab, activeTab === 'best' && s.modeTabActive]}
                  onPress={() => {
                    setActiveTab('best');
                    setStartTime(0);
                    setClipDuration(30);
                  }}
                >
                  <Star
                    size={16}
                    color={activeTab === 'best' ? 'white' : C.muted}
                    fill={activeTab === 'best' ? 'white' : 'none'}
                  />
                  <Text style={[s.modeTabText, activeTab === 'best' && s.modeTabTextActive]}>
                    {t('youtubeSearch.bestPart')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modeTab, activeTab === 'custom' && s.modeTabActive]}
                  onPress={async () => {
                    setActiveTab('custom');
                    if (playing && soundRef.current) {
                      try { await soundRef.current.pauseAsync(); setPlaying(false); } catch {}
                    }
                  }}
                >
                  <Sliders size={16} color={activeTab === 'custom' ? 'white' : C.muted} />
                  <Text style={[s.modeTabText, activeTab === 'custom' && s.modeTabTextActive]}>
                    {t('youtubeSearch.custom')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── BEST PART TAB ── */}
              {activeTab === 'best' && (
                <View style={s.bestPartSection}>
                  <Text style={s.sectionTitle}>{t('youtubeSearch.bestPartPreview')}</Text>
                  <Text style={s.sectionSubtitle}>{t('youtubeSearch.bestPartSubtitle')}</Text>

                  {previewLoading ? (
                    <View style={s.playerBox}>
                      <ActivityIndicator size="small" color={C.rose} />
                      <Text style={[s.mutedText, { marginLeft: 8 }]}>{t('youtubeSearch.findingPreview')}</Text>
                    </View>
                  ) : previewUrl ? (
                    <View style={s.playerBox}>
                      <TouchableOpacity onPress={togglePlay} style={s.playBtn}>
                        {playing
                          ? <Pause size={20} color="white" />
                          : <Play  size={20} color="white" fill="white" />}
                      </TouchableOpacity>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={s.progressTrack}>
                          <View style={[s.progressFill, { width: `${progressPct * 100}%` as any }]} />
                        </View>
                        <Text style={s.progressLabel}>
                          30s preview • {Math.floor(position)}s / 30s
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={s.playerBox}>
                      <Text style={s.mutedText}>{t('youtubeSearch.noPreviewAvailable')}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ── CUSTOM TAB ── */}
              {activeTab === 'custom' && (
                <View style={s.customSection}>
                  {isLoggedIn ? (
                    <View style={s.cropSection}>

                      {/* Clip-duration chips */}
                      <Text style={s.cropLabel}>{t('youtubeSearch.clipDurationLabel')}</Text>
                      <View style={s.durationRow}>
                        {DURATION_OPTIONS.map(d => (
                          <TouchableOpacity
                            key={d}
                            style={[s.durationChip, clipDuration === d && s.durationChipActive]}
                            onPress={async () => {
                              setClipDuration(d);
                              // Seek to current start time when duration changes
                              if (youtubeRef.current && youtubeReady) {
                                try {
                                  await youtubeRef.current.seekTo(startTime, true);
                                  setYoutubeCurrentTime(startTime);
                                } catch {}
                              }
                            }}
                          >
                            <Text style={[s.durationChipText, clipDuration === d && { color: 'white' }]}>
                              {d}s
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={s.cropLabel}>
                        {t('youtubeSearch.startingPointFull').replace('{time}', startTime.toString())}
                        {'  '}<Text style={s.cropLabelMuted}>(end: {formatTime(startTime + clipDuration)})</Text>
                      </Text>

                      {/* ── Timeline ── */}
                      <View style={s.timelineWrapper}>
                        {/* Tap-to-seek background (full width, underneath everything) */}
                        <TouchableOpacity
                          activeOpacity={1}
                          style={[StyleSheet.absoluteFillObject, { zIndex: 0 }]}
                          onPress={e => {
                            if (isDragging) return;
                            const x = e.nativeEvent.locationX;
                            const sec = (x / TIMELINE_W) * timelineMaxSeconds;
                            seekYouTube(Math.round(sec));
                          }}
                        />

                        {/* Draggable crop window */}
                        <View
                          style={[
                            s.cropWindow,
                            { width: cropWindowPx, left: cropLeftPx },
                          ]}
                          onTouchStart={handleCropTouchStart}
                          onTouchMove={handleCropTouchMove}
                          onTouchEnd={handleCropTouchEnd}
                          onTouchCancel={handleCropTouchEnd}
                        >
                          <View style={s.cropHandle} />
                          <View style={[s.cropHandle, { marginLeft: 'auto' as any }]} />
                        </View>

                        {/* Playback needle — clamped inside crop window */}
                        {youtubeReady && (
                          <View
                            style={[s.playbackNeedle, { left: needleLeft - 1 }]}
                            pointerEvents="none"
                          />
                        )}

                        {/* Tick labels */}
                        <View style={s.tickRow}>
                          {Array.from({ length: 7 }, (_, i) =>
                            Math.round((i / 6) * timelineMaxSeconds),
                          ).map(sec => (
                            <Text key={sec} style={s.tick}>{formatTime(sec)}</Text>
                          ))}
                        </View>
                      </View>

                      <Text style={s.cropHint}>
                        Drag the yellow window to pick your {clipDuration}s clip. Tap anywhere to seek.
                      </Text>

                      {/* Quick-seek row */}
                      <View style={s.quickSeekRow}>
                        <Text style={s.quickSeekLabel}>{t('youtubeSearch.quickSeekLabel')}</Text>
                        {Array.from({ length: 5 }, (_, i) =>
                          Math.round((i / 4) * timelineMaxSeconds),
                        ).map(sec => (
                          <TouchableOpacity
                            key={sec}
                            style={s.quickSeekBtn}
                            onPress={() => seekYouTube(sec)}
                          >
                            <Text style={s.quickSeekBtnText}>
                              {sec >= 60
                                ? `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
                                : `${sec}s`}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                    </View>
                  ) : (
                    <View style={s.upsellBox}>
                      <Lock size={18} color={C.lock} />
                      <Text style={s.upsellText}>
                        <Text style={{ fontWeight: '700', color: C.lock }}>{t('youtubeSearch.logIn')}</Text>
                        {' '}{t('youtubeSearch.loginToCustomize')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Action buttons */}
              <View style={{ marginTop: 8, paddingBottom: 8 }}>
                <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
                  <Check size={17} color="white" />
                  <Text style={s.confirmBtnText}>{t('youtubeSearch.addToBouquet')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.backBtn} onPress={resetSelection}>
                  <Text style={s.backBtnText}>← Back to results</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

          ) : (
            <FlatList
              data={results.length > 0 ? results : POPULAR_SONGS}
              keyExtractor={i => i.id}
              getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: keyboardHeight > 0 ? 12 : 4,
                paddingBottom: Math.max(insets.bottom + 20, 40),
              }}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 8 }}>
                  {results.length > 0 ? 'Search Results' : '🎵 Popular Songs'}
                </Text>
              }
              renderItem={({ item }) => (
                <View style={s.songCard}>
                  <CachedImage source={{ uri: item.albumArt }} style={s.songThumb} />
                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={s.songName} numberOfLines={2}>{item.name}</Text>
                    <Text style={s.songArtist} numberOfLines={1}>
                      {item.artist}{item.duration ? ` · ${item.duration}` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity style={s.selectBtn} onPress={() => handleSelectVideo(item)}>
                    <Text style={s.selectBtnText}>{t('youtubeSearch.selectButton')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default React.memo(YouTubeSearchModal);

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: C.cream,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    height: H * 0.92,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: C.cream,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  closeBtnText: { fontSize: 15, fontWeight: '600', color: C.muted },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBarInner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#eee',
    borderRadius: 22, height: 44, paddingRight: 4,
  },
  searchInput: {
    flex: 1, paddingHorizontal: 10, fontSize: 14, color: C.text, height: '100%',
  },
  searchBtnInside: {
    backgroundColor: C.rose, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  searchBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },
  btnDisabled: { opacity: 0.4 },
  center: {
    alignItems: 'center', paddingVertical: 40, gap: 8,
    paddingHorizontal: 24, backgroundColor: C.cream, flex: 1,
  },
  mutedText: { color: C.muted, fontSize: 13, textAlign: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'center' },

  // Results
  songCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 14, padding: 10, marginBottom: 8,
  },
  songThumb: { width: 52, height: 52, borderRadius: 8 },
  songName:  { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 2 },
  songArtist:{ fontSize: 11, color: C.muted },
  selectBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: C.rose },
  selectBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Selection
  selBox: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: C.cream, flex: 1 },
  videoWrapper: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, backgroundColor: '#000' },
  youtubeProgress: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  youtubeProgressTrack: {
    height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden', marginBottom: 2,
  },
  youtubeProgressFill: { height: 2, backgroundColor: C.rose, borderRadius: 1 },
  youtubeProgressText: { fontSize: 9, color: 'white', textAlign: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16, gap: 12 },
  selTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  selArtist:{ fontSize: 13, color: C.muted, marginTop: 2 },
  durationBadge: { backgroundColor: C.border, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  durationText: { fontSize: 11, color: C.text, fontWeight: '600' },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 20, backgroundColor: C.card,
    borderWidth: 1.5, borderColor: C.border,
  },
  modeTabActive: { backgroundColor: C.rose, borderColor: C.rose },
  modeTabText: { fontSize: 13, fontWeight: '700', color: C.muted },
  modeTabTextActive: { color: 'white' },

  // Best part
  bestPartSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 16 },
  playerBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 14, padding: 12, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.rose, alignItems: 'center', justifyContent: 'center',
  },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: C.border, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: C.rose, borderRadius: 2 },
  progressLabel: { fontSize: 10, color: C.muted, marginTop: 5 },

  // Custom
  customSection: { marginBottom: 16 },
  cropSection: { marginBottom: 14 },
  cropLabel: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 8 },
  cropLabelMuted: { fontSize: 11, fontWeight: '400', color: C.muted },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  durationChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.card,
  },
  durationChipActive: { backgroundColor: C.rose, borderColor: C.rose },
  durationChipText: { fontSize: 13, fontWeight: '700', color: C.text },

  // Timeline
  timelineWrapper: {
    height: 60, width: TIMELINE_W,
    backgroundColor: '#e8dfd6', borderRadius: 12,
    overflow: 'hidden', marginBottom: 8,
    position: 'relative',
  },
  cropWindow: {
    position: 'absolute', top: 4, bottom: 16,   // leave room for ticks
    backgroundColor: 'rgba(245,166,35,0.5)',
    borderRadius: 8, borderWidth: 2.5, borderColor: C.gold,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, zIndex: 2,
  },
  cropHandle: { 
    width: 6, 
    height: 32, 
    backgroundColor: 'white',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  playbackNeedle: {
    position: 'absolute', top: 4, bottom: 16,
    width: 2, backgroundColor: C.rose, borderRadius: 1, zIndex: 3,
  },
  tickRow: {
    position: 'absolute', bottom: 2, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4,
    zIndex: 1,
  },
  tick: { fontSize: 9, color: C.muted },
  cropHint: { fontSize: 11, color: C.muted, lineHeight: 16, marginBottom: 12, textAlign: 'center' },

  quickSeekRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, flexWrap: 'wrap',
  },
  quickSeekLabel: { fontSize: 11, fontWeight: '600', color: C.text },
  quickSeekBtn: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: C.border, borderWidth: 1, borderColor: '#ddd',
  },
  quickSeekBtnText: { fontSize: 10, fontWeight: '600', color: C.text },
  customPlayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: C.rose,
  },
  customPlayBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

  // Upsell
  upsellBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fdf0f7', borderRadius: 12,
    padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#f3d9e4',
  },
  upsellText: { flex: 1, fontSize: 12, color: C.text, lineHeight: 18 },

  // Confirm
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, height: 50, backgroundColor: C.rose, borderRadius: 25, marginBottom: 10,
  },
  confirmBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  backBtn: { height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: C.muted, fontWeight: '600', fontSize: 13 },
});