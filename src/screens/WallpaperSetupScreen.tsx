/**
 * WallpaperSetupScreen
 *
 * Fixes in this version:
 *  - Solid flat bg colour per theme — no gradients at all on the base fill
 *  - Background has only soft bokeh texture circles (very subtle, same hue family)
 *  - Layout is split into strict thirds:
 *      Top layout    → text BOTTOM, flowers TOP-CENTRE
 *      Centre layout → text TOP, flowers CENTRE  (text never behind flowers)
 *      Bottom layout → text TOP, flowers BOTTOM
 *  - Bouquet size dialled back — default canvas = W * 0.82 (was 1.05)
 *  - No empty strip at bottom — ScrollView padds for sticky bar height exactly
 *  - captureRef captures the ref view which is sized at full W×H, so it matches preview 1-to-1
 *  - 7 curated font pairs with nice names
 *  - Header always visible (not behind status bar)
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, TouchableOpacity,
  Image, ActivityIndicator, Dimensions, ScrollView, Modal,
  Platform, Switch, Animated, PanResponder, PixelRatio,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { getFlowerImage } from '../utils/bouquetData';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import Toast from 'react-native-toast-message';
import ManageWallpaper, { TYPE } from 'react-native-manage-wallpaper';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, {
  Defs, RadialGradient,
  Stop, Rect, Circle, Ellipse, Path, G,
} from 'react-native-svg';

import {
  SharedWallpaperCanvas,
  THEMES,
  FONTS,
  LAYOUTS,
  SIZES,
  FlowerV2,
  BouquetData,
} from '../components/SharedWallpaperCanvas';

const { width: W, height: H } = Dimensions.get('window');

// ─── Preview frame ────────────────────────────────────────────────────────────
const PREV_W  = W * 0.54;
const PREV_H  = PREV_W * 2.08;
const SCALE   = PREV_W / W;

// Sticky bar height so ScrollView can pad correctly
const STICKY_H = 80;

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function WallpaperSetupScreen() {
  const navigation = useNavigation<any>();
  const route      = useRoute<any>();
  const insets     = useSafeAreaInsets();
  const { theme: t, isDark } = useTheme();
  const { t: tr }  = useLanguage();
  const { getTextSize } = useAccessibility();

  // ── Swipe left to go back ────────────────────────────────────────────────
  const swipeHandlers = useSwipeNavigation({
    onSwipeRight: () => navigation.goBack(),
  });

  const { id } = (route.params || {}) as { id?: string };

  const [bouquetData, setBouquetData] = useState<BouquetData | null>(null);
  // Start with loading=false if we have no id — avoids any flash.
  // For id-based loads, we start loading only if no cache is immediately available.
  const [loading,     setLoading]     = useState(!!id);
  // ── Custom wallpaper placement modal ─────────────────────────────────────
  const [wallpaperUri,    setWallpaperUri]    = useState<string | null>(null);
  const [showPlaceModal,  setShowPlaceModal]  = useState(false);

  const placeSlideAnim = useRef(new Animated.Value(H)).current;
  const placeOverlayAnim = useRef(new Animated.Value(0)).current;

  const openPlaceModal = useCallback(() => {
    placeSlideAnim.stopAnimation();
    placeOverlayAnim.stopAnimation();
    placeSlideAnim.setValue(H);
    setShowPlaceModal(true);
    Animated.parallel([
      Animated.spring(placeSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(placeOverlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [placeSlideAnim, placeOverlayAnim]);

  const closePlaceModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(placeSlideAnim, { toValue: H, duration: 180, useNativeDriver: true }),
      Animated.timing(placeOverlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowPlaceModal(false));
  }, [placeSlideAnim, placeOverlayAnim]);

  const placePanResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
    onPanResponderMove: (_, gs) => { if (gs.dy > 0) placeSlideAnim.setValue(gs.dy); },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 80 || gs.vy > 0.5) {
        closePlaceModal();
      } else if (Math.abs(gs.dy) < 10 && Math.abs(gs.dx) < 10) {
        closePlaceModal();
      } else {
        Animated.spring(placeSlideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    },
    onPanResponderTerminate: () => { Animated.spring(placeSlideAnim, { toValue: 0, useNativeDriver: true }).start(); },
  })).current;

  // Customisation
  const [themeKey,  setThemeKey]  = useState('linen');
  const [fontKey,   setFontKey]   = useState('handwritten');
  const [layoutKey, setLayoutKey] = useState('center');
  const [sizeVal,   setSizeVal]   = useState(0.78);
  const [showPetals,  setShowPetals]  = useState(true);
  const [showMessage, setShowMessage] = useState(false);
  const [showBrand,   setShowBrand]   = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const wallpaperRef = useRef<View>(null);
  // Defer the heavy SVG PaintedBg until after the screen slide-in animation (80ms)
  const [canvasReady, setCanvasReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setCanvasReady(true), 80);
    return () => clearTimeout(timer);
  }, []);

  // ── Fetch — show cached data instantly, fetch fresh in background ────────
  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const go = async () => {
      // 1) Try UUID cache first — instant display
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (isUuid) {
        const raw = await AsyncStorage.getItem(`bouquet_${id}`);
        if (raw) {
          try {
            setBouquetData(JSON.parse(raw));
            setLoading(false);  // show cached immediately
          } catch {}
          // Still refresh in background
          try {
            const snap = await getDoc(doc(db, 'bouquet-cards', id));
            if (snap.exists()) {
              const data = snap.data() as BouquetData;
              setBouquetData(data);
              await AsyncStorage.setItem(`bouquet_${id}`, JSON.stringify(data));
            }
          } catch {}
          return;
        }
      }
      try {
        let bouquetId = id;
        // Check slug caches first (both formats)
        const cachedSlugTarget = await AsyncStorage.getItem(`slug_target_${id}`);
        if (cachedSlugTarget) {
          bouquetId = cachedSlugTarget;
        } else {
          const s1 = await getDoc(doc(db, 'slugs', `bouquet__${id}`));
          if (s1.exists()) {
            bouquetId = s1.data().cardId;
            await AsyncStorage.setItem(`slug_target_${id}`, bouquetId);
          } else {
            const s2 = await getDoc(doc(db, 'slugs', id));
            if (s2.exists()) {
              const d = s2.data();
              if (d.cardType === 'bouquet' || d.type === 'bouquet') {
                bouquetId = d.cardId;
                await AsyncStorage.setItem(`slug_target_${id}`, bouquetId);
              }
            }
          }
        }
        // Show cached immediately
        const cached = await AsyncStorage.getItem(`bouquet_${bouquetId}`) ||
                       await AsyncStorage.getItem(`bouquet_${id}`);
        if (cached) {
          try {
            setBouquetData(JSON.parse(cached));
            setLoading(false);  // show instantly
          } catch {}
        }
        // Refresh in background
        const snap = await getDoc(doc(db, 'bouquet-cards', bouquetId));
        if (snap.exists()) {
          const data = snap.data() as BouquetData;
          setBouquetData(data);
          await AsyncStorage.setItem(`bouquet_${bouquetId}`, JSON.stringify(data));
          await AsyncStorage.setItem(`bouquet_${id}`,        JSON.stringify(data));
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    go();
  }, [id]);

  const doSetWallpaper = useCallback((type: string) => {
    if (!wallpaperUri) return;
    closePlaceModal();
    Toast.show({ type: 'info', text1: 'Setting wallpaper…' });
    ManageWallpaper.setWallpaper({ uri: wallpaperUri }, (res: any) => {
      Toast.show(res.status === 'success'
        ? { type: 'success', text1: 'Done!', text2: 'Wallpaper applied.' }
        : { type: 'error',   text1: 'Could not set wallpaper.' });
      navigation.goBack();
    }, type);
  }, [wallpaperUri, navigation]);

  const handleApply = useCallback(async () => {
    try {
      setIsCapturing(true);
      await new Promise(r => setTimeout(r, 300));
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission denied' });
        return;
      }
      if (!wallpaperRef.current) return;
      const pixelRatio = PixelRatio.get();
      const uri = await captureRef(wallpaperRef.current, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: Math.round(W * pixelRatio),
        height: Math.round(H * pixelRatio),
      });
      setWallpaperUri(uri);
      openPlaceModal();
    } catch (e) {
      console.error(e);
      Toast.show({ type: 'error', text1: 'Could not capture wallpaper.' });
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const th          = THEMES[themeKey] ?? THEMES['linen'];

  // Outer View holds the ref
  const WallpaperCanvas = (
    <SharedWallpaperCanvas
      ref={wallpaperRef}
      themeKey={themeKey}
      fontKey={fontKey}
      layoutKey={layoutKey}
      sizeVal={sizeVal}
      showPetals={showPetals}
      showMessage={showMessage}
      showBrand={showBrand}
      bouquetData={bouquetData}
    />
  );

  // ── Render — no early returns past this point ─────────────────────────────
  // Loading spinner shown inline so we never break hook call order.
  if (!canvasReady && loading && !bouquetData) {
    return (
      <View style={[styles.center, { backgroundColor: t.bg }]}>
        <ActivityIndicator color={t.brand} size="large" />
        <Text style={{ marginTop: 12, color: t.textMuted, fontFamily: 'Manrope-Regular' }}>Preparing…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]} {...swipeHandlers}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={t.bg} />

      {/* Header — sits above everything, always visible */}
      <View style={[styles.header, {
        paddingTop: insets.top + 4,
        backgroundColor: t.bg,
        borderBottomColor: t.border,
      }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={t.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.text, fontSize: getTextSize(17) }]}>
          Wallpaper Setup
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Scrollable body — pad bottom for sticky bar */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: STICKY_H + insets.bottom + 24 }}
      >
        {/* ── Phone preview ─────────────────────────────────────────────── */}
        <View style={styles.previewOuter}>
          <View style={[styles.phoneShadow, { width: PREV_W + 4, height: PREV_H + 4 }]} />
          <View style={[styles.phoneFrame, { width: PREV_W, height: PREV_H }]}>
            <View style={styles.notch} />
            {/* Clipping container at preview size */}
            <View style={{ width: PREV_W, height: PREV_H, overflow: 'hidden' }}>
              {/* Scale W×H down to PREV_W×PREV_H */}
              <View style={{
                width: W,
                height: H,
                transform: [{ scale: SCALE }],
                transformOrigin: 'top left',
              }}>
                {WallpaperCanvas}
              </View>
            </View>
          </View>
        </View>

        {/* ── Options panel ─────────────────────────────────────────────── */}
        <View style={[styles.panel, { backgroundColor: t.cardBg, borderColor: t.border }]}>

          {/* Theme */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>BACKGROUND</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {Object.entries(THEMES).map(([key, th2]) => {
              const active = themeKey === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setThemeKey(key)}
                  activeOpacity={0.8}
                  style={[styles.themeChip, {
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  {/* Colour swatch circle */}
                  <View style={[styles.swatch, { backgroundColor: th2.bg, borderColor: active ? t.brand : 'rgba(0,0,0,0.1)' }]} />
                  <Text style={[styles.chipLabel, { color: active ? t.brand : t.text }]}>{th2.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Font */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>FONT</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {FONTS.map(f => {
              const active = fontKey === f.key;
              return (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setFontKey(f.key)}
                  activeOpacity={0.8}
                  style={[styles.fontChip, {
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  <Text style={{
                    fontFamily: f.font,
                    fontSize:   16,
                    color:      active ? t.brand : t.text,
                    lineHeight: 20,
                  }}>
                    {f.preview}
                  </Text>
                  <Text style={[styles.fontChipLabel, { color: active ? t.brand : t.textMuted }]}>{f.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Layout */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>LAYOUT</Text>
          <View style={styles.gridRow}>
            {LAYOUTS.map(l => {
              const active = layoutKey === l.key;
              return (
                <TouchableOpacity
                  key={l.key}
                  onPress={() => setLayoutKey(l.key)}
                  activeOpacity={0.8}
                  style={[styles.gridChip, {
                    flex: 1,
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  <Text style={{ fontSize: 16, color: active ? t.brand : t.text }}>{l.icon}</Text>
                  <Text style={[styles.gridChipLabel, { color: active ? t.brand : t.textMuted }]}>{l.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Bouquet size */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>BOUQUET SIZE</Text>
          <View style={styles.gridRow}>
            {SIZES.map(s => {
              const active = sizeVal === s.val;
              return (
                <TouchableOpacity
                  key={s.val}
                  onPress={() => setSizeVal(s.val)}
                  activeOpacity={0.8}
                  style={[styles.gridChip, {
                    flex: 1,
                    borderColor: active ? t.brand : t.border,
                    backgroundColor: active ? (isDark ? t.surface : '#FAF5F0') : 'transparent',
                  }]}
                >
                  <Text style={{ fontSize: 15 }}>{s.emoji}</Text>
                  <Text style={[styles.gridChipLabel, { color: active ? t.brand : t.textMuted }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.sep, { backgroundColor: t.border }]} />

          {/* Toggles */}
          <Text style={[styles.sectionLabel, { color: t.textMuted }]}>EXTRAS</Text>
          {([
            { label: 'Falling Petals',   val: showPetals,  set: setShowPetals  },
            { label: 'Show Message',     val: showMessage, set: setShowMessage },
            { label: 'Show DigiBouquet', val: showBrand,   set: setShowBrand   },
          ] as const).map(item => (
            <View key={item.label} style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: t.text }]}>{item.label}</Text>
              <Switch
                value={item.val}
                onValueChange={item.set}
                trackColor={{ false: t.border, true: t.brand }}
                thumbColor="#fff"
              />
            </View>
          ))}

        </View>
      </ScrollView>

      {/* ── Sticky apply bar ──────────────────────────────────────────────── */}
      <View style={[styles.stickyBar, {
        backgroundColor: t.cardBg,
        borderTopColor:  t.border,
        paddingBottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 16),
      }]}>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: t.brand }]}
          onPress={handleApply}
          activeOpacity={0.86}
        >
          {isCapturing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.applyBtnText}>Apply as Wallpaper</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Custom wallpaper placement modal ─────────────────────────────── */}
      <Modal hardwareAccelerated={true} visible={showPlaceModal} transparent animationType="none" onRequestClose={closePlaceModal}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="auto"
            style={[styles.modalBackdrop, { opacity: placeOverlayAnim }]}
            {...placePanResponder.panHandlers}
          />
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Animated.View style={{ flex: 1 }} {...placePanResponder.panHandlers} />
            <Animated.View
              style={[styles.modalCard, { backgroundColor: t.cardBg, transform: [{ translateY: placeSlideAnim }] }]}
              {...placePanResponder.panHandlers}
            >
              <View style={[styles.modalHandle, { backgroundColor: t.border }]} />

              <Text style={[styles.modalTitle, { color: t.text }]}>Set Wallpaper</Text>
              <Text style={[styles.modalSubtitle, { color: t.textMuted }]}>Choose where to apply your bouquet</Text>

              <View style={styles.modalOptions}>
                {[
                  { label: 'Home Screen', icon: 'home', type: TYPE.HOME },
                  { label: 'Lock Screen', icon: 'lock', type: TYPE.LOCK },
                  { label: 'Both',        icon: 'layers', type: TYPE.BOTH },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.modalOptionBtn, { borderColor: t.border, backgroundColor: t.bg }]}
                    onPress={() => doSetWallpaper(opt.type)}
                    activeOpacity={0.8}
                  >
                    <Feather name={opt.icon as any} size={22} color={t.brand} />
                    <Text style={[styles.modalOptionText, { color: t.text }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: isDark ? t.surface2 : '#f0f0f0', marginBottom: insets.bottom > 0 ? insets.bottom : 8 }]}
                onPress={closePlaceModal}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalCancelText, { color: t.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingBottom:    12,
    borderBottomWidth: 1,
  },
  backBtn:     { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontFamily: 'Manrope-Bold' },

  previewOuter: { alignItems: 'center', paddingVertical: 24 },
  phoneShadow: {
    position: 'absolute',
    borderRadius: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 28,
    elevation: 20,
  },
  phoneFrame: {
    borderRadius: 40,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  notch: {
    position: 'absolute', top: 10, alignSelf: 'center',
    width: 60, height: 12, borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.40)',
    zIndex: 999,
  },

  // Wallpaper internals
  attrWrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  flowerArea:  { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  legacyRow:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', padding: 16 },

  // Panel
  panel: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, borderWidth: 1,
    padding: 20,
  },
  sectionLabel: { fontFamily: 'Manrope-SemiBold', fontSize: 9, letterSpacing: 2, marginBottom: 10 },
  sep:          { height: 1, marginVertical: 14 },

  chipRow: { gap: 6, paddingBottom: 4 },
  themeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 7,
  },
  swatch: { width: 13, height: 13, borderRadius: 7, borderWidth: 1 },
  chipLabel: { fontFamily: 'Manrope-Medium', fontSize: 12 },

  fontChip: {
    alignItems: 'center', gap: 2,
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 7,
    minWidth: 60,
  },
  fontChipLabel: { fontFamily: 'Manrope-Medium', fontSize: 9 },

  gridRow:  { flexDirection: 'row', gap: 6 },
  gridChip: {
    borderWidth: 1.5, borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center', gap: 4,
  },
  gridChipLabel: { fontFamily: 'Manrope-Medium', fontSize: 10, textAlign: 'center' },

  toggleRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  toggleLabel:{ fontFamily: 'Manrope-Regular', fontSize: 15 },

  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 14, paddingHorizontal: 20,
    borderTopWidth: 1,
    elevation: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07, shadowRadius: 10,
  },
  applyBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope-Bold', letterSpacing: 0.3 },

  // ── Custom modal ───────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 16,
    elevation: 24,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'Manrope-Bold', fontSize: 20, textAlign: 'center', marginBottom: 6,
  },
  modalSubtitle: {
    fontFamily: 'Manrope-Regular', fontSize: 13, textAlign: 'center', marginBottom: 24,
  },
  modalOptions: { gap: 10, marginBottom: 16 },
  modalOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  modalOptionText: {
    fontFamily: 'Manrope-SemiBold', fontSize: 16,
  },
  modalCancelBtn: {
    marginTop: 4, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'Manrope-SemiBold', fontSize: 15 },
});